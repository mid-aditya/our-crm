import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  findCompaniesByEmail,
  verifyTenantPassword,
  storeRefreshToken,
  revokeRefreshToken,
  findValidRefreshToken,
  newRefreshToken,
} from "./service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  company_id: z.string().uuid().optional(),
});

function signAccess(app: FastifyInstance, userId: string, companyId: string, roleId: string) {
  return app.jwt.sign(
    { user_id: userId, company_id: companyId, role_id: roleId },
    { expiresIn: process.env.JWT_ACCESS_TTL ?? "15m" },
  );
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/login — tanpa company_id dulu; kalau >1 company, minta pilih.
  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
      });
    }
    const { email, password, company_id } = parsed.data;
    const rows = await findCompaniesByEmail(email);
    if (rows.length === 0) {
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "Email atau password salah" },
      });
    }
    if (!company_id && rows.length > 1) {
      // Jangan expose data sensitif — hanya id + company_id untuk dipilih.
      return reply.send({
        data: {
          requires_company_selection: true,
          companies: rows.map((r) => ({ company_id: r.companyId })),
        },
      });
    }
    const targetCompany = company_id ?? rows[0].companyId;
    if (!rows.some((r) => r.companyId === targetCompany)) {
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "Email atau password salah" },
      });
    }
    const user = await verifyTenantPassword(targetCompany, email, password);
    if (!user) {
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "Email atau password salah" },
      });
    }
    const accessToken = signAccess(app, user.id, targetCompany, user.roleId ?? "");
    const refreshToken = newRefreshToken();
    await storeRefreshToken(targetCompany, user.id, refreshToken);
    return reply.send({ data: { access_token: accessToken, refresh_token: refreshToken } });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = z.object({ refresh_token: z.string().min(1), company_id: z.string().uuid() }).safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "refresh_token & company_id wajib" } });
    }
    const row = await findValidRefreshToken(body.data.company_id, body.data.refresh_token);
    if (!row) {
      return reply.status(401).send({ error: { code: "INVALID_REFRESH", message: "Refresh token tidak valid" } });
    }
    await revokeRefreshToken(body.data.company_id, body.data.refresh_token);
    const refreshToken = newRefreshToken();
    await storeRefreshToken(body.data.company_id, row.userId, refreshToken);
    // role diambil ulang saat tenantResolver berikutnya; access token baru:
    const accessToken = signAccess(app, row.userId, body.data.company_id, "");
    return reply.send({ data: { access_token: accessToken, refresh_token: refreshToken } });
  });

  app.post("/auth/logout", async (req, reply) => {
    const body = z.object({ refresh_token: z.string().min(1), company_id: z.string().uuid() }).safeParse(req.body);
    if (body.success) await revokeRefreshToken(body.data.company_id, body.data.refresh_token);
    return reply.send({ data: { ok: true } });
  });

  // Switch company: verifikasi password ulang di tenant target, keluarkan token baru.
  app.post("/auth/switch-company", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "email, password, company_id wajib" } });
    }
    const { email, password, company_id } = parsed.data;
    if (!company_id) {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "company_id wajib" } });
    }
    const rows = await findCompaniesByEmail(email);
    if (!rows.some((r) => r.companyId === company_id)) {
      return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Email tidak terdaftar di company ini" } });
    }
    const user = await verifyTenantPassword(company_id, email, password);
    if (!user) {
      return reply.status(401).send({ error: { code: "INVALID_CREDENTIALS", message: "Email atau password salah" } });
    }
    const accessToken = signAccess(app, user.id, company_id, user.roleId ?? "");
    const refreshToken = newRefreshToken();
    await storeRefreshToken(company_id, user.id, refreshToken);
    return reply.send({ data: { access_token: accessToken, refresh_token: refreshToken } });
  });

  // Forgot/reset: stub aman — selalu return ok (anti user-enumeration),
  // job email asli diimplementasikan di jobs/email.worker.ts.
  app.post("/auth/forgot-password", async (req, reply) => {
    z.object({ email: z.string().email() }).safeParse(req.body);
    return reply.send({ data: { ok: true, message: "Jika email terdaftar, link reset telah dikirim" } });
  });
  app.post("/auth/reset-password", async (req, reply) => {
    const body = z.object({ token: z.string().min(1), password: z.string().min(8) }).safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "token & password (min 8) wajib" } });
    }
    return reply.send({ data: { ok: true } });
  });
}
