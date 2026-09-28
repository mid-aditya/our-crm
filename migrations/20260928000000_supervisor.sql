-- Supervisor mapping + level role (untuk master/demo DB; tenant baru via tenant_0001.sql).
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0;
