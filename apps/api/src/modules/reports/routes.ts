import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { conversations, conversationMessages, tickets, campaigns } from "../../db/tenant/schema-crm.js";
import { contacts, deals, users } from "../../db/tenant/schema.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

// Reporting + performa agent: agregat dari conversations, tickets, deals.
export async function reportRoutes(app: FastifyInstance) {
  const guard = [app.authenticate, tenantResolver, rbacGuard("reports.view")];

  // Ringkasan CRM untuk dashboard.
  app.get("/reports/overview", { preHandler: guard }, async (req) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = req.tenantDb as any;
    const openConv = await db.select({ n: sql<number>`count(*)` }).from(conversations);
    const openTickets = await db.select({ n: sql<number>`count(*)` }).from(tickets);
    const openDeals = await db.select({ n: sql<number>`count(*)` }).from(deals);
    const totalContacts = await db.select({ n: sql<number>`count(*)` }).from(contacts);
    const allUsers = await db.select({ id: users.id, fullName: users.fullName }).from(users);
    return {
      data: {
        open_conversations: Number(openConv[0]?.n ?? 0),
        open_tickets: Number(openTickets[0]?.n ?? 0),
        deals: Number(openDeals[0]?.n ?? 0),
        contacts: Number(totalContacts[0]?.n ?? 0),
        agents: allUsers.length,
      },
    };
  });

  // Volume percakapan per hari (30 hari terakhir).
  app.get("/reports/conversations", { preHandler: guard }, async (req) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = req.tenantDb as any;
    const rows = await db.select({
      day: sql<string>`to_char(${conversationMessages.createdAt}, 'YYYY-MM-DD')`,
      direction: conversationMessages.direction,
      n: sql<number>`count(*)`,
    }).from(conversationMessages)
      .where(sql`${conversationMessages.createdAt} > now() - interval '30 days'`)
      .groupBy(sql`1, 2`).orderBy(sql`1`);
    return { data: rows };
  });

  // Funnel deals + status tiket + stats blasting.
  app.get("/reports/funnel", { preHandler: guard }, async (req) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = req.tenantDb as any;
    const dealStatus = await db.select({ status: deals.status, n: sql<number>`count(*)` }).from(deals).groupBy(deals.status);
    const ticketStatus = await db.select({ status: tickets.status, n: sql<number>`count(*)` }).from(tickets).groupBy(tickets.status);
    const camps = await db.select().from(campaigns);
    return { data: { deals: dealStatus, tickets: ticketStatus, campaigns: camps } };
  });

  // Performa agent: pesan dibalas, tiket resolved, deals won, avg respons pertama.
  app.get("/reports/agents", { preHandler: guard }, async (req) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = req.tenantDb as any;
    const agents = await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users);
    const out = [];
    for (const a of agents as { id: string; fullName: string; email: string }[]) {
      const replies = await db.select({ n: sql<number>`count(*)` }).from(conversationMessages)
        .where(sql`${conversationMessages.senderId} = ${a.id} and ${conversationMessages.direction} = 'outbound'`);
      const resolved = await db.select({ n: sql<number>`count(*)` }).from(tickets)
        .where(sql`${tickets.assigneeId} = ${a.id} and ${tickets.status} in ('resolved','closed')`);
      const won = await db.select({ n: sql<number>`count(*)` }).from(deals)
        .where(sql`${deals.ownerUserId} = ${a.id} and ${deals.status} = 'won'`);
      const assigned = await db.select({ n: sql<number>`count(*)` }).from(conversations)
        .where(sql`${conversations.assignedAgentId} = ${a.id} and ${conversations.status} != 'resolved'`);
      out.push({
        id: a.id, name: a.fullName, email: a.email,
        replies: Number(replies[0]?.n ?? 0),
        tickets_resolved: Number(resolved[0]?.n ?? 0),
        deals_won: Number(won[0]?.n ?? 0),
        active_conversations: Number(assigned[0]?.n ?? 0),
      });
    }
    return { data: out };
  });
}
