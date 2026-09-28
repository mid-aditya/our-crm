-- Kanban + bot QA + flag sesi (untuk master/demo DB; tenant baru via tenant_0001.sql).
CREATE TABLE IF NOT EXISTS kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kanban_card_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    from_column_id UUID,
    to_column_id UUID,
    moved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_card_moves_card ON kanban_card_moves(card_id, created_at);

CREATE TABLE IF NOT EXISTS bot_qa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL DEFAULT '',
    answer TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    escalate BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS bot_handled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS bot_node_id UUID;
ALTER TABLE bot_qa ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES bot_qa(id) ON DELETE CASCADE;
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0;
ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- Jawaban sapaan default.
INSERT INTO bot_qa (keywords, question, answer, position, escalate)
SELECT 'halo,hallo,hai,pagi,siang,sore,malam,hello,hi', 'Salam pembuka',
       'Halo! Selamat datang di layanan kami. Ada yang bisa kami bantu? Ketik "agent" untuk bicara dengan agent.',
       0, false
WHERE NOT EXISTS (SELECT 1 FROM bot_qa);
INSERT INTO bot_qa (keywords, question, answer, position, escalate)
SELECT 'agent,admin,cs,customer service,orang', 'Minta agent',
       'Baik, saya hubungkan ke agent kami. Mohon tunggu sebentar ya.',
       999, true
WHERE NOT EXISTS (SELECT 1 FROM bot_qa WHERE escalate);
