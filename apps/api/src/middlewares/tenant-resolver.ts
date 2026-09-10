import type { FastifyRequest, FastifyReply } from "fastify";
import { getConnection } from "../core/tenant-connection-manager.js";
// Payload JWT — mirror dari packages/shared-types (di-duplikat agar tsc rootDir tetap bersih).
interface AccessTokenPayload {
  user_id: string;
  company_id: string;
  role_id: string;
}

// ─── tenantResolver (bagian [5]) ──────────────────────────────────────────
// company_id WAJIB dari JWT terverifikasi (request.user), bukan dari
// body/query/header. Subdomain hanya dipakai pre-login (di luar middleware
// ini). Urutan route: authenticate → tenantResolver → rbacGuard → handler.

declare module "fastify" {
  interface FastifyRequest {
    tenantDb?: Awaited<ReturnType<typeof getConnection>>;
    companyId?: string;
  }
}

export async function tenantResolver(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = (req as { user?: AccessTokenPayload }).user;
  const companyId = user?.company_id;
  if (!companyId) {
    return reply.status(401).send({
      error: { code: "TENANT_MISSING", message: "company_id tidak ada di token" },
    });
  }
  try {
    req.tenantDb = await getConnection(companyId);
    req.companyId = companyId;
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    return reply.status(e.statusCode ?? 500).send({
      error: { code: e.code ?? "TENANT_ERROR", message: e.message ?? "Gagal resolve tenant" },
    });
  }
}
