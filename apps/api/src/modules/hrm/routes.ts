import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import {
  employees, timeEntries, employeeActivities,
  ledgerAccounts, journalEntries,
} from "../../db/tenant/schema-erp.js";
import { projectTasks } from "../../db/tenant/schema-erp.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

// Employee management + time tracking + accounting + productivity report.
export async function hrmRoutes(app: FastifyInstance) {
  app.get("/employees", { preHandler: [app.authenticate, tenantResolver, rbacGuard("employees.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(employees).where(isNull(employees.deletedAt)).limit(100) };
  });

  app.post("/employees", { preHandler: [app.authenticate, tenantResolver, rbacGuard("employees.create")] }, async (req, reply) => {
    const parsed = z.object({ full_name: z.string().min(1), email: z.string().email().optional(), position: z.string().optional(), department_id: z.string().uuid().optional(), hire_date: z.string().datetime().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const [row] = await db.insert(employees).values({
      fullName: v.full_name, email: v.email, position: v.position,
      departmentId: v.department_id, hireDate: v.hire_date ? new Date(v.hire_date) : undefined,
    }).returning();
    return reply.status(201).send({ data: row });
  });

  // Clock in/out — employee time tracking.
  app.post("/time-entries/clock-in", { preHandler: [app.authenticate, tenantResolver, rbacGuard("timetracking.create")] }, async (req, reply) => {
    const parsed = z.object({ employee_id: z.string().uuid(), project_id: z.string().uuid().optional(), note: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "employee_id wajib" } });
    const db = req.tenantDb!;
    const [row] = await db.insert(timeEntries).values({
      employeeId: parsed.data.employee_id, projectId: parsed.data.project_id,
      clockIn: new Date(), note: parsed.data.note, source: "clock",
    }).returning();
    await db.insert(employeeActivities).values({ employeeId: parsed.data.employee_id, activityType: "clock_in", description: "Mulai kerja" });
    return reply.status(201).send({ data: row });
  });

  app.post("/time-entries/:id/clock-out", { preHandler: [app.authenticate, tenantResolver, rbacGuard("timetracking.create")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [cur] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
    if (!cur) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time entry tidak ada" } });
    const out = new Date();
    const minutes = Math.round((out.getTime() - new Date(cur.clockIn).getTime()) / 60000);
    const [row] = await db.update(timeEntries).set({ clockOut: out, durationMinutes: minutes }).where(eq(timeEntries.id, id)).returning();
    await db.insert(employeeActivities).values({ employeeId: cur.employeeId, activityType: "clock_out", description: `Selesai (${minutes} mnt)` });
    return reply.send({ data: row });
  });

  app.get("/employees/:id/activities", { preHandler: [app.authenticate, tenantResolver, rbacGuard("timetracking.read")] }, async (req) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    return { data: await db.select().from(employeeActivities).where(eq(employeeActivities.employeeId, id)).orderBy(desc(employeeActivities.occurredAt)).limit(100) };
  });

  // Productivity management: agregat per employee (task selesai, menit kerja).
  app.get("/reports/productivity", { preHandler: [app.authenticate, tenantResolver, rbacGuard("reports.export")] }, async (req) => {
    const db = req.tenantDb!;
    const timeAgg = await db.select({
      employeeId: timeEntries.employeeId,
      totalMinutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}),0)`,
      entries: sql<number>`count(*)`,
    }).from(timeEntries).groupBy(timeEntries.employeeId);
    const taskAgg = await db.select({
      assignee: projectTasks.assigneeUserId,
      done: sql<number>`count(*) filter (where ${projectTasks.status} = 'done')`,
      total: sql<number>`count(*)`,
    }).from(projectTasks).groupBy(projectTasks.assigneeUserId);
    return { data: { time: timeAgg, tasks: taskAgg } };
  });
}

export async function accountingRoutes(app: FastifyInstance) {
  app.get("/ledger-accounts", { preHandler: [app.authenticate, tenantResolver, rbacGuard("accounting.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(ledgerAccounts).limit(200) };
  });

  app.post("/ledger-accounts", { preHandler: [app.authenticate, tenantResolver, rbacGuard("accounting.post")] }, async (req, reply) => {
    const parsed = z.object({ code: z.string().min(1), name: z.string().min(1), type: z.enum(["asset", "liability", "equity", "revenue", "expense"]) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "code, name, type wajib" } });
    const db = req.tenantDb!;
    const [row] = await db.insert(ledgerAccounts).values(parsed.data).returning();
    return reply.status(201).send({ data: row });
  });

  // Double-entry: debit & credit harus seimbang per posting.
  app.post("/journal", { preHandler: [app.authenticate, tenantResolver, rbacGuard("accounting.post")] }, async (req, reply) => {
    const parsed = z.object({
      description: z.string().optional(),
      reference_type: z.string().optional(),
      reference_id: z.string().optional(),
      lines: z.array(z.object({ account_id: z.string().uuid(), debit: z.string().default("0"), credit: z.string().default("0") })).min(2),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Minimal 2 baris jurnal" } });
    const v = parsed.data;
    const d = v.lines.reduce((s, l) => s + Number(l.debit), 0);
    const c = v.lines.reduce((s, l) => s + Number(l.credit), 0);
    if (Math.abs(d - c) > 0.005) {
      return reply.status(400).send({ error: { code: "UNBALANCED_JOURNAL", message: `Debit (${d}) harus sama dengan kredit (${c})` } });
    }
    const db = req.tenantDb!;
    const postedAt = new Date();
    for (const l of v.lines) {
      await db.insert(journalEntries).values({
        accountId: l.account_id, debit: l.debit, credit: l.credit,
        referenceType: v.reference_type, referenceId: v.reference_id,
        description: v.description, postedAt,
      });
    }
    return reply.status(201).send({ data: { ok: true, posted_at: postedAt } });
  });

  app.get("/trial-balance", { preHandler: [app.authenticate, tenantResolver, rbacGuard("accounting.read")] }, async (req) => {
    const db = req.tenantDb!;
    const rows = await db.select({
      accountId: journalEntries.accountId,
      debit: sql<number>`coalesce(sum(${journalEntries.debit}),0)`,
      credit: sql<number>`coalesce(sum(${journalEntries.credit}),0)`,
    }).from(journalEntries).groupBy(journalEntries.accountId);
    const accounts = await db.select().from(ledgerAccounts);
    const byId = new Map(accounts.map((a) => [a.id, a]));
    void and;
    return { data: rows.map((r) => ({ ...r, account: byId.get(r.accountId) })) };
  });
}
