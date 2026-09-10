import type { FastifyInstance } from "fastify";

// Rate limit ketat untuk endpoint sensitif (login, forgot-password):
// per IP + per email (bagian [7.3]).
export async function sensitiveRateLimit(
  app: FastifyInstance,
  key: string,
  max = 10,
) {
  const hits = new Map<string, { n: number; reset: number }>();
  app.addHook("preHandler", async (req, reply) => {
    if (!req.url.includes(key)) return;
    const body = (req.body as { email?: string } | undefined) ?? {};
    const bucket = `${req.ip}:${(body.email ?? "").toLowerCase()}`;
    const now = Date.now();
    const cur = hits.get(bucket);
    if (!cur || now > cur.reset) {
      hits.set(bucket, { n: 1, reset: now + 60_000 });
      return;
    }
    cur.n += 1;
    if (cur.n > max) {
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan, coba lagi nanti" },
      });
    }
  });
}
