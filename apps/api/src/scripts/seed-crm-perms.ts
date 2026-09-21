// Seed permission CRM ke tenant demo yang sudah ada (dibuat sebelum pivot).
// Jalankan: COMPANY_ID=<uuid> npx tsx src/scripts/seed-crm-perms.ts
import dotenv from "dotenv";
dotenv.config();
import { getConnection } from "../core/tenant-connection-manager.js";
import { setMasterLookup } from "../core/tenant-connection-manager.js";
import { permissions, roles, rolePermissions } from "../db/tenant/schema.js";
import { DEFAULT_PERMISSIONS, ADMIN_EXCLUDED, MEMBER_INCLUDED } from "../modules/roles/permissions.js";
import { encryptSecret } from "../core/encryption.js";
import { eq } from "drizzle-orm";

async function main() {
  const companyId = process.env.COMPANY_ID;
  if (!companyId) throw new Error("COMPANY_ID wajib di-set");
  setMasterLookup(async () => ({
    status: "active",
    dbHost: process.env.MASTER_DB_HOST ?? "127.0.0.1",
    dbPort: Number(process.env.MASTER_DB_PORT ?? 5432),
    dbName: process.env.DEMO_DB_NAME ?? "crm_tenant_demo",
    dbUser: process.env.DEMO_DB_USER ?? "root",
    dbPassEncrypted: encryptSecret(process.env.DEMO_DB_PASS ?? "root"),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = await getConnection(companyId);
  for (const p of DEFAULT_PERMISSIONS) {
    await db.insert(permissions).values(p).onConflictDoNothing({ target: permissions.key });
  }
  const permRows = await db.select().from(permissions);
  const byKey = new Map(permRows.map((p: { key: string; id: string }) => [p.key, p.id]));
  const allRoles = await db.select().from(roles);
  for (const r of allRoles as { id: string; name: string }[]) {
    let keys = DEFAULT_PERMISSIONS.map((p) => p.key);
    if (r.name === "Admin") keys = keys.filter((k) => !ADMIN_EXCLUDED.includes(k));
    if (r.name === "Member") keys = [...MEMBER_INCLUDED];
    for (const k of keys) {
      const pid = byKey.get(k);
      if (pid) await db.insert(rolePermissions).values({ roleId: r.id, permissionId: pid }).onConflictDoNothing();
    }
  }
  console.log("crm perms seeded untuk", allRoles.length, "roles");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
void eq;
