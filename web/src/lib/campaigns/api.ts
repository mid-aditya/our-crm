import { api, apiPage } from '$lib/api';

export type CampaignStatus = 'draft' | 'sending' | 'done' | 'scheduled' | 'failed' | string;

export type CampaignAudience = {
	tags?: string[];
	source?: string;
};

export type Campaign = {
	id: string;
	name: string;
	channel_id: string;
	template: string;
	audience: CampaignAudience | null;
	scheduled_at: string | null;
	status: CampaignStatus;
	stats: { sent?: number; failed?: number; total?: number } | null;
	created_at?: string;
};

export type CampaignChannel = {
	id: string;
	name: string;
	type: 'official' | 'unofficial';
	ready: boolean;
	status?: string;
};

export type AudienceMeta = {
	total: number;
	with_phone: number;
	sources: string[];
	tags: string[];
};

export type PreviewSample = {
	name: string;
	phone: string;
	vars: Record<string, string>;
	rendered: string;
};

export type PreviewResult = {
	total: number;
	samples: PreviewSample[];
	unknown_vars: string[];
};

export async function getCampaigns(): Promise<Campaign[]> {
	const res = await apiPage<Campaign[]>('/campaigns?limit=100');
	return res.data ?? [];
}

export async function getCampaignChannels(): Promise<CampaignChannel[]> {
	const res = await api<CampaignChannel[]>('/campaigns/channels');
	return Array.isArray(res) ? res : [];
}

export async function getAudienceMeta(): Promise<AudienceMeta> {
	return api<AudienceMeta>('/campaigns/audience');
}

export async function previewDraft(
	template: string,
	audience: CampaignAudience
): Promise<PreviewResult> {
	return api<PreviewResult>('/campaigns/preview', {
		method: 'POST',
		body: JSON.stringify({ template, audience })
	});
}

export async function createCampaign(input: {
	name: string;
	channel_id: string;
	template: string;
	audience: CampaignAudience;
}): Promise<{ id: string }> {
	return api<{ id: string }>('/campaigns', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function previewCampaign(id: string): Promise<{ total: number; sample: string }> {
	return api<{ total: number; sample: string }>(`/campaigns/${id}/preview`);
}

export async function launchCampaign(id: string): Promise<{ id: string; status: string }> {
	return api<{ id: string; status: string }>(`/campaigns/${id}/launch`, { method: 'POST' });
}

export async function deleteCampaign(id: string): Promise<void> {
	await api(`/campaigns/${id}`, { method: 'DELETE' });
}
