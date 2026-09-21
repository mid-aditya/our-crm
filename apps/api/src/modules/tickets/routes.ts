import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { tickets, ticketReplies } from "../../db/tenant/schema-crm.js";
import { contacts } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";
import { getConnection } from "../../core/tenant-connection-manager.js";

export async function ticketRoutes(app: FastifyInstance) {
  app.get("/tickets", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tickets.read")] }, async (req) => {
    const q = (req.query as { status?: string }) ?? {};
    const db = req.tenantDb!;
    const rows = await db.select().from(tickets)
      .where(q.status ? eq(tickets.status, q.status) : undefined)
      .orderBy(desc(tickets.createdAt)).limit(100);
    return { data: rows };
  });

  app.post("/tickets", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tickets.create")] }, async (req, reply) => {
    const parsed = z.object({
      subject: z.string().min(1),
      description: z.string().optional(),
      contact_id: z.string().uuid().optional(),
      priority: z.enum(["low", "medium", "urgent"]).default("medium"),
      assignee_id: z.string().uuid().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const db = req.tenantDb!;
    const number = `T-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [row] = await db.insert(tickets).values({
      number, subject: parsed.data.subject, description: parsed.data.description,
      contactId: parsed.data.contact_id, priority: parsed.data.priority, assigneeId: parsed.data.assignee_id,
      source: "agent",
    }).returning();
    return reply.status(201).send({ data: row });
  });

  // Form publik: pelanggan lapor tanpa login. Rate-limit global + validasi ketat.
  // Resolve tenant via X-Company-Id (didaftarkan di embed snippet form).
  app.post("/tickets/public", async (req, reply) => {
    const parsed = z.object({
      subject: z.string().min(3).max(200),
      description: z.string().min(5).max(5000),
      name: z.string().min(1).max(100),
      phone: z.string().min(7).max(20).optional(),
      email: z.string().email().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const companyId = (req.headers["x-company-id"] ?? "") as string;
    if (!companyId) return reply.status(400).send({ error: { code: "NO_COMPANY", message: "Form belum terhubung ke perusahaan (X-Company-Id)" } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await getConnection(companyId)) as any;
    let contactId: string | undefined;
    if (parsed.data.phone) {
      const found = await db.select().from(contacts).where(eq(contacts.phone, parsed.data.phone)).limit(1);
      if (found[0]) contactId = found[0].id;
      else {
        const [c] = await db.insert(contacts).values({
          fullName: parsed.data.name, phone: parsed.data.phone,
          email: parsed.data.email, source: "ticket-form",
        }).returning();
        contactId = c.id;
      }
    }
    const number = `T-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [row] = await db.insert(tickets).values({
      number, subject: parsed.data.subject, description: parsed.data.description,
      contactId, priority: "medium", source: "public_form",
    }).returning();
    return reply.status(201).send({ data: { number: row.number, message: "Laporan diterima, tim kami akan menghubungi" } });
  });

  app.get("/tickets/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tickets.read")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!t) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Tiket tidak ada" } });
    const replies = await db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, id)).orderBy(ticketReplies.createdAt);
    return { data: t, meta: { replies } };
  });

  app.post("/tickets/:id/replies", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tickets.update")] }, async (req, reply) => {
    const parsed = z.object({ body: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "body wajib" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.insert(ticketReplies).values({
      ticketId: id, authorId: (req as { user?: { user_id: string } }).user!.user_id,
      authorType: "agent", body: parsed.data.body,
    }).returning();
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, id));
    return reply.status(201).send({ data: row });
  });

  app.patch("/tickets/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("tickets.update")] }, async (req, reply) => {
    const parsed = z.object({
      status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "urgent"]).optional(),
      assignee_id: z.string().uuid().nullable().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Payload tidak valid" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(tickets).set({
      ...(parsed.data.status ? { status: parsed.data.status, ...(parsed.data.status === "resolved" ? { resolvedAt: new Date() } : {}) } : {}),
      ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.assignee_id !== undefined ? { assigneeId: parsed.data.assignee_id } : {}),
      updatedAt: new Date(),
    }).where(eq(tickets.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Tiket tidak ada" } });
    return reply.send({ data: row });
  });
}
