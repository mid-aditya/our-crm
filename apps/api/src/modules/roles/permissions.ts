// Katalog permission default — di-seed ke setiap tenant baru.
// Format key: "<module>.<action>".
export const DEFAULT_PERMISSIONS: { key: string; description: string; module: string }[] = [
  { key: "contacts.create", description: "Buat kontak", module: "contacts" },
  { key: "contacts.read", description: "Lihat kontak", module: "contacts" },
  { key: "contacts.update", description: "Ubah kontak", module: "contacts" },
  { key: "contacts.delete", description: "Hapus kontak", module: "contacts" },
  { key: "deals.create", description: "Buat deal", module: "deals" },
  { key: "deals.read", description: "Lihat deal", module: "deals" },
  { key: "deals.update", description: "Ubah deal", module: "deals" },
  { key: "deals.delete", description: "Hapus deal", module: "deals" },
  { key: "activities.create", description: "Buat aktivitas", module: "activities" },
  { key: "activities.read", description: "Lihat aktivitas", module: "activities" },
  { key: "activities.update", description: "Ubah aktivitas", module: "activities" },
  { key: "activities.delete", description: "Hapus aktivitas", module: "activities" },
  { key: "reports.export", description: "Export laporan", module: "reports" },
  { key: "settings.manage_roles", description: "Kelola role & permission", module: "settings" },
  { key: "settings.manage_billing", description: "Kelola billing", module: "settings" },
];

export const OWNER_EXCLUDED: string[] = [];
export const ADMIN_EXCLUDED = ["settings.manage_billing"];
export const MEMBER_INCLUDED = [
  "contacts.create",
  "contacts.read",
  "contacts.update",
  "deals.create",
  "deals.read",
  "deals.update",
  "activities.create",
  "activities.read",
  "activities.update",
];
