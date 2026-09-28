// Visitor-facing livechat API client
// Base URL configurable — default to current origin for embedded widget
const BASE = (typeof window !== 'undefined' ? window.location.origin : '');

export type VisitorSession = {
	id: string;
	company_id: string;
	visitor_id: string;
	status: 'waiting' | 'assigned' | 'resolved';
	assigned_agent_name?: string;
	ws_url?: string;
};

export async function createSession(
	companyId: string,
	visitorId: string,
	visitorName?: string,
	visitorEmail?: string,
	visitorPhone?: string
): Promise<VisitorSession> {
	const res = await fetch(
		`${BASE}/api/v1/livechat/sessions?company_id=${encodeURIComponent(companyId)}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ visitor_id: visitorId, visitor_name: visitorName, visitor_email: visitorEmail, visitor_phone: visitorPhone })
		}
	);
	if (!res.ok) {
		const raw = await res.json().catch(() => null);
		const e = (raw as any)?.error;
		const msg = typeof e === 'string' ? e : e?.message || 'Failed to create session';
		throw new Error(msg);
	}
	const raw = await res.json();
	// Backend Go: envelope {"data": {...}}
	return ((raw as any)?.data ?? raw) as VisitorSession;
}

export async function getSessionMessages(sessionId: string, companyId?: string): Promise<any[]> {
	const q = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
	const res = await fetch(`${BASE}/api/v1/livechat/sessions/${sessionId}/messages${q}`);
	if (!res.ok) return [];
	const raw = await res.json().catch(() => null);
	// WritePage → {"data": [...], "meta": {...}} ; fallback langsung array
	const data = (raw as any)?.data ?? raw;
	return Array.isArray(data) ? data : [];
}

export function wsUrl(sessionId: string, companyId: string): string {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${window.location.host}/ws/livechat?session_id=${sessionId}&company_id=${companyId}&role=visitor`;
}
