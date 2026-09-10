import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { loadEnv } from "./config/env.js";
import { setMasterLookup } from "./core/tenant-connection-manager.js";
import { getMasterDb } from "./db/master/client.js";
import { companies } from "./db/master/schema.js";
import { sensitiveRateLimit } from "./middlewares/rate-limit.js";
import { authRoutes } from "./modules/auth/routes.js";
import { companyRoutes } from "./modules/companies/routes.js";
import { contactRoutes } from "./modules/contacts/routes.js";
import { dealRoutes } from "./modules/deals/routes.js";
import { activityRoutes } from "./modules/activities/routes.js";
import { userRoutes, roleRoutes } from "./modules/users/routes.js";
import { eq } from "drizzle-orm";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function buildServer() {
  const env = loadEnv(); // fail fast kalau secret kosong
  const app = Fastify({ logger: true });

  void app.register(cors, {
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
  });
  void app.register(helmet, { contentSecurityPolicy: false });
  void app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  // Rate limit global per-IP + per-company di level route bisnis via hook.
  void app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: { code: "UNAUTHENTICATED", message: "Token tidak valid" },
      });
    }
  });

  // Master lookup untuk TenantConnectionManager (cache Redis 5 mnt di dalamnya).
  setMasterLookup(async (companyId: string) => {
    const db = getMasterDb();
    const [c] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!c) throw Object.assign(new Error("Company tidak ditemukan"), { statusCode: 404, code: "COMPANY_NOT_FOUND" });
    return {
      status: c.status, dbHost: c.dbHost, dbPort: c.dbPort,
      dbName: c.dbName, dbUser: c.dbUser, dbPassEncrypted: c.dbPassEncrypted,
    };
  });

  void sensitiveRateLimit(app, "/auth/login");
  void sensitiveRateLimit(app, "/auth/forgot-password");

  app.get("/health", async () => ({ data: { status: "ok" } }));

  void app.register(
    async (v1) => {
      await authRoutes(v1);
      await companyRoutes(v1);
      await contactRoutes(v1);
      await dealRoutes(v1);
      await activityRoutes(v1);
      await userRoutes(v1);
      await roleRoutes(v1);
    },
    { prefix: "/api/v1" },
  );

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, _req, reply) => {
    app.log.error(err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    reply.status(status).send({
      error: { code: (err as { code?: string }).code ?? "INTERNAL_ERROR", message: status === 500 ? "Terjadi kesalahan" : err.message },
    });
  });

  return app;
}

const isMain = process.argv[1]?.endsWith("server.ts") ?? false;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.API_PORT ?? 3001);
  app.listen({ port, host: "0.0.0.0" }).catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
}
