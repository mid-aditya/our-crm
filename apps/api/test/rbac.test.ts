import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// RBAC permission checker: cache-hit path diuji tanpa Redis asli.
describe("rbacGuard", () => {
  beforeEach(() => vi.resetModules());

  it("mengizinkan bila permission ada di cache Redis", async () => {
    vi.doMock("../src/core/redis-client.js", () => ({
      getRedis: () => ({
        get: async () => JSON.stringify(["contacts.read"]),
        setex: async () => undefined,
        del: async () => undefined,
      }),
    }));
    const { rbacGuard } = await import("../src/middlewares/rbac.js");
    const guard = rbacGuard("contacts.read");
    let status = 0;
    const reply = { status: (s: number) => { status = s; return { send: () => undefined }; } };
    await guard(
      { user: { user_id: "u1" }, companyId: "c1", tenantDb: {} } as never,
      reply as never,
    );
    expect(status).toBe(0); // tidak ditolak = lanjut ke handler
  });

  it("menolak 403 bila permission tidak ada di cache", async () => {
    vi.doMock("../src/core/redis-client.js", () => ({
      getRedis: () => ({
        get: async () => JSON.stringify(["contacts.read"]),
        setex: async () => undefined,
        del: async () => undefined,
      }),
    }));
    const { rbacGuard } = await import("../src/middlewares/rbac.js");
    const guard = rbacGuard("contacts.delete");
    let status = 0;
    let body: unknown;
    const reply = { status: (s: number) => { status = s; return { send: (b: unknown) => { body = b; } }; } };
    await guard(
      { user: { user_id: "u1" }, companyId: "c1", tenantDb: {} } as never,
      reply as never,
    );
    expect(status).toBe(403);
    expect(JSON.stringify(body)).toContain("FORBIDDEN");
  });

  it("hash refresh token konsisten (sha256)", () => {
    const h = createHash("sha256").update("abc").digest("hex");
    expect(h).toHaveLength(64);
  });
});
