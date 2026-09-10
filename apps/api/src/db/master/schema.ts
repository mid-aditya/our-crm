import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Master DB (crm_master): data global, tanpa data bisnis tenant ───

export const companyStatus = pgEnum("company_status", [
  "provisioning",
  "active",
  "suspended",
  "cancelled",
]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 63 }).notNull().unique(),
  status: companyStatus("status").notNull().default("provisioning"),
  planId: uuid("plan_id"),
  dbHost: text("db_host").notNull(),
  dbPort: integer("db_port").notNull().default(5432),
  dbName: text("db_name").notNull(),
  dbUser: text("db_user").notNull(),
  // Kredensial terenkripsi AES-256-GCM (lihat core/encryption.ts)
  dbPassEncrypted: text("db_pass_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  maxUsers: integer("max_users").notNull(),
  maxStorageMb: integer("max_storage_mb").notNull(),
  priceMonthly: numeric("price_monthly").notNull(),
  features: jsonb("features").notNull().default({}),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  planId: uuid("plan_id").notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const companyUserIndex = pgTable("company_user_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  companyId: uuid("company_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const provisioningJobStatus = pgEnum("provisioning_job_status", [
  "pending",
  "running",
  "success",
  "failed",
]);

export const provisioningJobs = pgTable("provisioning_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  status: provisioningJobStatus("status").notNull().default("pending"),
  log: text("log"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLogsPlatform = pgTable("audit_logs_platform", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetCompanyId: uuid("target_company_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
