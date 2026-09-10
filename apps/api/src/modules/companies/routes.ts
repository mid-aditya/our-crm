import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getMasterDb } from "../../db/master/client.js";
import { companies } from "../../db/master/schema.js";
import { enqueueProvision } from "../../jobs/provisioning.worker.js";
import { closeConnection } from "../../core/tenant-connection-manager.js";
import { eq } from "drizzle-orm";

const signupSchema = z.object({
  company_name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  owner_name: z.string().min(2),
  owner_email: z.string().email(),
  password: z.string().min(8),
});

export async function companyRoutes(app: FastifyInstance) {
  // POST /signup — async via BullMQ (bagian [8.1])
  app.post("/signup", async (req, reply) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    }
    const v = parsed.data;
    const result = await enqueueProvision({
      companyName: v.company_name, slug: v.slug,
      ownerName: v.owner_name, ownerEmail: v.owner_email, password: v.password,
    });
    return reply.status(202).send({ data: { ...result, message: "Akun sedang disiapkan" } });
  });

  app.get("/companies/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = getMasterDb();
    const [c] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!c) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Company tidak ada" } });
    return reply.send({ data: { status: c.status } });
  });

  // Suspend: tutup koneksi pool agar tenant terisolasi seketika.
  app.post("/platform/companies/:id/suspend", async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = getMasterDb();
    await db.update(companies).set({ status: "suspended", updatedAt: new Date() }).where(eq(companies.id, id));
    await closeConnection(id);
    return reply.send({ data: { ok: true } });
  });
}
