import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { eq, and, isNull } from "drizzle-orm";
import { getMasterDb } from "../../db/master/client.js";
import { companyUserIndex } from "../../db/master/schema.js";
import { getConnection } from "../../core/tenant-connection-manager.js";
import { users, refreshTokens } from "../../db/tenant/schema.js";

export async function findCompaniesByEmail(email: string) {
  const db = getMasterDb();
  return db
    .select()
    .from(companyUserIndex)
    .where(eq(companyUserIndex.email, email.toLowerCase()));
}

export async function verifyTenantPassword(companyId: string, email: string, password: string) {
  const db = await getConnection(companyId);
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (!u || u.status !== "active") return null;
  const ok = await argon2.verify(u.passwordHash, password);
  if (!ok) return null;
  return u;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(companyId: string, userId: string, token: string) {
  const db = await getConnection(companyId);
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
  });
  return expiresAt;
}

export async function revokeRefreshToken(companyId: string, token: string) {
  const db = await getConnection(companyId);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenHash, hashRefreshToken(token)),
        isNull(refreshTokens.revokedAt),
      ),
    );
}

export async function findValidRefreshToken(companyId: string, token: string) {
  const db = await getConnection(companyId);
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, hashRefreshToken(token)),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .limit(1);
  if (!row || row.expiresAt < new Date()) return null;
  return row;
}

export function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}
