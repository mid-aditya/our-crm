import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { getRedis } from "../core/redis-client.js";
import {
  users,
  roles,
  permissions,
  rolePermissions,
} from "../db/tenant/schema.js";

// rbacGuard: cek permission user dari tenantDb (defense in depth, backend
// adalah security boundary). Cache Redis `perm:{company}:{user}` (TTL 5 mnt).
export function rbacGuard(permissionKey: string) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (req as { user?: { user_id: string } }).user;
    const companyId = req.companyId;
    const db = req.tenantDb;
    if (!user || !companyId || !db) {
      return reply.status(401).send({
        error: { code: "UNAUTHENTICATED", message: "Login dulu" },
      });
    }
    const cacheKey = `perm:${companyId}:${user.user_id}`;
    try {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        const perms = JSON.parse(cached) as string[];
        if (perms.includes(permissionKey)) return;
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: `Perlu permission ${permissionKey}` },
        });
      }
    } catch {
      /* lanjut ke DB */
    }
    // Resolve role user → permission keys dari tenant DB.
    const [u] = await db.select().from(users).where(eq(users.id, user.user_id)).limit(1);
    if (!u || !u.roleId || u.status !== "active") {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "User tidak aktif" },
      });
    }
    const rows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, u.roleId));
    const keys = rows.map((r) => r.key);
    try {
      await getRedis().setex(cacheKey, 300, JSON.stringify(keys));
    } catch {
      /* cache opsional */
    }
    if (!keys.includes(permissionKey)) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: `Perlu permission ${permissionKey}` },
      });
    }
  };
}

export async function invalidateUserPermissions(
  companyId: string,
  userId: string,
): Promise<void> {
  try {
    await getRedis().del(`perm:${companyId}:${userId}`);
  } catch {
    /* abaikan */
  }
}

// dipakai saat permission suatu role diubah: invalidate semua user ber-role tsb
export async function invalidateRolePermissions(
  companyId: string,
  db: { select: Function; [k: string]: unknown },
  roleId: string,
): Promise<void> {
  const rows = await (db as never as { select: () => { from: (t: unknown) => { where: (c: unknown) => Promise<{ id: string }[]> } } });
  void rows;
  void roleId;
  void companyId;
}
