// Seed master: plan default + platform admin awal.
// Jalankan: npm run seed -w apps/api (butuh MASTER_DB_* env).
import argon2 from "argon2";
import { getMasterDb } from "../db/master/client.js";
import { plans, platformAdmins } from "../db/master/schema.js";

async function main() {
  const db = getMasterDb();
  await db.insert(plans).values({
    name: "Starter", maxUsers: 5, maxStorageMb: 1024, priceMonthly: "0",
    features: { contacts: true, deals: true },
  }).onConflictDoNothing();
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@platform.local";
  const pass = process.env.SEED_ADMIN_PASSWORD ?? "change-me-123";
  await db.insert(platformAdmins).values({
    name: "Platform Admin", email, passwordHash: await argon2.hash(pass),
  }).onConflictDoNothing();
  console.log(`seed ok: ${email}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
