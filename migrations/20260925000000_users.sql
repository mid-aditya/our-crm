-- Add users table to master DB for demo-login and multi-tenant auth
-- Users belong to companies (master DB level) for demo mode.
-- For full multi-tenant: each tenant DB would have its own users table.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    role_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Demo user for demo-login handler
INSERT INTO users (id, company_id, email, full_name, role_id, status)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID,
    'demo@demo.com',
    'Demo User',
    '00000000-0000-0000-0000-000000000002'::UUID,
    'active'
)
ON CONFLICT (company_id, email) DO NOTHING;
