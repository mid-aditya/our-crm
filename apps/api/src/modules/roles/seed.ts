import {
  permissions,
  roles,
  rolePermissions,
  dealStages,
  users,
} from "../../db/tenant/schema.js";
import { DEFAULT_PERMISSIONS, ADMIN_EXCLUDED, MEMBER_INCLUDED } from "./permissions.js";
import { hashPassword } from "../auth/service.js";

// Seed 1 tenant baru: permissions, roles (Owner/Admin/Member), deal stages
// default (diadaptasi dari pipeline lama: chat_masuk→tertarik→ditawar→deal→batal),
// dan user Owner pertama.
export async function seedTenantDefaults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  owner: { email: string; fullName: string; password: string },
) {
  for (const p of DEFAULT_PERMISSIONS) {
    await db.insert(permissions).values(p).onConflictDoNothing({ target: permissions.key });
  }
  const permRows = await db.select().from(permissions);
  const byKey = new Map(permRows.map((p: { key: string; id: string }) => [p.key, p.id]));

  const [ownerRole] = await db.insert(roles).values({ name: "Owner", isSystemRole: true }).returning();
  const [adminRole] = await db.insert(roles).values({ name: "Admin", isSystemRole: true }).returning();
  const [memberRole] = await db.insert(roles).values({ name: "Member", isSystemRole: false }).returning();

  const adminKeys = DEFAULT_PERMISSIONS.map((p) => p.key).filter((k) => !ADMIN_EXCLUDED.includes(k));
  for (const [role, keys] of [
    [ownerRole, DEFAULT_PERMISSIONS.map((p) => p.key)],
    [adminRole, adminKeys],
    [memberRole, MEMBER_INCLUDED],
  ] as const) {
    for (const k of keys) {
      const pid = byKey.get(k);
      if (pid) await db.insert(rolePermissions).values({ roleId: role.id, permissionId: pid }).onConflictDoNothing();
    }
  }

  const stages = [
    { name: "Chat Masuk", orderIndex: 0 },
    { name: "Tertarik", orderIndex: 1 },
    { name: "Ditawar", orderIndex: 2 },
    { name: "Deal", orderIndex: 3, isWonStage: true },
    { name: "Batal", orderIndex: 4, isLostStage: true },
  ];
  for (const s of stages) await db.insert(dealStages).values(s);

  const [ownerUser] = await db
    .insert(users)
    .values({
      email: owner.email.toLowerCase(),
      passwordHash: await hashPassword(owner.password),
      fullName: owner.fullName,
      roleId: ownerRole.id,
      status: "active",
    })
    .returning();
  return { ownerRole, adminRole, memberRole, ownerUser };
}
