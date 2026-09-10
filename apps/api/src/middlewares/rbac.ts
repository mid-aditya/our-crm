import type { FastifyRequest, FastifyReply } from "fastify";
import { getRedis } from "../core/redis-client.js";

// ─── rbacGuard (bagian [6], defense in depth layer backend) ───────────────
// Cek permission user; cache di Redis `perm:{company}:{user}`.
// Frontend hanya menyembunyikan UI (UX), bukan security boundary.
export function rbacGuard(permissionKey: string) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (req as { user?: { user_id: string } }).user;
    const companyId = req.companyId;
    if (!user || !companyId) {
      return reply.status(401).send({
        error: { code: "UNAUTHENTICATED", message: "Login dulu" },
      });
    }
    const cacheKey = `perm:${companyId}:${user.user_id}`;
    try {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        const perms = JSON.parse(cached) as string[];
        if (!perms.includes(permissionKey)) {
          return reply.status(403).send({
            error: { code: "FORBIDDEN", message: `Perlu permission ${permissionKey}` },
          });
        }
        return;
      }
    } catch {
      /* cache miss → lanjut cek DB di langkah berikut (auth+RBAC penuh) */
    }
    // TODO(checkpoint-5): lookup role_permissions dari tenantDb + isi cache.
    return reply.status(403).send({
      error: { code: "RBAC_NOT_READY", message: "RBAC DB check belum diimplementasi (checkpoint 5)" },
    });
  };
}

export async function invalidateUserPermissions(
  companyId: string,
  userId: string,
): Promise<void> {
  await getRedis().del(`perm:${companyId}:${userId}`);
}
