-- Create Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'sales');

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  label TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members / Roles
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Links to auth.users if using Supabase Auth
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'sales',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deals Pipeline
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value DECIMAL(15,2) DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'chat_masuk',
  reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks / Ticketing
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES team_members(id), -- Member who performs
  pic_id UUID REFERENCES team_members(id),         -- Member in charge
  description TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial Settings Data
INSERT INTO settings (key, value) VALUES 
('pipeline_stages', '["chat_masuk", "tertarik", "ditawar", "deal", "batal"]'::jsonb),
('contact_labels', '["New", "Follow Up", "Hot", "Cold", "Archived"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Initial Team Members
INSERT INTO team_members (id, name, email, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@ourcrm.com', 'owner'),
('00000000-0000-0000-0000-000000000002', 'Sales Representative', 'sales@ourcrm.com', 'sales')
ON CONFLICT (id) DO NOTHING;

-- Initial Contacts
INSERT INTO contacts (id, name, whatsapp_number, email, label, notes) VALUES 
('11111111-1111-1111-1111-111111111111', 'John Doe', '628123456789', 'john@example.com', 'Hot', 'Interested in premium plan'),
('11111111-1111-1111-1111-111111111112', 'Jane Smith', '628987654321', 'jane@example.com', 'New', 'Needs follow up next week')
ON CONFLICT (id) DO NOTHING;

-- Initial Deals
INSERT INTO deals (id, contact_id, title, value, stage) VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Premium Subscription Setup', 1500000.00, 'tertarik'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111112', 'Basic Plan Inquiry', 500000.00, 'chat_masuk')
ON CONFLICT (id) DO NOTHING;

-- Initial Tasks
INSERT INTO tasks (id, contact_id, deal_id, practitioner_id, pic_id, description, due_date, status) VALUES 
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Send contract draft', NOW() + INTERVAL '1 day', 'pending'),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Call for introduction', NOW() + INTERVAL '3 days', 'pending')
ON CONFLICT (id) DO NOTHING;
