import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../src/core/encryption.js";

describe("encryption (AES-256-GCM)", () => {
  it("roundtrip encrypt→decrypt", () => {
    process.env.TENANT_CRED_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const enc = encryptSecret("s3cr3t-password");
    expect(enc).not.toContain("s3cr3t-password");
    expect(decryptSecret(enc)).toBe("s3cr3t-password");
  });

  it("menolak payload rusak", () => {
    expect(() => decryptSecret("rusak")).toThrow();
  });
});
