import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { campaigns } from "../../db/tenant/schema-crm.js";
import { contacts } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";
import { sendWhatsApp } from "../conversations/sender.js";
import { whatsappChannels } from "../../db/tenant/schema-crm.js";

// Render template blasting: {{nama}}, {{perusahaan}}, {{email}}, {{hp}}.
// Key tidak dikenal dibiarkan apa adanya agar typo mudah terdeteksi.
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key: string) => {
    const v = vars[key.toLowerCase()];
    return v ?? m;
  });
}

export function contactVars(c: {
  fullName?: string | null; full_name?: string | null;
  companyName?: string | null; email?: string | null; phone?: string | null;
}): Record<string, string> {
  const name = c.fullName ?? c.full_name ?? "";
  return {
    nama: name.split(" ")[0] ?? name,
    nama_lengkap: name,
    perusahaan: c.companyName ?? "",
    email: c.email ?? "",
    hp: c.phone ?? "",
  };
}

export async function campaignRoutes(app: FastifyInstance) {
  app.get("/campaigns", { preHandler: [app.authenticate, tenantResolver, rbacGuard("campaigns.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(100) };
  });

  app.post("/campaigns", { preHandler: [app.authenticate, tenantResolver, rbacGuard("campaigns.create")] }, async (req, reply) => {
    const parsed = z.object({
      name: z.string().min(1),
      channel_id: z.string().uuid(),
      template: z.string().min(1),
      audience: z.object({ tags: z.array(z.string()).optional(), source: z.string().optional() }).default({}),
      scheduled_at: z.string().datetime().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const db = req.tenantDb!;
    const [row] = await db.insert(campaigns).values({
      name: parsed.data.name, channelId: parsed.data.channel_id, template: parsed.data.template,
      audience: parsed.data.audience, scheduledAt: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at) : undefined,
      createdBy: (req as { user?: { user_id: string } }).user!.user_id,
    }).returning();
    return reply.status(201).send({ data: row });
  });

  // Preview: jumlah penerima + contoh pesan pertama hasil render.
  app.get("/campaigns/:id/preview", { preHandler: [app.authenticate, tenantResolver, rbacGuard("campaigns.read")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!c) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Campaign tidak ada" } });
    const targets = await resolveAudience(db, c.audience as { tags?: string[]; source?: string });
    const sample = targets[0] ? renderTemplate(c.template, contactVars(targets[0])) : "";
    return { data: { total: targets.length, sample } };
  });

  // Launch: kirim inline per batch (tanpa Redis), update stats real-time.
  app.post("/campaigns/:id/launch", { preHandler: [app.authenticate, tenantResolver, rbacGuard("campaigns.launch")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!c) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Campaign tidak ada" } });
    if (c.status !== "draft") return reply.status(400).send({ error: { code: "ALREADY_LAUNCHED", message: `Campaign sudah ${c.status}` } });
    const [ch] = await db.select().from(whatsappChannels).where(eq(whatsappChannels.id, c.channelId)).limit(1);
    if (!ch) return reply.status(400).send({ error: { code: "NO_CHANNEL", message: "Channel tidak ada" } });

    await db.update(campaigns).set({ status: "sending", updatedAt: new Date() }).where(eq(campaigns.id, id));
    const targets = await resolveAudience(db, c.audience as { tags?: string[]; source?: string });
    let sent = 0, failed = 0;
    for (const t of targets) {
      if (!t.phone) { failed += 1; continue; }
      const r = await sendWhatsApp(t.phone, renderTemplate(c.template, contactVars(t)), { type: ch.type, config: ch.config });
      if (r.ok) sent += 1; else failed += 1;
      // throttle ringan agar tidak kena rate limit provider
      await new Promise((r2) => setTimeout(r2, 300));
    }
    const [done] = await db.update(campaigns).set({
      status: "done", stats: { sent, failed, total: targets.length }, updatedAt: new Date(),
    }).where(eq(campaigns.id, id)).returning();
    return reply.send({ data: done });
  });

  app.delete("/campaigns/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("campaigns.delete")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!c) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Campaign tidak ada" } });
    if (c.status === "sending") return reply.status(400).send({ error: { code: "SENDING", message: "Campaign sedang dikirim" } });
    await db.delete(campaigns).where(eq(campaigns.id, id));
    return reply.send({ data: { ok: true } });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveAudience(db: any, audience: { tags?: string[]; source?: string }) {
  const rows = await db.select().from(contacts);
  return (rows as { phone?: string | null; tags?: unknown; source?: string | null }[]).filter((c) => {
    if (!c.phone) return false;
    if (audience.source && c.source !== audience.source) return false;
    if (audience.tags?.length) {
      const tags = (c.tags ?? []) as unknown[];
      if (!audience.tags.some((t) => (tags as unknown[]).includes(t))) return false;
    }
    return true;
  });
}
