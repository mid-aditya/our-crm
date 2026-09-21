-- Tenant DB 0003: modul CRM (WhatsApp channels, conversations, blasting, tickets).
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
CREATE INDEX IF NOT EXISTS idx_conv_agent ON conversations(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;

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
