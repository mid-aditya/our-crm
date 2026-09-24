-- Multi-channel system: channel types, per-company channel enable/disable, API configs

-- Channel types reference table (master data — tidak berubah per company)
CREATE TABLE IF NOT EXISTS channel_types (
    id VARCHAR(32) PRIMARY KEY,          -- 'wa_official', 'wa_unofficial', 'livechat', 'facebook', 'instagram', 'line', 'shopee', 'telegram'
    name VARCHAR(64) NOT NULL,          -- 'WhatsApp Official', 'WhatsApp Unofficial', dll
    icon VARCHAR(32) NOT NULL,          -- lucide icon name: 'Phone', 'MessageCircle', dll
    color VARCHAR(7) NOT NULL,          -- hex color: '#25D366', '#1877F2', dll
    description TEXT,
    config_schema JSONB NOT NULL DEFAULT '{}',  -- JSON schema describing required config fields per type
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed channel types
INSERT INTO channel_types (id, name, icon, color, description, config_schema) VALUES
('wa_official', 'WhatsApp Official', 'Phone', '#25D366',
 'WhatsApp via Meta Business API (Cloud-hosted). Butuh nomor HP + Meta Business verified.',
 '{"phone_number_id": "string", "whatsapp_business_account_id": "string", "meta_access_token": "string", "meta_phone_number": "string"}'),
('wa_unofficial', 'WhatsApp Unofficial', 'MessageCircle', '#128C7E',
 'WhatsApp via third-party gateway (Ultramsg, Fonnte, WaBlas, dll). Butuh API key gateway.',
 '{"gateway_url": "string", "gateway_token": "string", "gateway_device_id": "string"}'),
('livechat', 'Live Chat (Web)', 'MessageSquare', '#6366F1',
 'Live chat widget di website. Visitor chat langsung ke agent via WebSocket.',
 '{"widget_color": "string", "welcome_message": "string", "company_name": "string"}'),
('facebook', 'Facebook Messenger', 'MessageCircle', '#1877F2',
 'Facebook Page Messenger. Butuh Facebook Page + App dengan Messenger permission.',
 '{"page_id": "string", "page_access_token": "string"}'),
('instagram', 'Instagram DM', 'User', '#E1306C',
 'Instagram Direct Message. Butuh Instagram Professional Account + Facebook App.',
 '{"ig_user_id": "string", "page_access_token": "string"}'),
('line', 'LINE Messaging', 'Hash', '#00B900',
 'LINE Messaging API untuk LINE Official Account.',
 '{"channel_secret": "string", "channel_access_token": "string"}'),
('shopee', 'Shopee Chat', 'ShoppingBag', '#EE4D2D',
 'Live chat Shopee Seller Center via Shopee Open Platform API.',
 '{"shop_id": "string", "partner_id": "string", "shopee_secret_key": "string"}'),
('telegram', 'Telegram Bot', 'Send', '#0088CC',
 'Telegram Bot. Butuh Bot Token dari @BotFather.',
 '{"bot_token": "string", "bot_username": "string"}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    config_schema = EXCLUDED.config_schema;

-- Per-company channel enrollment: which channels a company has enabled
CREATE TABLE IF NOT EXISTS company_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    channel_type_id VARCHAR(32) NOT NULL REFERENCES channel_types(id),
    status VARCHAR(16) NOT NULL DEFAULT 'inactive',  -- active, inactive, error
    enabled_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, channel_type_id)
);
CREATE INDEX IF NOT EXISTS idx_company_channels_company ON company_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_company_channels_type ON company_channels(channel_type_id);

-- Per-company channel API configuration (credential per channel instance)
CREATE TABLE IF NOT EXISTS channel_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_channel_id UUID NOT NULL REFERENCES company_channels(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',   -- channel-specific credentials (encrypted at rest)
    webhook_url VARCHAR(512),
    webhook_secret VARCHAR(256),
    is_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_channel_configs_company_channel ON channel_configs(company_channel_id);

-- Seed demo company with all channels enabled
DO $$
DECLARE
    demo_company_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    cc_id UUID;
BEGIN
    -- Only seed if demo company exists
    IF EXISTS (SELECT 1 FROM companies WHERE id = demo_company_id) THEN
        -- Insert all channel types for demo company
        FOR cc_id IN
            INSERT INTO company_channels (company_id, channel_type_id, status, enabled_at)
            SELECT demo_company_id, ct.id, 'active', now()
            FROM channel_types ct
            ON CONFLICT (company_id, channel_type_id) DO NOTHING
            RETURNING id
        LOOP
            -- Insert default config for each new channel
            INSERT INTO channel_configs (company_channel_id, config, is_default)
            VALUES (cc_id, '{}', true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;
