import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, isNull, desc } from "drizzle-orm";
import { projects, projectMembers, projectBudgets, projectTasks } from "../../db/tenant/schema-erp.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

// Project management + task management + project budgeting.
export async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", { preHandler: [app.authenticate, tenantResolver, rbacGuard("projects.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(projects).where(isNull(projects.deletedAt)).orderBy(desc(projects.createdAt)).limit(100) };
  });

  app.post("/projects", { preHandler: [app.authenticate, tenantResolver, rbacGuard("projects.create")] }, async (req, reply) => {
    const parsed = z.object({ name: z.string().min(1), description: z.string().optional(), organization_id: z.string().uuid().optional(), start_date: z.string().datetime().optional(), end_date: z.string().datetime().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const [row] = await db.insert(projects).values({
      name: v.name, description: v.description, organizationId: v.organization_id,
      startDate: v.start_date ? new Date(v.start_date) : undefined,
      endDate: v.end_date ? new Date(v.end_date) : undefined,
      ownerUserId: (req as { user?: { user_id: string } }).user!.user_id,
    }).returning();
    return reply.status(201).send({ data: row });
  });

  app.get("/projects/:id/tasks", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tasks.read")] }, async (req) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    return { data: await db.select().from(projectTasks).where(eq(projectTasks.projectId, id)).limit(200) };
  });

  app.post("/projects/:id/tasks", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tasks.create")] }, async (req, reply) => {
    const parsed = z.object({ title: z.string().min(1), description: z.string().optional(), priority: z.enum(["low", "medium", "urgent"]).default("medium"), assignee_user_id: z.string().uuid().optional(), due_date: z.string().datetime().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.insert(projectTasks).values({
      projectId: id, title: v.title, description: v.description, priority: v.priority,
      assigneeUserId: v.assignee_user_id, dueDate: v.due_date ? new Date(v.due_date) : undefined,
    }).returning();
    return reply.status(201).send({ data: row });
  });

  app.patch("/project-tasks/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tasks.update")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const body = req.body as { status?: string; title?: string };
    const [row] = await db.update(projectTasks).set({
      ...(body.title ? { title: body.title } : {}),
      ...(body.status ? { status: body.status, ...(body.status === "done" ? { completedAt: new Date() } : { completedAt: null }) } : {}),
      updatedAt: new Date(),
    }).where(eq(projectTasks.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Task tidak ada" } });
    return reply.send({ data: row });
  });

  app.get("/projects/:id/budgets", { preHandler: [app.authenticate, tenantResolver, rbacGuard("projects.read")] }, async (req) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const rows = await db.select().from(projectBudgets).where(eq(projectBudgets.projectId, id));
    const planned = rows.reduce((s, r) => s + Number(r.plannedAmount), 0);
    const actual = rows.reduce((s, r) => s + Number(r.actualAmount), 0);
    return { data: rows, meta: { planned, actual, remaining: planned - actual } };
  });

  app.post("/projects/:id/budgets", { preHandler: [app.authenticate, tenantResolver, rbacGuard("projects.update")] }, async (req, reply) => {
    const parsed = z.object({ category: z.string().min(1), planned_amount: z.string(), currency: z.string().default("IDR") }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "category & planned_amount wajib" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.insert(projectBudgets).values({ projectId: id, category: parsed.data.category, plannedAmount: parsed.data.planned_amount, currency: parsed.data.currency }).returning();
    return reply.status(201).send({ data: row });
  });

  app.post("/projects/:id/members", { preHandler: [app.authenticate, tenantResolver, rbacGuard("projects.update")] }, async (req, reply) => {
    const parsed = z.object({ user_id: z.string().uuid(), role: z.string().default("member") }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "user_id wajib" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.insert(projectMembers).values({ projectId: id, userId: parsed.data.user_id, role: parsed.data.role }).returning();
    return reply.status(201).send({ data: row });
  });
  void and;
}
