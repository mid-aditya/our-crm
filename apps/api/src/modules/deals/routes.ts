import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, isNull, desc } from "drizzle-orm";
import { deals, dealStages, auditLogs } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

const createSchema = z.object({
  title: z.string().min(1),
  contact_id: z.string().uuid().optional(),
  value: z.string().default("0"),
  currency: z.string().default("IDR"),
  stage_id: z.string().uuid().optional(),
  expected_close_date: z.string().datetime().optional(),
});

export async function dealRoutes(app: FastifyInstance) {
  app.get("/deals", { preHandler: [app.authenticate, tenantResolver, rbacGuard("deals.read")] }, async (req) => {
    const db = req.tenantDb!;
    const rows = await db.select().from(deals).where(isNull(deals.deletedAt)).orderBy(desc(deals.createdAt)).limit(50);
    return { data: rows };
  });

  app.get("/deal-stages", { preHandler: [app.authenticate, tenantResolver, rbacGuard("deals.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(dealStages) };
  });

  app.post("/deals", { preHandler: [app.authenticate, tenantResolver, rbacGuard("deals.create")] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const [row] = await db.insert(deals).values({
      title: v.title, contactId: v.contact_id, value: v.value, currency: v.currency,
      stageId: v.stage_id, expectedCloseDate: v.expected_close_date ? new Date(v.expected_close_date) : undefined,
      ownerUserId: (req as { user?: { user_id: string } }).user!.user_id,
    }).returning();
    await db.insert(auditLogs).values({ action: "deals.create", entity: "deals", entityId: row.id });
    return reply.status(201).send({ data: row });
  });

  app.patch("/deals/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("deals.update")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const body = req.body as { stage_id?: string; status?: string; title?: string; value?: string };
    // Tutup otomatis: kalau stage adalah won/lost, set status.
    let status = body.status;
    if (body.stage_id) {
      const [st] = await db.select().from(dealStages).where(eq(dealStages.id, body.stage_id)).limit(1);
      if (st?.isWonStage) status = "won";
      else if (st?.isLostStage) status = "lost";
    }
    const [row] = await db.update(deals).set({
      ...(body.title ? { title: body.title } : {}),
      ...(body.value ? { value: body.value } : {}),
      ...(body.stage_id ? { stageId: body.stage_id } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    }).where(eq(deals.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Deal tidak ada" } });
    await db.insert(auditLogs).values({ action: "deals.update", entity: "deals", entityId: id, changes: body });
    return reply.send({ data: row });
  });

  app.delete("/deals/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("deals.delete")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(deals).set({ deletedAt: new Date() }).where(and(eq(deals.id, id), isNull(deals.deletedAt))).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Deal tidak ada" } });
    await db.insert(auditLogs).values({ action: "deals.delete", entity: "deals", entityId: id });
    return reply.send({ data: { ok: true } });
  });
}
