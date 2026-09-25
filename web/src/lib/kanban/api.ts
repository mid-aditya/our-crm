import { api } from '$lib/api';

export type BoardSummary = {
	id: string;
	name: string;
	columns: number;
	cards: number;
	updated_at: string;
};

export type KanbanCard = {
	id: string;
	title: string;
	description: string | null;
	assignee_id: string | null;
	assignee_name: string | null;
	position: number;
	updated_at: string;
};

export type KanbanColumn = { id: string; name: string; position: number; cards: KanbanCard[] };

export type BoardDetail = { id: string; name: string; columns: KanbanColumn[] };

export type CardMove = {
	id: string;
	from: string | null;
	to: string | null;
	moved_by: string | null;
	created_at: string;
};

export async function getBoards(): Promise<BoardSummary[]> {
	const res = await api<BoardSummary[]>('/kanban/boards');
	return Array.isArray(res) ? res : [];
}

export async function createBoard(name: string): Promise<{ id: string }> {
	return api<{ id: string }>('/kanban/boards', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function getBoard(id: string): Promise<BoardDetail> {
	return api<BoardDetail>(`/kanban/boards/${id}`);
}

export async function deleteBoard(id: string): Promise<void> {
	await api(`/kanban/boards/${id}`, { method: 'DELETE' });
}

export async function createColumn(boardId: string, name: string): Promise<{ id: string }> {
	return api<{ id: string }>(`/kanban/boards/${boardId}/columns`, {
		method: 'POST',
		body: JSON.stringify({ name })
	});
}

export async function deleteColumn(id: string): Promise<void> {
	await api(`/kanban/columns/${id}`, { method: 'DELETE' });
}

export async function createCard(input: {
	column_id: string;
	title: string;
	description?: string;
}): Promise<{ id: string }> {
	return api<{ id: string }>('/kanban/cards', { method: 'POST', body: JSON.stringify(input) });
}

export async function moveCard(id: string, toColumnId: string, position?: number): Promise<void> {
	await api(`/kanban/cards/${id}/move`, {
		method: 'POST',
		body: JSON.stringify({ to_column_id: toColumnId, position })
	});
}

export async function deleteCard(id: string): Promise<void> {
	await api(`/kanban/cards/${id}`, { method: 'DELETE' });
}

export async function getCardMoves(id: string): Promise<CardMove[]> {
	const res = await api<CardMove[]>(`/kanban/cards/${id}/moves`);
	return Array.isArray(res) ? res : [];
}
