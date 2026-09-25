import { api, apiPage } from '$lib/api';

export type HourRow = {
	day_of_week: number;
	open_time: string | null;
	close_time: string | null;
	is_closed: boolean;
};

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Nama hari sesuai locale aktif (id/en). Dipakai settings jam operasional.
export function dayName(index: number, locale: string | null | undefined): string {
	const id = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
	const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return ((locale ?? '').startsWith('en') ? en : id)[index] ?? '';
}

export async function getHours(): Promise<HourRow[]> {
	const res = await api<HourRow[]>('/settings/operational-hours');
	return Array.isArray(res) ? res : [];
}

export async function putHours(hours: HourRow[]): Promise<void> {
	await api('/settings/operational-hours', { method: 'PUT', body: JSON.stringify({ hours }) });
}

export type Presence = { status: 'online' | 'aux' | 'break' | 'offline'; aux_label: string | null };

export async function getMyPresence(): Promise<Presence> {
	return api<Presence>('/livechat/presence');
}

export async function setMyPresence(status: string, auxLabel?: string): Promise<void> {
	await api('/livechat/presence', {
		method: 'PUT',
		body: JSON.stringify({ status, aux_label: auxLabel ?? null })
	});
}

export type PresenceRow = { user_id: string; full_name: string; status: string; aux_label: string | null };

export async function getPresences(): Promise<PresenceRow[]> {
	const res = await api<PresenceRow[]>('/livechat/presences');
	return Array.isArray(res) ? res : [];
}

export type LeaveType = { id: string; name: string; active: boolean };

export async function getLeaveTypes(): Promise<LeaveType[]> {
	const res = await api<LeaveType[]>('/leave-types');
	return Array.isArray(res) ? res : [];
}

export async function addLeaveType(name: string): Promise<void> {
	await api('/leave-types', { method: 'POST', body: JSON.stringify({ name }) });
}

export type LeaveRequest = {
	id: string;
	user_id: string;
	full_name: string;
	leave_type: string | null;
	start_date: string;
	end_date: string;
	reason: string | null;
	status: 'pending' | 'approved' | 'rejected';
	decided_at: string | null;
};

export async function getMyLeaves(): Promise<LeaveRequest[]> {
	const res = await api<LeaveRequest[]>('/leaves');
	return Array.isArray(res) ? res : [];
}

export async function getAllLeaves(): Promise<LeaveRequest[]> {
	const res = await api<LeaveRequest[]>('/leaves/all');
	return Array.isArray(res) ? res : [];
}

export async function requestLeave(input: {
	leave_type_id: string;
	start_date: string;
	end_date: string;
	reason?: string;
}): Promise<void> {
	await api('/leaves', { method: 'POST', body: JSON.stringify(input) });
}

export async function approveLeave(id: string, status: 'approved' | 'rejected'): Promise<void> {
	await api(`/leaves/${id}/approve`, { method: 'POST', body: JSON.stringify({ status }) });
}

export async function checkIn(): Promise<void> {
	await api('/attendance/check-in', { method: 'POST' });
}

export async function checkOut(): Promise<void> {
	await api('/attendance/check-out', { method: 'POST' });
}

export type AttendanceRow = {
	user_id?: string;
	full_name?: string;
	date: string;
	check_in: string | null;
	check_out: string | null;
	status: string;
};

export async function getMyAttendance(): Promise<AttendanceRow[]> {
	const res = await api<AttendanceRow[]>('/attendance/mine');
	return Array.isArray(res) ? res : [];
}

export async function getTeamAttendance(date?: string): Promise<AttendanceRow[]> {
	const q = date ? `?all=1&date=${date}` : '?all=1';
	const res = await api<AttendanceRow[]>(`/attendance${q}`);
	return Array.isArray(res) ? res : [];
}

export type MemberStats = {
	assigned_chats: number;
	resolved_chats: number;
	messages_sent: number;
	tickets_open: number;
	tickets_done: number;
	ticket_replies: number;
};

export type TeamMember = { user_id: string; full_name: string; role: string; stats: MemberStats };

export type RecentActivity = {
	user_name: string;
	role_name: string;
	method: string;
	path: string;
	status_code: number;
	created_at: string;
};

export type DashboardSummary = {
	scope_role: string;
	scope_level: number;
	totals: MemberStats;
	members: TeamMember[];
	recent: RecentActivity[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
	const res = await api<DashboardSummary>('/dashboard/summary');
	return {
		scope_role: res.scope_role ?? '',
		scope_level: res.scope_level ?? 0,
		totals: res.totals ?? {
			assigned_chats: 0, resolved_chats: 0, messages_sent: 0,
			tickets_open: 0, tickets_done: 0, ticket_replies: 0
		},
		members: res.members ?? [],
		recent: res.recent ?? []
	};
}

export async function setSupervisor(userId: string, supervisorId: string | null): Promise<void> {
	await api(`/users/${userId}/supervisor`, {
		method: 'PUT',
		body: JSON.stringify({ supervisor_id: supervisorId })
	});
}

export type ActivityRow = {
	id: string;
	user_id: string | null;
	user_name: string | null;
	role_name: string | null;
	method: string;
	path: string;
	status_code: number;
	ip: string | null;
	created_at: string;
};

export async function getActivityLogs(): Promise<ActivityRow[]> {
	const res = await apiPage<ActivityRow[]>('/activity-logs');
	return res.data ?? [];
}

export type BotQA = {
	id: string;
	keywords: string;
	question: string;
	answer: string;
	position: number;
	active: boolean;
	escalate: boolean;
};

export async function getBotQA(): Promise<BotQA[]> {
	const res = await api<BotQA[]>('/bot-qa');
	return Array.isArray(res) ? res : [];
}

export async function createBotQA(input: {
	keywords: string;
	question: string;
	answer: string;
	escalate?: boolean;
}): Promise<void> {
	await api('/bot-qa', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateBotQA(id: string, input: Partial<BotQA>): Promise<void> {
	await api(`/bot-qa/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteBotQA(id: string): Promise<void> {
	await api(`/bot-qa/${id}`, { method: 'DELETE' });
}

export type TicketField = {
	id: string;
	field_key: string;
	label: string;
	field_type: 'text' | 'textarea' | 'number' | 'date' | 'select';
	required: boolean;
	options: string[];
	position: number;
	active: boolean;
};

export async function getTicketFields(): Promise<TicketField[]> {
	const res = await api<TicketField[]>('/ticket-fields');
	return Array.isArray(res) ? res : [];
}

export async function createTicketField(input: {
	field_key?: string;
	label: string;
	field_type: string;
	required?: boolean;
	options?: string[];
}): Promise<void> {
	await api('/ticket-fields', { method: 'POST', body: JSON.stringify(input) });
}

export async function deleteTicketField(id: string): Promise<void> {
	await api(`/ticket-fields/${id}`, { method: 'DELETE' });
}

export async function getSchemaVersion(): Promise<{ version: string }[]> {
	const res = await api<{ version: string }[]>('/company/schema-version');
	return Array.isArray(res) ? res : [];
}
