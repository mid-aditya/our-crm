-- RBAC tables di master DB: demo company memakai master sebagai tenant pool
-- (db_name='crm_master'), sehingga AgentsHandler & autoAssignAgent yang join
-- roles/role_permissions/permissions gagal tanpa tabel ini.
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "key" VARCHAR(128) NOT NULL UNIQUE,
    description TEXT,
    module TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);
