-- Tenant DB: auth/RBAC + CRM (kontak, deals, WA, blasting, tiket).
-- Dijalankan via provision.Provision (embed) ke setiap DB tenant baru.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role_id uuid,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(128) NOT NULL UNIQUE,
  description text,
  module text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  company_name text,
  source text,
  owner_user_id uuid,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS deal_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_won_stage boolean NOT NULL DEFAULT false,
  is_lost_stage boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contact_id uuid,
  value numeric NOT NULL DEFAULT '0',
  currency text NOT NULL DEFAULT 'IDR',
  stage_id uuid,
  owner_user_id uuid,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  subject text NOT NULL,
  notes text,
  related_to_type text,
  related_to_id uuid,
  owner_user_id uuid,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'unofficial',
  config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  contact_id uuid,
  assigned_agent_id uuid,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz,
  awaiting_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  direction text NOT NULL,
  sender_id uuid,
  body text NOT NULL,
  media_url text,
  status text NOT NULL DEFAULT 'sent',
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmsg_conv ON conversation_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel_id uuid NOT NULL,
  template text NOT NULL,
  audience jsonb NOT NULL DEFAULT '{}',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  stats jsonb NOT NULL DEFAULT '{"sent": 0, "failed": 0, "total": 0}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  subject text NOT NULL,
  description text,
  contact_id uuid,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'agent',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  author_id uuid,
  author_type text NOT NULL DEFAULT 'agent',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
