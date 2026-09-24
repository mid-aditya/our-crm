import { api } from '$lib/api';

export type LivechatSession = {
	id: string;
	visitor_id: string;
	visitor_name: string | null;
	visitor_email: string | null;
	assigned_agent_id: string | null;
	assigned_agent_name: string | null;
	status: 'waiting' | 'assigned' | 'resolved';
	last_message: string | null;
	last_message_at: string | null;
	waiting_since: string;
};

export type LivechatMessage = {
	id: string;
	direction: 'inbound' | 'outbound';
	sender_id: string | null;
	sender_name: string | null;
	body: string;
	created_at: string;
};

export type Agent = {
	id: string;
	full_name: string;
	email: string;
	active_sessions: number;
};

const BASE = '/api/v1/livechat';

export async function getQueue(companyId: string): Promise<LivechatSession[]> {
	return api<LivechatSession[]>(`${BASE}/queue?company_id=${companyId}`);
}

export async function getSession(id: string): Promise<LivechatSession> {
	return api<LivechatSession>(`${BASE}/sessions/${id}`);
}

export async function getMessages(sessionId: string): Promise<LivechatMessage[]> {
	return api<LivechatMessage[]>(`${BASE}/sessions/${sessionId}/messages`);
}

export async function sendMessage(sessionId: string, body: string): Promise<LivechatMessage> {
	return api<LivechatMessage>(`${BASE}/sessions/${sessionId}/messages`, {
		method: 'POST',
		body: JSON.stringify({ body, direction: 'outbound' })
	});
}

export async function takeSession(sessionId: string): Promise<LivechatSession> {
	return api<LivechatSession>(`${BASE}/sessions/${sessionId}/take`, { method: 'POST' });
}

export async function assignSession(sessionId: string, agentId: string): Promise<LivechatSession> {
	return api<LivechatSession>(`${BASE}/sessions/${sessionId}/assign`, {
		method: 'POST',
		body: JSON.stringify({ agent_id: agentId })
	});
}

export async function resolveSession(sessionId: string): Promise<LivechatSession> {
	return api<LivechatSession>(`${BASE}/sessions/${sessionId}/resolve`, { method: 'POST' });
}

export async function getDistribution(companyId: string): Promise<{ mode: 'manual' | 'auto' }> {
	return api<{ mode: 'manual' | 'auto' }>(`${BASE}/distribution?company_id=${companyId}`);
}

export async function setDistribution(
	companyId: string,
	mode: 'manual' | 'auto'
): Promise<{ mode: 'manual' | 'auto' }> {
	return api<{ mode: 'manual' | 'auto' }>(`${BASE}/distribution`, {
		method: 'POST',
		body: JSON.stringify({ mode, company_id: companyId })
	});
}

export async function getAgents(companyId: string): Promise<Agent[]> {
	return api<Agent[]>(`${BASE}/agents?company_id=${companyId}`);
}
