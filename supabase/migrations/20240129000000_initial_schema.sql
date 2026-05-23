-- Full CRM Schema with RLS
-- Run this in Supabase SQL Editor

-- ─── ENUMS ───
do $$ begin
  create type user_role as enum ('owner', 'admin', 'sales', 'support');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type deal_stage as enum ('chat_masuk', 'tertarik', 'ditawar', 'deal', 'batal');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'urgent');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type message_direction as enum ('inbound', 'outbound');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type message_channel as enum ('whatsapp', 'email', 'sms');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type message_status as enum ('sent', 'delivered', 'read', 'failed');
exception
  when duplicate_object then null;
end $$;

-- ─── TEAMS ───
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_business_id text,
  settings jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── PROFILES (extends auth.users) ───
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  role user_role default 'sales',
  team_id uuid references teams(id),
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, team_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '00000000-0000-0000-0000-000000000001'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CONTACTS ───
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  name text not null,
  whatsapp_number text,
  email text,
  label text[],
  source text,
  notes text,
  last_activity_at timestamptz,
  created_at timestamptz default now(),
  unique(team_id, whatsapp_number)
);

-- ─── DEALS ───
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  contact_id uuid references contacts(id) on delete set null,
  title text not null,
  value numeric default 0,
  currency text default 'IDR',
  stage deal_stage default 'chat_masuk',
  assigned_to uuid references profiles(id),
  reminder_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now()
);

-- ─── TASKS ───
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  title text not null,
  description text,
  priority task_priority default 'medium',
  status task_status default 'todo',
  due_date timestamptz,
  assigned_to uuid references profiles(id),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ─── CAMPAIGNS ───
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  name text not null,
  channel text default 'whatsapp',
  message_template text,
  audience_filter jsonb,
  scheduled_at timestamptz,
  status text default 'draft',
  stats jsonb default '{"sent": 0, "delivered": 0, "failed": 0, "replied": 0}',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ─── MESSAGES ───
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  contact_id uuid references contacts(id) on delete set null,
  direction message_direction not null,
  channel message_channel default 'whatsapp',
  content text not null,
  media_url text[],
  status message_status default 'sent',
  external_message_id text,
  created_at timestamptz default now()
);

-- ─── ACTIVITY_LOGS ───
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- ─── SETTINGS ───
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- ─── INDEXES ───
create index if not exists idx_contacts_team on contacts(team_id);
create index if not exists idx_contacts_wa on contacts(whatsapp_number) where whatsapp_number is not null;
create index if not exists idx_deals_pipeline on deals(team_id, stage);
create index if not exists idx_tasks_due on tasks(team_id, due_date) where status != 'done';
create index if not exists idx_tasks_assigned on tasks(assigned_to) where assigned_to is not null;
create index if not exists idx_messages_contact on messages(contact_id, created_at desc);
create index if not exists idx_activity_team on activity_logs(team_id, created_at desc);

-- ─── ROW LEVEL SECURITY ───
alter table profiles enable row level security;
alter table teams enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table campaigns enable row level security;
alter table messages enable row level security;
alter table activity_logs enable row level security;
alter table settings enable row level security;

-- Profiles: user can read/update their own
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Teams: members of team can read
create policy "Team members can read their team"
  on teams for select
  using (id in (select team_id from profiles where id = auth.uid()));

create policy "Admins can update team"
  on teams for update
  using (id in (select team_id from profiles where id = auth.uid() and role in ('owner', 'admin')));

-- Contacts: team isolation
create policy "Team isolation on contacts"
  on contacts for all
  using (team_id in (select team_id from profiles where id = auth.uid()));

-- Deals: team isolation
create policy "Team isolation on deals"
  on deals for all
  using (team_id in (select team_id from profiles where id = auth.uid()));

-- Tasks: team isolation
create policy "Team isolation on tasks"
  on tasks for all
  using (team_id in (select team_id from profiles where id = auth.uid()));

-- Campaigns: team isolation
create policy "Team isolation on campaigns"
  on campaigns for all
  using (team_id in (select team_id from profiles where id = auth.uid()));

-- Messages: team isolation
create policy "Team isolation on messages"
  on messages for all
  using (team_id in (select team_id from profiles where id = auth.uid()));

-- Activity logs: team isolation
create policy "Team isolation on activity_logs"
  on activity_logs for select
  using (team_id in (select team_id from profiles where id = auth.uid()));

create policy "Team members can insert activity_logs"
  on activity_logs for insert
  with check (team_id in (select team_id from profiles where id = auth.uid()));

-- Settings: team isolation
create policy "Team isolation on settings"
  on settings for select
  using (true); -- Public for now, can restrict per team later

-- ─── SEED DATA ───
-- Create default team
insert into teams (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Default Team')
on conflict do nothing;

-- Insert pipeline stages
insert into settings (key, value) values
  ('pipeline_stages', '["chat_masuk", "tertarik", "ditawar", "deal", "batal"]'::jsonb),
  ('contact_labels', '["Hot", "Warm", "Cold", "VIP", "Customer", "Follow Up"]'::jsonb)
on conflict (key) do nothing;
