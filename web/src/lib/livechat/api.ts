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
	visitorEmail?: string
): Promise<VisitorSession> {
	const res = await fetch(
		`${BASE}/api/v1/livechat/sessions?company_id=${encodeURIComponent(companyId)}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ visitor_id: visitorId, visitor_name: visitorName, visitor_email: visitorEmail })
		}
	);
	if (!res.ok) throw new Error('Failed to create session');
	return res.json();
}

export async function getSessionMessages(sessionId: string): Promise<any[]> {
	const res = await fetch(`${BASE}/api/v1/livechat/sessions/${sessionId}/messages`);
	if (!res.ok) return [];
	return res.json();
}

export function wsUrl(sessionId: string, companyId: string): string {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${window.location.host}/ws/livechat?session_id=${sessionId}&company_id=${companyId}&role=visitor`;
}
