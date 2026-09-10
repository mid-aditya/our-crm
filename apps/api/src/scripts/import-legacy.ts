// Import data legacy (Supabase single-DB) → tenant DB baru.
// Sumber: export JSON/CSV dari tabel lama (contacts, deals, tasks).
// Mapping: teams→company aktif, profiles→users, label[]→tags,
// deals.stage enum→deal_stages, tasks→activities(type=task).
// Penggunaan: LEGACY_JSON=./legacy.json COMPANY_ID=<uuid> npm run import:legacy -w apps/api
import { readFileSync } from "node:fs";
import { getConnection } from "../core/tenant-connection-manager.js";
import { contacts, deals, dealStages, activities } from "../db/tenant/schema.js";
import { eq } from "drizzle-orm";

interface Legacy {
  contacts?: { name: string; email?: string; whatsapp_number?: string; source?: string; notes?: string; label?: string[] }[];
  deals?: { title: string; value?: string; stage?: string; contact_id?: string }[];
  tasks?: { title: string; description?: string; status?: string; contact_id?: string }[];
}

const STAGE_MAP: Record<string, string> = {
  chat_masuk: "Chat Masuk", tertarik: "Tertarik", ditawar: "Ditawar", deal: "Deal", batal: "Batal",
};

async function main() {
  const file = process.env.LEGACY_JSON;
  const companyId = process.env.COMPANY_ID;
  if (!file || !companyId) throw new Error("LEGACY_JSON & COMPANY_ID wajib di-set");
  const legacy = JSON.parse(readFileSync(file, "utf8")) as Legacy;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = await getConnection(companyId);
  const stages = await db.select().from(dealStages);
  const stageByName = new Map(stages.map((s: { name: string; id: string }) => [s.name, s.id]));

  const contactIdMap = new Map<string, string>();
  for (const [i, c] of (legacy.contacts ?? []).entries()) {
    const [row] = await db.insert(contacts).values({
      fullName: c.name, email: c.email, phone: c.whatsapp_number,
      source: c.source ?? "legacy-import", tags: c.label ?? [],
      customFields: c.notes ? { legacy_notes: c.notes } : {},
    }).returning();
    contactIdMap.set(String(i), row.id);
  }
  for (const d of legacy.deals ?? []) {
    await db.insert(deals).values({
      title: d.title, value: d.value ?? "0",
      stageId: stageByName.get(STAGE_MAP[d.stage ?? ""] ?? ""),
      status: d.stage === "deal" ? "won" : d.stage === "batal" ? "lost" : "open",
    });
  }
  for (const t of legacy.tasks ?? []) {
    await db.insert(activities).values({
      type: "task", subject: t.title, notes: t.description,
      completedAt: t.status === "done" ? new Date() : undefined,
    });
  }
  console.log(`import ok: ${contactIdMap.size} contacts`);
  void eq;
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
