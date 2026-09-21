import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getRedis } from "./redis-client.js";
import { decryptSecret } from "./encryption.js";

// ─── TenantConnectionManager (singleton, bagian [5]) ─────────────────────
// Pool koneksi Drizzle per company dengan LRU eviction.
// - getConnection(companyId): cache-hit → return; miss → lookup master DB
//   (cache Redis TTL 5 mnt), decrypt kredensial, buat Pool+ Drizzle baru.
// - Pool penuh (TENANT_POOL_MAX, default 50) → evict koneksi paling lama
//   tidak dipakai (LRU) sebelum membuat koneksi baru.
// - closeConnection(companyId): cleanup manual (suspend/hapus company).
// Catatan: koneksi master DB di-inject via setMasterLookup agar modul ini
// gampang di-unit-test dengan mock (tanpa Postgres asli).

export type TenantDb = ReturnType<typeof drizzle>;

interface PoolEntry {
  db: TenantDb;
  pool: Pool;
  lastUsed: number;
}

type MasterLookup = (companyId: string) => Promise<{
  status: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassEncrypted: string;
}>;

let masterLookup: MasterLookup | null = null;

export function setMasterLookup(fn: MasterLookup) {
  masterLookup = fn;
}

const pool = new Map<string, PoolEntry>();

export function poolSize(): number {
  return pool.size;
}

export function poolMax(): number {
  return Number(process.env.TENANT_POOL_MAX ?? 50);
}

function touch(entry: PoolEntry): void {
  entry.lastUsed = Date.now();
}

function evictLru(): void {
  let oldestKey: string | null = null;
  let oldestTs = Infinity;
  for (const [k, v] of pool) {
    if (v.lastUsed < oldestTs) {
      oldestTs = v.lastUsed;
      oldestKey = k;
    }
  }
  if (oldestKey) void closeConnection(oldestKey);
}

async function loadCompanyInfo(companyId: string) {
  // Cache-aside: Redis boleh mati — fallback langsung ke master DB.
  // Request tidak boleh gagal hanya karena cache down.
  const cacheKey = `tenant-conn:${companyId}`;
  const ttl = Number(process.env.TENANT_CONN_CACHE_TTL_SEC ?? 300);
  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) return JSON.parse(cached) as Awaited<ReturnType<MasterLookup>>;
  } catch {
    /* lanjut ke master DB */
  }
  if (!masterLookup) throw new Error("Master lookup belum di-set");
  const info = await masterLookup(companyId);
  try {
    await getRedis().setex(cacheKey, ttl, JSON.stringify(info));
  } catch {
    /* cache opsional */
  }
  return info;
}

export async function getConnection(companyId: string): Promise<TenantDb> {
  const hit = pool.get(companyId);
  if (hit) {
    touch(hit);
    return hit.db;
  }
  if (pool.size >= poolMax()) evictLru();
  const info = await loadCompanyInfo(companyId);
  if (info.status !== "active") {
    throw Object.assign(new Error(`Company ${info.status}`), {
      statusCode: 403,
      code: "COMPANY_NOT_ACTIVE",
    });
  }
  const password = decryptSecret(info.dbPassEncrypted);
  const pgPool = new Pool({
    host: info.dbHost,
    port: info.dbPort,
    database: info.dbName,
    user: info.dbUser,
    password,
    max: 5, // tiap tenant hemat koneksi; skala via LRU di level manager
  });
  const db = drizzle(pgPool);
  pool.set(companyId, { db, pool: pgPool, lastUsed: Date.now() });
  return db;
}

export async function closeConnection(companyId: string): Promise<void> {
  const entry = pool.get(companyId);
  if (!entry) return;
  pool.delete(companyId);
  await entry.pool.end().catch(() => undefined);
  try {
    await getRedis().del(`tenant-conn:${companyId}`);
  } catch {
    /* abaikan */
  }
}

// Khusus test: reset pool tanpa Redis.
export function __resetPoolForTest(): void {
  pool.clear();
}
