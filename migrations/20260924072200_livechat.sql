-- Companies table (required by livechat)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert demo company (used by livechat widget)
INSERT INTO companies (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Demo Company', 'demo')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS livechat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64) NOT NULL,
    visitor_name VARCHAR(255),
    visitor_email VARCHAR(255),
    assigned_agent_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'waiting', -- waiting, assigned, resolved
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    waiting_since TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, visitor_id)
);
CREATE INDEX IF NOT EXISTS livechat_sessions_company_status_idx ON livechat_sessions(company_id, status);

CREATE TABLE IF NOT EXISTS livechat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES livechat_sessions(id) ON DELETE CASCADE,
    direction VARCHAR(16) NOT NULL, -- inbound (from visitor), outbound (from agent)
    sender_id UUID, -- agent_id for outbound, NULL for visitor
    sender_name VARCHAR(255),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS livechat_messages_session_created_idx ON livechat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS livechat_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    mode VARCHAR(16) NOT NULL DEFAULT 'manual', -- manual, auto
    round_robin_index INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default distribution for demo company
INSERT INTO livechat_distribution (company_id, mode)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'auto')
ON CONFLICT (company_id) DO NOTHING;
