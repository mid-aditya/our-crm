import { api, apiPage } from '$lib/api';

export type SalesStage = {
	id: string;
	name: string;
	probability: number;
	position: number;
	is_won: boolean;
	is_lost: boolean;
	active: boolean;
};

export type Deal = {
	id: string;
	number: string;
	title: string;
	contact_id: string | null;
	contact_name: string | null;
	value: number;
	stage_id: string | null;
	stage_name: string | null;
	probability: number;
	is_won?: boolean;
	is_lost?: boolean;
	owner_id: string | null;
	owner_name: string | null;
	expected_close: string | null;
	notes: string | null;
	lost_reason: string | null;
	created_at: string;
};

export type DealMove = {
	id: string;
	from: string | null;
	to: string | null;
	by: string | null;
	created_at: string;
};

export type SalesSummaryRow = {
	stage_id: string;
	stage: string;
	probability: number;
	is_won: boolean;
	is_lost: boolean;
	count: number;
	value: number;
};

export async function getStages(): Promise<SalesStage[]> {
	const res = await api<SalesStage[]>('/sales-stages');
	return Array.isArray(res) ? res : [];
}

export async function getDeals(stageId?: string): Promise<Deal[]> {
	const q = stageId ? `?stage=${stageId}` : '';
	const res = await apiPage<Deal[]>(`/deals${q}`);
	return res.data ?? [];
}

export async function createDeal(input: {
	title: string;
	contact_id?: string;
	value?: number;
	stage_id?: string;
	owner_id?: string;
	expected_close?: string;
	notes?: string;
}): Promise<{ id: string; number: string }> {
	return api<{ id: string; number: string }>('/deals', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function getDealDetail(id: string): Promise<{ deal: Deal; moves: DealMove[] }> {
	const res = await api<{ data: Deal; meta: { moves: DealMove[] } }>(`/deals/${id}`);
	return { deal: res.data, moves: res.meta?.moves ?? [] };
}

export async function updateDeal(
	id: string,
	input: Partial<{ title: string; value: number; stage_id: string; owner_id: string | null; contact_id: string | null; expected_close: string | null; notes: string; lost_reason: string }>
): Promise<void> {
	await api(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteDeal(id: string): Promise<void> {
	await api(`/deals/${id}`, { method: 'DELETE' });
}

export async function getSalesSummary(): Promise<SalesSummaryRow[]> {
	const res = await api<SalesSummaryRow[]>('/sales-summary');
	return Array.isArray(res) ? res : [];
}

export function formatIDR(n: number): string {
	try {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0);
	} catch {
		return `Rp${n ?? 0}`;
	}
}
