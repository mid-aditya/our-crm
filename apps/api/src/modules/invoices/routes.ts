import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { invoices, invoiceItems, payments } from "../../db/tenant/schema-erp.js";
import { tenantResolver } from "../../middlewares/tenant-resolver.js";
import { rbacGuard } from "../../middlewares/rbac.js";

// Invoicing: invoices + items + payments. Total dihitung server-side.
export async function invoiceRoutes(app: FastifyInstance) {
  app.get("/invoices", { preHandler: [app.authenticate, tenantResolver, rbacGuard("invoices.read")] }, async (req) => {
    const db = req.tenantDb!;
    return { data: await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(100) };
  });

  app.post("/invoices", { preHandler: [app.authenticate, tenantResolver, rbacGuard("invoices.create")] }, async (req, reply) => {
    const parsed = z.object({
      organization_id: z.string().uuid().optional(),
      contact_id: z.string().uuid().optional(),
      due_date: z.string().datetime().optional(),
      tax_percent: z.string().default("0"),
      items: z.array(z.object({ description: z.string().min(1), quantity: z.string().default("1"), unit_price: z.string() })).min(1),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } });
    const v = parsed.data;
    const db = req.tenantDb!;
    const number = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [inv] = await db.insert(invoices).values({
      number, organizationId: v.organization_id, contactId: v.contact_id,
      dueDate: v.due_date ? new Date(v.due_date) : undefined, taxPercent: v.tax_percent,
    }).returning();
    for (const it of v.items) {
      await db.insert(invoiceItems).values({ invoiceId: inv.id, description: it.description, quantity: it.quantity, unitPrice: it.unit_price });
    }
    return reply.status(201).send({ data: inv });
  });

  app.get("/invoices/:id", { preHandler: [app.authenticate, tenantResolver, rbacGuard("invoices.read")] }, async (req, reply) => {
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Invoice tidak ada" } });
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const payList = await db.select().from(payments).where(eq(payments.invoiceId, id));
    const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const tax = (subtotal * Number(inv.taxPercent)) / 100;
    const total = subtotal + tax - Number(inv.discountAmount);
    const paid = payList.reduce((s, p) => s + Number(p.amount), 0);
    return { data: inv, meta: { items, payments: payList, subtotal, tax, total, paid, balance: total - paid } };
  });

  app.post("/invoices/:id/payments", { preHandler: [app.authenticate, tenantResolver, rbacGuard("invoices.update")] }, async (req, reply) => {
    const parsed = z.object({ amount: z.string(), method: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "amount wajib" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [pay] = await db.insert(payments).values({ invoiceId: id, amount: parsed.data.amount, method: parsed.data.method }).returning();
    await db.update(invoices).set({ status: "partial", updatedAt: new Date() }).where(eq(invoices.id, id));
    return reply.status(201).send({ data: pay });
  });

  app.patch("/invoices/:id/status", { preHandler: [app.authenticate, tenantResolver, rbacGuard("invoices.update")] }, async (req, reply) => {
    const parsed = z.object({ status: z.enum(["draft", "sent", "partial", "paid", "overdue", "cancelled"]) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "status tidak valid" } });
    const db = req.tenantDb!;
    const { id } = req.params as { id: string };
    const [row] = await db.update(invoices).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    if (!row) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Invoice tidak ada" } });
    return reply.send({ data: row });
  });
}
