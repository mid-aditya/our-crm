import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, roles, permissions, rolePermissions, auditLogs } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard, invalidateUserPermissions } from "../../middlewares/rbac.js";
import { hashPassword } from "../auth/service.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users", { preHandler: [app.authenticate, tenantResolver, rbacGuard("settings.manage_roles")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select({ id: users.id, email: users.email, fullName: users.fullName, roleId: users.roleId, status: users.status }).from(users).limit(100) };
  });

  app.post("/users/invite", { preHandler: [app.authenticate, tenantResolver, rbacGuard("settings.manage_roles")] }, async (req, reply) => {
    const parsed = z.object({ email: z.string().email(), full_name: z.string().min(1), role_id: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "email, full_name, role_id wajib" } });
    const db = req.tenantDb!;
    const [row] = await db.insert(users).values({
      email: parsed.data.email.toLowerCase(), fullName: parsed.data.full_name,
      roleId: parsed.data.role_id, status: "invited", passwordHash: await hashPassword(`invited-${Date.now()}`),
    }).returning();
    await db.insert(auditLogs).values({ action: "users.invite", entity: "users", entityId: row.id });
    return reply.status(201).send({ data: { ...row, passwordHash: undefined } });
  });

  app.patch("/users/:id/role", { preHandler: [app.authenticate, tenantResolver, rbacGuard("settings.manage_roles")] }, async (req, reply) => {
    const parsed = z.object({ role_id: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "role_id wajib" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(users).set({ roleId: parsed.data.role_id, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "User tidak ada" } });
    await invalidateUserPermissions(req.companyId!, id); // invalidate cache (bagian [6.3])
    await db.insert(auditLogs).values({ action: "users.change_role", entity: "users", entityId: id });
    return reply.send({ data: row });
  });
}

export async function roleRoutes(app: FastifyInstance) {
  app.get("/roles", { preHandler: [app.authenticate, tenantResolver, rbacGuard("settings.manage_roles")] }, async (req) => {
    const db = req.tenantDb!;
    const all = await db.select().from(roles);
    const rp = await db.select().from(rolePermissions);
    const perms = await db.select().from(permissions);
    const byId = new Map(perms.map((p) => [p.id, p.key]));
    return {
      data: all.map((r) => ({
        ...r,
        permissions: rp.filter((x) => x.roleId === r.id).map((x) => byId.get(x.permissionId)),
      })),
    };
  });

  app.put("/roles/:id/permissions", { preHandler: [app.authenticate, tenantResolver, rbacGuard("settings.manage_roles")] }, async (req, reply) => {
    const parsed = z.object({ permission_keys: z.array(z.string()) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "permission_keys wajib array" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Role tidak ada" } });
    if (role.isSystemRole && role.name === "Owner") {
      return reply.status(400).send({ error: { code: "PROTECTED_ROLE", message: "Role Owner tidak bisa diubah" } });
    }
    const allPerms = await db.select().from(permissions);
    const ids = allPerms.filter((p) => parsed.data.permission_keys.includes(p.key)).map((p) => p.id);
    const { inArray } = await import("drizzle-orm");
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    for (const pid of ids) await db.insert(rolePermissions).values({ roleId: id, permissionId: pid });
    // invalidate semua user ber-role ini
    const affected = await db.select({ id: users.id }).from(users).where(eq(users.roleId, id));
    for (const u of affected) await invalidateUserPermissions(req.companyId!, u.id);
    await db.insert(auditLogs).values({ action: "roles.update_permissions", entity: "roles", entityId: id });
    void inArray;
    return reply.send({ data: { ok: true } });
  });
}
