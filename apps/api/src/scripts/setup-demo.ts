// Setup tenant demo lokal: buat record company (active) di master DB,
// daftarkan owner di company_user_index, seed defaults tenant.
// Env yang dipakai: MASTER_DB_*, TENANT_CRED_ENCRYPTION_KEY, plus:
//   DEMO_SLUG, DEMO_COMPANY, DEMO_NAME, DEMO_EMAIL, DEMO_PASSWORD,
//   DEMO_DB_NAME (default crm_tenant_demo), DEMO_DB_USER/PASS (default root/root).
// Jalankan: npx tsx src/scripts/setup-demo.ts
import dotenv from "dotenv";
dotenv.config();
import { getMasterDb } from "../db/master/client.js";
import { companies, companyUserIndex } from "../db/master/schema.js";
import { encryptSecret } from "../core/encryption.js";
import { getConnection } from "../core/tenant-connection-manager.js";
import { setMasterLookup } from "../core/tenant-connection-manager.js";
import { seedTenantDefaults } from "../modules/roles/seed.js";
import { eq } from "drizzle-orm";

async function main() {
  const slug = process.env.DEMO_SLUG ?? "demo";
  const dbName = process.env.DEMO_DB_NAME ?? "crm_tenant_demo";
  const dbUser = process.env.DEMO_DB_USER ?? "root";
  const dbPass = process.env.DEMO_DB_PASS ?? "root";
  const email = (process.env.DEMO_EMAIL ?? "owner@demo.co.id").toLowerCase();
  const db = getMasterDb();

  setMasterLookup(async () => ({
    status: "active",
    dbHost: process.env.MASTER_DB_HOST ?? "127.0.0.1",
    dbPort: Number(process.env.MASTER_DB_PORT ?? 5432),
    dbName,
    dbUser,
    dbPassEncrypted: encryptSecret(dbPass),
  }));

  let [company] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  if (!company) {
    [company] = await db.insert(companies).values({
      name: process.env.DEMO_COMPANY ?? "Demo Company",
      slug,
      status: "active",
      dbHost: process.env.MASTER_DB_HOST ?? "127.0.0.1",
      dbPort: Number(process.env.MASTER_DB_PORT ?? 5432),
      dbName,
      dbUser,
      dbPassEncrypted: encryptSecret(dbPass),
    }).returning();
    console.log("company created:", company.id);
  } else {
    console.log("company exists:", company.id);
  }

  const existing = await db.select().from(companyUserIndex).where(eq(companyUserIndex.email, email));
  if (!existing.some((r) => r.companyId === company.id)) {
    await db.insert(companyUserIndex).values({ email, companyId: company.id });
    console.log("index added:", email);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant: any = await getConnection(company.id);
  const { ownerUser } = await seedTenantDefaults(tenant, {
    email,
    fullName: process.env.DEMO_NAME ?? "Demo Owner",
    password: process.env.DEMO_PASSWORD ?? "password123",
  });
  console.log("tenant seeded, owner:", (ownerUser as { id: string }).id);
  console.log("LOGIN:", JSON.stringify({ email, password: process.env.DEMO_PASSWORD ?? "password123" }));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
