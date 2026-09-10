import { describe, it, expect, vi } from "vitest";

// TenantConnectionManager: LRU eviction diuji dengan mock lookup + mock pg.
describe("tenant-connection-manager LRU", () => {
  it("evict koneksi paling lama saat pool penuh", async () => {
    vi.resetModules();
    process.env.TENANT_POOL_MAX = "2";
    process.env.TENANT_CONN_CACHE_TTL_SEC = "300";
    process.env.TENANT_CRED_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    vi.doMock("../src/core/redis-client.js", () => ({
      getRedis: () => ({
        get: async () => null,
        setex: async () => undefined,
        del: async () => undefined,
      }),
    }));
    const { encryptSecret } = await import("../src/core/encryption.js");
    const enc = encryptSecret("pw");

    const mod = await import("../src/core/tenant-connection-manager.js");
    mod.setMasterLookup(async (id: string) => ({
      status: "active", dbHost: "h", dbPort: 5432,
      dbName: `db_${id}`, dbUser: "u", dbPassEncrypted: enc,
    }));
    mod.__resetPoolForTest();
    // Mock Pool end agar evict tidak butuh koneksi asli — modul memakai pg asli,
    // jadi test ini hanya verifikasi limit & lookup; koneksi dibuat lazy oleh pg.
    await mod.getConnection("c1");
    await mod.getConnection("c2");
    expect(mod.poolSize()).toBe(2);
    await mod.getConnection("c3");
    expect(mod.poolSize()).toBe(2);
    await mod.closeConnection("c2");
    await mod.closeConnection("c3");
  });
});
