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

-- Menu yang di-approve admin/developer untuk tiap user (khusus role Agent;
-- Developer & Admin selalu melihat semua menu). menu_key = href tanpa slash awal.
CREATE TABLE IF NOT EXISTS menu_grants (
  user_id uuid NOT NULL,
  menu_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, menu_key)
);

-- Akses sidebar per role (agent/spv). Admin/developer selalu full.
CREATE TABLE IF NOT EXISTS role_menu_grants (
  role_key text NOT NULL,
  menu_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_key, menu_key)
);
INSERT INTO role_menu_grants (role_key, menu_key)
SELECT 'agent', m FROM (VALUES ('dashboard'),('livechat'),('conversations'),('kanban'),('contacts'),('attendance')) AS v(m)
ON CONFLICT DO NOTHING;
INSERT INTO role_menu_grants (role_key, menu_key)
SELECT 'spv', m FROM (VALUES ('dashboard'),('livechat'),('conversations'),('kanban'),('contacts'),('attendance'),('reports'),('tickets')) AS v(m)
ON CONFLICT DO NOTHING;

-- Level hierarki role (Developer 100 > Admin 80 > SPV 50 > Agent 10).
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 0;

-- Atasan langsung (SPV membawahi agent; admin/developer membawahi semua).
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id uuid;

-- Boilerplate versi skema DB company. Tiap company punya DB sendiri dengan
-- frame default ini; developer bisa expand per company (custom field, dsb).
CREATE TABLE IF NOT EXISTS tenant_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Form tiket custom per company (diatur admin di Settings).
CREATE TABLE IF NOT EXISTS ticket_field_defs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '[]',
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Nilai field custom per tiket (mengikuti form company).
CREATE TABLE IF NOT EXISTS ticket_field_values (
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value text NOT NULL DEFAULT '',
  PRIMARY KEY (ticket_id, field_key)
);

-- Pengaturan umum per company (key-value, cth: widget_color).
CREATE TABLE IF NOT EXISTS company_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Jam operasional per company (0=Minggu..6=Sabtu).
CREATE TABLE IF NOT EXISTS operational_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL,
  open_time time,
  close_time time,
  is_closed boolean NOT NULL DEFAULT false,
  UNIQUE(day_of_week)
);

-- Status aux/presence agent (online, aux, break, offline + label custom).
CREATE TABLE IF NOT EXISTS agent_presence (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline',
  aux_label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Jenis cuti/izin (label bisa di-custom admin).
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);

-- Pengajuan cuti/izin agent.
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type_id uuid REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approver_id uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, status);

-- Absensi harian agent.
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present',
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Log aktivitas semua user (developer..agent).
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  role_name text,
  method text NOT NULL,
  path text NOT NULL,
  status_code int NOT NULL DEFAULT 0,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- Kanban ala Trello (dibuat sendiri).
CREATE TABLE IF NOT EXISTS kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Log perpindahan task (tercatat siapa & kapan).
CREATE TABLE IF NOT EXISTS kanban_card_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  from_column_id uuid,
  to_column_id uuid,
  moved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_card_moves_card ON kanban_card_moves(card_id, created_at);

-- Bot responder livechat: pertanyaan & jawaban custom.
-- keywords: koma-dipisah, dicocokkan case-insensitive ke pesan customer.
-- escalate=true: jawaban ini sekaligus meneruskan ke agent.
CREATE TABLE IF NOT EXISTS bot_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES bot_qa(id) ON DELETE CASCADE,
  keywords text NOT NULL DEFAULT '',
  question text NOT NULL DEFAULT '',
  answer text NOT NULL,
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  escalate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bot_qa ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES bot_qa(id) ON DELETE CASCADE;

-- Flag sesi livechat untuk tab bot/unread/read/resolved.
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS bot_handled boolean NOT NULL DEFAULT false;
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS bot_node_id uuid;
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS visitor_phone varchar(32);ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS unread_count int NOT NULL DEFAULT 0;
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Livechat (per-tenant; company_id dipertahankan agar query existing tetap jalan,
-- diisi dengan company id saat seed/demo-login).
CREATE TABLE IF NOT EXISTS livechat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  visitor_id varchar(64) NOT NULL,
  visitor_name varchar(255),
  visitor_email varchar(255),
  visitor_phone varchar(32),
  assigned_agent_id uuid,
  status varchar(32) NOT NULL DEFAULT 'waiting',
  last_message text,
  last_message_at timestamptz,
  waiting_since timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_livechat_sessions_status ON livechat_sessions(status);

CREATE TABLE IF NOT EXISTS livechat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES livechat_sessions(id) ON DELETE CASCADE,
  direction varchar(16) NOT NULL,
  sender_id uuid,
  sender_name varchar(255),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_livechat_messages_session ON livechat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS livechat_distribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE,
  mode varchar(16) NOT NULL DEFAULT 'manual',
  round_robin_index int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Channels (per-tenant: tanpa company_id; channel_types katalog global di-seed per tenant).
CREATE TABLE IF NOT EXISTS channel_types (
  id varchar(32) PRIMARY KEY,
  name varchar(64) NOT NULL,
  icon varchar(32) NOT NULL,
  color varchar(7) NOT NULL,
  description text,
  config_schema jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  channel_type_id varchar(32) NOT NULL REFERENCES channel_types(id),
  status varchar(16) NOT NULL DEFAULT 'inactive',
  enabled_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_type_id)
);

CREATE TABLE IF NOT EXISTS channel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_channel_id uuid NOT NULL REFERENCES company_channels(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}',
  webhook_url varchar(512),
  webhook_secret varchar(256),
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_channel_configs_cc ON channel_configs(company_channel_id);

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
