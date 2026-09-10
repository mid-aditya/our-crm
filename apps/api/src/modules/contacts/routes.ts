import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, isNull, desc, ilike, or, lt } from "drizzle-orm";
import { contacts, auditLogs } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

const createSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.unknown()).default({}),
});

function normalizePhone(v?: string): string | undefined {
  if (!v) return undefined;
  const d = v.replace(/\D/g, "");
  if (d.startsWith("62")) return `+${d}`;
  if (d.startsWith("0")) return `+62${d.slice(1)}`;
  return `+${d}`;
}

export async function contactRoutes(app: FastifyInstance) {
  // List cursor-based (bagian [10]): ?limit&cursor(id)
  app.get("/contacts", { preHandler: [app.authenticate, tenantResolver, rbacGuard("contacts.read")] }, async (req) => {
    const q = (req.query as { limit?: string; cursor?: string; search?: string }) ?? {};
    const limit = Math.min(Number(q.limit ?? 20), 100);
    const db = req.tenantDb!;
    let rows;
    if (q.search) {
      const term = `%${q.search}%`;
      rows = await db.select().from(contacts)
        .where(and(isNull(contacts.deletedAt), or(ilike(contacts.fullName, term), ilike(contacts.email, term))))
        .orderBy(desc(contacts.createdAt)).limit(limit + 1);
    } else if (q.cursor) {
      const [cur] = await db.select().from(contacts).where(eq(contacts.id, q.cursor)).limit(1);
      rows = await db.select().from(contacts)
        .where(cur ? and(isNull(contacts.deletedAt), lt(contacts.createdAt, cur.createdAt)) : isNull(contacts.deletedAt))
        .orderBy(desc(contacts.createdAt)).limit(limit + 1);
    } else {
      rows = await db.select().from(contacts).where(isNull(contacts.deletedAt))
        .orderBy(desc(contacts.createdAt)).limit(limit + 1);
    }
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, meta: { next_cursor: hasMore ? data[data.length - 1].id : null } };
  });

  app.post("/contacts", { preHandler: [app.authenticate, tenantResolver, rbacGuard("contacts.create")] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const [row] = await db.insert(contacts).values({
      fullName: v.full_name, email: v.email, phone: normalizePhone(v.phone),
      companyName: v.company_name, source: v.source, tags: v.tags, customFields: v.custom_fields,
      ownerUserId: (req as { user?: { user_id: string } }).user!.user_id,
    }).returning();
    await db.insert(auditLogs).values({ action: "contacts.create", entity: "contacts", entityId: row.id });
    return reply.status(201).send({ data: row });
  });

  app.patch("/contacts/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("contacts.update")] }, async (req, reply) => {
    const parsed = createSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(contacts).set({
      ...(v.full_name ? { fullName: v.full_name } : {}),
      ...(v.email !== undefined ? { email: v.email } : {}),
      ...(v.phone !== undefined ? { phone: normalizePhone(v.phone) } : {}),
      ...(v.company_name !== undefined ? { companyName: v.company_name } : {}),
      ...(v.source !== undefined ? { source: v.source } : {}),
      ...(v.tags ? { tags: v.tags } : {}),
      ...(v.custom_fields ? { customFields: v.custom_fields } : {}),
      updatedAt: new Date(),
    }).where(eq(contacts.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Kontak tidak ada" } });
    await db.insert(auditLogs).values({ action: "contacts.update", entity: "contacts", entityId: id, changes: v });
    return reply.send({ data: row });
  });

  // Soft delete — jangan hard delete data pelanggan (bagian [4.2]).
  app.delete("/contacts/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("contacts.delete")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(contacts).set({ deletedAt: new Date() }).where(eq(contacts.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Kontak tidak ada" } });
    await db.insert(auditLogs).values({ action: "contacts.delete", entity: "contacts", entityId: id });
    return reply.send({ data: { ok: true } });
  });
}
