-- Master DB: companies, plans, subscriptions, company_user_index,
-- platform_admins, provisioning_jobs, audit_logs_platform.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE company_status AS ENUM ('provisioning','active','suspended','cancelled','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug varchar(63) NOT NULL UNIQUE,
  status company_status NOT NULL DEFAULT 'provisioning',
  plan_id uuid,
  db_host text NOT NULL,
  db_port integer NOT NULL DEFAULT 5432,
  db_name text NOT NULL,
  db_user text NOT NULL,
  db_pass_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_users integer NOT NULL,
  max_storage_mb integer NOT NULL,
  price_monthly numeric NOT NULL,
  features jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS company_user_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, company_id)
);
CREATE INDEX IF NOT EXISTS idx_company_user_email ON company_user_index(email);

CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  log text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
