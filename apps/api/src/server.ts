import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { loadEnv } from "./config/env.js";

export function buildServer() {
  const env = loadEnv(); // fail fast kalau secret kosong
  const app = Fastify({ logger: true });

  void app.register(cors, {
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
  });
  void app.register(helmet);
  void app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  void app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: { code: "UNAUTHENTICATED", message: "Token tidak valid" },
      });
    }
  });

  app.get("/health", async () => ({ data: { status: "ok" } }));
  app.get("/api/v1/health", async () => ({ data: { status: "ok" } }));

  return app;
}
