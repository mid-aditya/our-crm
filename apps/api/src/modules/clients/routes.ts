import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, isNull, desc } from "drizzle-orm";
import { organizations, departments } from "../../db/tenant/schema-erp.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

// Clients management (B2B orgs) + organization management (departments).
export async function clientsOrgRoutes(app: FastifyInstance) {
  app.get("/organizations", { preHandler: [app.authenticate, tenantResolver, rbacGuard("clients.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(organizations).where(isNull(organizations.deletedAt)).orderBy(desc(organizations.createdAt)).limit(100) };
  });

  app.post("/organizations", { preHandler: [app.authenticate, tenantResolver, rbacGuard("clients.create")] }, async (req, reply) => {
    const parsed = z.object({ name: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional(), address: z.string().optional(), tax_id: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const [row] = await db.insert(organizations).values({ name: v.name, email: v.email, phone: v.phone, address: v.address, taxId: v.tax_id }).returning();
    return reply.status(201).send({ data: row });
  });

  app.delete("/organizations/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("clients.delete")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    await db.update(organizations).set({ deletedAt: new Date() }).where(eq(organizations.id, id));
    return reply.send({ data: { ok: true } });
  });

  app.get("/departments", { preHandler: [app.authenticate, tenantResolver, rbacGuard("organization.manage")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(departments).limit(100) };
  });

  app.post("/departments", { preHandler: [app.authenticate, tenantResolver, rbacGuard("organization.manage")] }, async (req, reply) => {
    const parsed = z.object({ name: z.string().min(1), parent_id: z.string().uuid().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "name wajib" } });
    const db = req.tenantDb!;
    const [row] = await db.insert(departments).values({ name: parsed.data.name, parentId: parsed.data.parent_id }).returning();
    return reply.status(201).send({ data: row });
  });
}
