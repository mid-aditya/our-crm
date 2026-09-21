// Adapter pengiriman WhatsApp: official (Meta Cloud API) & unofficial
// (gateway Baileys via HTTP). Dipilih per channel saat kirim.
export interface SendResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

interface ChannelConfig {
  type?: string;
  phone_number_id?: string;
  access_token?: string;
  gateway_url?: string;
  api_key?: string;
  session?: string;
}

async function sendOfficial(to: string, body: string, cfg: ChannelConfig): Promise<SendResult> {
  if (!cfg.phone_number_id || !cfg.access_token) {
    return { ok: false, error: "Config official belum lengkap (phone_number_id/access_token)" };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, externalId: data.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: `Gateway tidak terjangkau: ${(e as Error).message}` };
  }
}

async function sendUnofficial(to: string, body: string, cfg: ChannelConfig): Promise<SendResult> {
  if (!cfg.gateway_url) {
    return { ok: false, error: "Config unofficial belum lengkap (gateway_url)" };
  }
  try {
    const res = await fetch(`${cfg.gateway_url.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cfg.api_key ? { "X-Api-Key": cfg.api_key } : {}) },
      body: JSON.stringify({ to, message: body, session: cfg.session ?? "default" }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, externalId: data.id };
  } catch (e) {
    return { ok: false, error: `Gateway tidak terjangkau: ${(e as Error).message}` };
  }
}

export async function sendWhatsApp(
  to: string,
  body: string,
  channel: { type: string; config: unknown },
): Promise<SendResult> {
  const cfg = (channel.config ?? {}) as ChannelConfig;
  if (channel.type === "official") return sendOfficial(to, body, cfg);
  return sendUnofficial(to, body, cfg);
}
