import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { activities, auditLogs } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

const createSchema = z.object({
  type: z.enum(["call", "meeting", "email", "note", "task"]),
  subject: z.string().min(1),
  notes: z.string().optional(),
  related_to_type: z.enum(["contact", "deal"]).optional(),
  related_to_id: z.string().uuid().optional(),
  due_at: z.string().datetime().optional(),
});

export async function activityRoutes(app: FastifyInstance) {
  app.get("/activities", { preHandler: [app.authenticate, tenantResolver, rbacGuard("activities.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(activities).orderBy(desc(activities.createdAt)).limit(50) };
  });

  app.post("/activities", { preHandler: [app.authenticate, tenantResolver, rbacGuard("activities.create")] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const [row] = await db.insert(activities).values({
      type: v.type, subject: v.subject, notes: v.notes,
      relatedToType: v.related_to_type, relatedToId: v.related_to_id,
      dueAt: v.due_at ? new Date(v.due_at) : undefined,
      ownerUserId: (req as { user?: { user_id: string } }).user!.user_id,
    }).returning();
    await db.insert(auditLogs).values({ action: "activities.create", entity: "activities", entityId: row.id });
    return reply.status(201).send({ data: row });
  });

  app.patch("/activities/:id/complete", { preHandler: [app.authenticate, tenantResolver, rbacGuard("activities.update")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(activities).set({ completedAt: new Date() }).where(eq(activities.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Aktivitas tidak ada" } });
    return reply.send({ data: row });
  });
}
