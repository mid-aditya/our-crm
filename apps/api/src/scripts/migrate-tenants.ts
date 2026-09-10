// Loop migration tenant ke semua company active (bagian [13]):
// JALANKAN MANUAL/TERJADWAL DENGAN APPROVAL — jangan otomatis tanpa review.
// Penggunaan: TENANT_MIGRATION_SQL=path/to/0001_baseline.sql npm run migrate:tenants -w apps/api
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { getMasterDb } from "../db/master/client.js";
import { companies } from "../db/master/schema.js";
import { decryptSecret } from "../core/encryption.js";
import { eq } from "drizzle-orm";

async function main() {
  const sqlFile = process.env.TENANT_MIGRATION_SQL;
  if (!sqlFile) throw new Error("TENANT_MIGRATION_SQL belum di-set");
  const sql = readFileSync(sqlFile, "utf8");
  const db = getMasterDb();
  const rows = await db.select().from(companies).where(eq(companies.status, "active"));
  console.log(`target tenants: ${rows.length}`);
  for (const c of rows) {
    const client = new Client({
      host: c.dbHost, port: c.dbPort, database: c.dbName,
      user: c.dbUser, password: decryptSecret(c.dbPassEncrypted),
    });
    await client.connect();
    try {
      await client.query(sql);
      console.log(`ok: ${c.slug} (${c.dbName})`);
    } catch (e) {
      console.error(`GAGAL: ${c.slug}:`, (e as Error).message);
    } finally {
      await client.end();
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
