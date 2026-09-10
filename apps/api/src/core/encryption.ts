import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

// AES-256-GCM untuk kredensial DB tenant di master DB (bagian [11]).
// Format simpan: base64(iv) + "." + base64(ciphertext) + "." + base64(authTag)
const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  const hex = process.env.TENANT_CRED_ENCRYPTION_KEY ?? "";
  // Terima hex 64 char (32 byte) atau string biasa (di-hash via padding nol).
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  const buf = Buffer.alloc(32, 0);
  Buffer.from(hex).copy(buf);
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, encB64, tagB64] = payload.split(".");
  if (!ivB64 || !encB64 || !tagB64) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
