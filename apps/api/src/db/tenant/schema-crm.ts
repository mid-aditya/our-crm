import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── Modul CRM: WhatsApp channels, conversations, blasting, tickets ──────

// Channel WhatsApp: official (Meta Cloud API) & unofficial (gateway Baileys).
// config menyimpan kredensial per tipe, misal:
//  official: { phone_number_id, waba_id, access_token }
//  unofficial: { gateway_url, api_key, session }
export const whatsappChannels = pgTable("whatsapp_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("unofficial"),
  config: jsonb("config").notNull().default({}),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Percakapan agent <-> customer (satu contact, satu channel).
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id").notNull(),
  contactId: uuid("contact_id"),
  assignedAgentId: uuid("assigned_agent_id"),
  status: text("status").notNull().default("open"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  // waktu pesan inbound terakhir yang belum dibalas (untuk SLA respons)
  awaitingSince: timestamp("awaiting_since", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  direction: text("direction").notNull(),
  senderId: uuid("sender_id"),
  body: text("body").notNull(),
  mediaUrl: text("media_url"),
  status: text("status").notNull().default("sent"),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Blasting: template dukung variabel {{nama}}, {{perusahaan}}, dsb.
// audience: { tags?: string[], source?: string } difilter dari contacts.
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  channelId: uuid("channel_id").notNull(),
  template: text("template").notNull(),
  audience: jsonb("audience").notNull().default({}),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  stats: jsonb("stats").notNull().default({ sent: 0, failed: 0, total: 0 }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Ticketing: tiket support internal + form publik (source=public_form).
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description"),
  contactId: uuid("contact_id"),
  assigneeId: uuid("assignee_id"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  source: text("source").notNull().default("agent"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull(),
  authorId: uuid("author_id"),
  // author_type: agent | customer (via form publik memakai contact)
  authorType: text("author_type").notNull().default("agent"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
