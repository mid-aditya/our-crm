import { api, apiPage } from '$lib/api';

export type Conversation = {
	id: string;
	channel_id: string | null;
	contact_id: string | null;
	assigned_agent_id: string | null;
	status: string;
	last_message_at: string | null;
	awaiting_since: string | null;
	created_at: string;
};

export type ConvMessage = {
	id: string;
	direction: 'inbound' | 'outbound';
	sender_id: string | null;
	body: string;
	media_url: string | null;
	status: string;
	external_id: string | null;
	created_at: string;
};

export type Contact = {
	id: string;
	full_name: string;
	email: string | null;
	phone: string | null;
	company_name: string | null;
	source: string | null;
	tags?: string[];
};

export type Ticket = {
	id: string;
	number: string;
	subject: string;
	description: string | null;
	contact_id: string | null;
	assignee_id: string | null;
	priority: 'low' | 'medium' | 'urgent';
	status: 'open' | 'pending' | 'resolved' | 'closed';
	source: string;
	resolved_at: string | null;
	created_at: string;
	custom_values?: Record<string, string>;
};

export type TicketReply = {
	id: string;
	author_id: string | null;
	author_type: string;
	body: string;
	created_at: string;
};

export async function getConversations(): Promise<Conversation[]> {
	const res = await apiPage<Conversation[]>('/conversations');
	return res.data ?? [];
}

export async function getConvMessages(id: string): Promise<ConvMessage[]> {
	const res = await api<ConvMessage[]>(`/conversations/${id}/messages`);
	return Array.isArray(res) ? res : [];
}

export async function replyConversation(id: string, body: string): Promise<void> {
	await api(`/conversations/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) });
}

export async function searchContacts(q: string): Promise<Contact[]> {
	const res = await apiPage<Contact[]>(`/contacts?search=${encodeURIComponent(q)}`);
	return res.data ?? [];
}

export async function getContact(id: string): Promise<Contact> {
	return api<Contact>(`/contacts/${id}`);
}

export async function createContact(input: {
	full_name: string;
	phone?: string;
	email?: string;
	company_name?: string;
	source?: string;
}): Promise<{ id: string }> {
	return api<{ id: string }>('/contacts', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateContact(id: string, input: Record<string, string>): Promise<void> {
	await api(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getTickets(): Promise<Ticket[]> {
	const res = await apiPage<Ticket[]>('/tickets');
	return res.data ?? [];
}

export async function createTicket(input: {
	subject: string;
	description?: string;
	contact_id?: string;
	priority?: string;
	assignee_id?: string;
	custom_fields?: Record<string, string>;
}): Promise<{ id: string; number: string }> {
	return api<{ id: string; number: string }>('/tickets', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function getTicketDetail(id: string): Promise<{ ticket: Ticket; replies: TicketReply[] }> {
	// Backend: {"data": {...ticket, custom_values}, "meta": {"replies": [...]}} — parse mentah.
	const headers = new Headers({ 'Content-Type': 'application/json' });
	const { getToken } = await import('$lib/api');
	const token = getToken();
	if (token) headers.set('Authorization', `Bearer ${token}`);
	const res = await fetch(`/api/v1/tickets/${id}`, { headers });
	const raw = await res.json();
	if (!res.ok) {
		const e = (raw as any)?.error;
		throw new Error(typeof e === 'string' ? e : e?.message || 'Gagal memuat tiket');
	}
	const data = (raw as any)?.data ?? raw;
	return {
		ticket: data as Ticket,
		replies: (((raw as any)?.meta?.replies ?? []) as TicketReply[])
	};
}

export async function replyTicket(id: string, body: string): Promise<void> {
	await api(`/tickets/${id}/replies`, { method: 'POST', body: JSON.stringify({ body }) });
}

export async function updateTicket(
	id: string,
	input: { status?: string; priority?: string; assignee_id?: string | null }
): Promise<void> {
	await api(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export type Assignee = { id: string; full_name: string; role: string };

export async function getAssignees(): Promise<Assignee[]> {
	const res = await api<Assignee[]>('/team/assignees');
	return Array.isArray(res) ? res : [];
}

export function maskEmail(email: string | null): string {
	if (!email) return '—';
	const [user, domain] = email.split('@');
	if (!domain) return '•••';
	const head = user.slice(0, 2);
	return `${head}•••@${domain}`;
}

export function maskPhone(phone: string | null): string {
	if (!phone) return '—';
	if (phone.length <= 4) return '•••';
	return `${phone.slice(0, 3)}••••${phone.slice(-2)}`;
}
