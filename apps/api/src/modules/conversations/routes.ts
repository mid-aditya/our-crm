import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
  whatsappChannels, conversations, conversationMessages,
} from "../../db/tenant/schema-crm.js";
import { contacts } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";
import { sendWhatsApp } from "./sender.js";

export async function conversationRoutes(app: FastifyInstance) {
  // — Channels —
  app.get("/wa-channels", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.manage_channels")] }, async (req) => {
    const db = req.tenantDb!;
    const rows = await db.select().from(whatsappChannels).limit(20);
    // Jangan bocorkan token: sensor config sensitif.
    return { data: rows.map((r) => ({ ...r, config: maskConfig(r.config as Record<string, unknown>) })) };
  });

  app.post("/wa-channels", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.manage_channels")] }, async (req, reply) => {
    const parsed = z.object({
      name: z.string().min(1),
      type: z.enum(["official", "unofficial"]),
      config: z.record(z.unknown()).default({}),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const db = req.tenantDb!;
    const [row] = await db.insert(whatsappChannels).values({
      name: parsed.data.name, type: parsed.data.type,
      config: parsed.data.config as Record<string, string>,
    }).returning();
    return reply.status(201).send({ data: { ...row, config: maskConfig(row.config as Record<string, unknown>) } });
  });

  // — Conversations —
  app.get("/conversations", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.read")] }, async (req) => {
    const q = (req.query as { status?: string }) ?? {};
    const db = req.tenantDb!;
    const rows = await db.select().from(conversations)
      .where(q.status ? eq(conversations.status, q.status) : undefined)
      .orderBy(desc(conversations.lastMessageAt)).limit(100);
    return { data: rows };
  });

  app.post("/conversations", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.reply")] }, async (req, reply) => {
    const parsed = z.object({ channel_id: z.string().uuid(), contact_id: z.string().uuid().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "channel_id wajib" } });
    const db = req.tenantDb!;
    const [row] = await db.insert(conversations).values({
      channelId: parsed.data.channel_id, contactId: parsed.data.contact_id,
      assignedAgentId: (req as { user?: { user_id: string } }).user!.user_id,
    }).returning();
    return reply.status(201).send({ data: row });
  });

  app.get("/conversations/:id/messages", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.read")] }, async (req) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const rows = await db.select().from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id)).orderBy(conversationMessages.createdAt).limit(500);
    return { data: rows };
  });

  // Balas: simpan outbound + kirim via channel (official/unofficial).
  app.post("/conversations/:id/reply", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.reply")] }, async (req, reply) => {
    const parsed = z.object({ body: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "body wajib" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    if (!conv) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Percakapan tidak ada" } });
    const [ch] = await db.select().from(whatsappChannels).where(eq(whatsappChannels.id, conv.channelId)).limit(1);
    if (!ch) return reply.status(400).send({ error: { code: "NO_CHANNEL", message: "Channel tidak ditemukan" } });

    let to: string | undefined;
    if (conv.contactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, conv.contactId)).limit(1);
      to = c?.phone ?? undefined;
    }
    const userId = (req as { user?: { user_id: string } }).user!.user_id;
    const [msg] = await db.insert(conversationMessages).values({
      conversationId: id, direction: "outbound", senderId: userId, body: parsed.data.body,
    }).returning();

    let result = { ok: false, error: "Kontak tidak punya nomor HP" } as { ok: boolean; externalId?: string; error?: string };
    if (to) result = await sendWhatsApp(to, parsed.data.body, { type: ch.type, config: ch.config });
    await db.update(conversationMessages).set({
      status: result.ok ? "sent" : "failed", externalId: result.externalId,
    }).where(eq(conversationMessages.id, msg.id));
    await db.update(conversations).set({
      lastMessageAt: new Date(), awaitingSince: null, assignedAgentId: conv.assignedAgentId ?? userId, updatedAt: new Date(),
    }).where(eq(conversations.id, id));

    if (!result.ok) return reply.status(502).send({ error: { code: "WA_SEND_FAILED", message: result.error ?? "Gagal kirim" } });
    return reply.status(201).send({ data: { ...msg, status: "sent", externalId: result.externalId } });
  });

  // Webhook inbound (dari gateway/Meta) — assign otomatis round-robin sederhana:
  // conversation terbuka tanpa agent -> agent pengirim webhook pertama? Untuk
  // sekarang: buat/temukan conversation per (channel, phone), tandai awaiting.
  app.post("/wa-webhook/:channelId", async (req, reply) => {
    const { channelId } = req.params as { channelId: string };
    const body = (req.body ?? {}) as { from?: string; text?: string; external_id?: string };
    if (!body.from || !body.text) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "from & text wajib" } });
    // Resolve tenant dari channel: webhook URL per-channel berisi channelId;
    // lookup master? Sederhana: butuh company — gunakan header X-Company-Id
    // yang didaftarkan saat channel dibuat (didokumentasikan di README channel).
    const companyId = (req.headers["x-company-id"] ?? "") as string;
    if (!companyId) return reply.status(401).send({ error: { code: "NO_COMPANY", message: "X-Company-Id wajib" } });
    const { getConnection } = await import("../../core/tenant-connection-manager.js");
    const db = (await getConnection(companyId)) as typeof req.tenantDb & object;
    const [ch] = await (db as NonNullable<typeof req.tenantDb>).select().from(whatsappChannels).where(eq(whatsappChannels.id, channelId)).limit(1);
    if (!ch) return reply.status(404).send({ error: { code: "NO_CHANNEL", message: "Channel tidak ada" } });

    const tdb = db as NonNullable<typeof req.tenantDb>;
    const found = await tdb.select().from(contacts).where(eq(contacts.phone, body.from)).limit(1);
    let contactId = found[0]?.id;
    if (!contactId) {
      const [c] = await tdb.insert(contacts).values({ fullName: body.from, phone: body.from, source: `wa:${ch.name}` }).returning();
      contactId = c.id;
    }
    const open = await tdb.select().from(conversations).where(
      and(eq(conversations.channelId, channelId), eq(conversations.contactId, contactId), eq(conversations.status, "open")),
    ).limit(1);
    let conv = open[0];
    if (!conv) {
      [conv] = await tdb.insert(conversations).values({
        channelId, contactId, lastMessageAt: new Date(), awaitingSince: new Date(),
      }).returning();
    } else {
      await tdb.update(conversations).set({ lastMessageAt: new Date(), awaitingSince: conv.awaitingSince ?? new Date(), updatedAt: new Date() }).where(eq(conversations.id, conv.id));
    }
    await tdb.insert(conversationMessages).values({
      conversationId: conv.id, direction: "inbound", body: body.text, externalId: body.external_id, status: "delivered",
    });
    return reply.send({ data: { conversation_id: conv.id } });
  });

  app.patch("/conversations/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("conversations.assign")] }, async (req, reply) => {
    const parsed = z.object({
      status: z.enum(["open", "pending", "resolved"]).optional(),
      assigned_agent_id: z.string().uuid().nullable().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "status/assigned_agent_id tidak valid" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(conversations).set({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.assigned_agent_id !== undefined ? { assignedAgentId: parsed.data.assigned_agent_id } : {}),
      updatedAt: new Date(),
    }).where(eq(conversations.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Percakapan tidak ada" } });
    return reply.send({ data: row });
  });
  void isNull;
}

function maskConfig(cfg: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg ?? {})) {
    out[k] = /token|key|secret/i.test(k) ? "••••••" : v;
  }
  return out;
}
