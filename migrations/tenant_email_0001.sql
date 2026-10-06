-- Email module: tables + permissions (idempotent, aman diulang).
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL DEFAULT 'outbound',
  from_addr text NOT NULL DEFAULT '',
  to_addr text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status, created_at DESC);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO permissions ("key", description, module) VALUES
  ('emails.read', 'Lihat email', 'emails'),
  ('emails.create', 'Tulis email', 'emails'),
  ('emails.send', 'Kirim email', 'emails'),
  ('emails.manage_templates', 'Kelola template email', 'emails')
ON CONFLICT ("key") DO NOTHING;

-- Berikan ke semua role kecuali yang eksplisit dibatasi:
-- Owner/Admin/SPV dapat semua; Agent dapat read/create/send.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.key IN ('emails.read','emails.create','emails.send','emails.manage_templates')
  AND r.name IN ('Owner','Admin','SPV','Developer')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.key IN ('emails.read','emails.create','emails.send')
  AND r.name IN ('Agent','Member')
ON CONFLICT DO NOTHING;
