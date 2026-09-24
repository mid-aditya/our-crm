import { api } from '$lib/api';

export type ChannelType = {
	id: string;
	name: string;
	icon: string;
	color: string;
	description: string;
	config_schema: Record<string, { type: string; description?: string }>;
};

export type CompanyChannel = {
	id: string;
	channel_type_id: string;
	status: 'active' | 'inactive' | 'error';
	enabled_at: string | null;
	last_error: string | null;
	name: string;
	icon: string;
	color: string;
	has_config: boolean;
};

export type ChannelConfig = {
	id: string;
	config: Record<string, string>;
	webhook_url: string | null;
	is_default: boolean;
	created_at: string;
};

export type ChannelDetail = {
	id: string;
	company_id: string;
	channel_type_id: string;
	status: string;
	enabled_at: string | null;
	last_error: string | null;
	channel_type: {
		name: string;
		icon: string;
		color: string;
		description: string;
		config_schema: Record<string, { type: string; description?: string }>;
	};
	configs: ChannelConfig[];
};

// List all available channel types
export async function getChannelTypes(): Promise<ChannelType[]> {
	return api<ChannelType[]>('/channel-types');
}

// List enabled channels for current company
export async function getCompanyChannels(): Promise<CompanyChannel[]> {
	return api<CompanyChannel[]>('/company/channels');
}

// Get single channel detail
export async function getCompanyChannel(typeId: string): Promise<ChannelDetail> {
	return api<ChannelDetail>(`/company/channels/${typeId}`);
}

// Enable a channel for current company
export async function enableChannel(typeId: string): Promise<{ id: string; status: string }> {
	return api<{ id: string; status: string }>('/company/channels', {
		method: 'POST',
		body: JSON.stringify({ channel_type_id: typeId })
	});
}

// Disable a channel
export async function disableChannel(typeId: string): Promise<void> {
	await api(`/company/channels/${typeId}`, { method: 'DELETE' });
}

// Save channel config
export async function saveChannelConfig(
	typeId: string,
	config: Record<string, string>,
	webhookUrl?: string,
	webhookSecret?: string
): Promise<{ id: string; status: string }> {
	return api<{ id: string; status: string }>(`/company/channels/${typeId}/configs`, {
		method: 'POST',
		body: JSON.stringify({ config, webhook_url: webhookUrl, webhook_secret: webhookSecret })
	});
}

// Admin: list companies
export type AdminCompany = {
	id: string;
	name: string;
	slug: string;
	status: string;
	plan_id: string | null;
	user_count: number;
	created_at: string;
	updated_at: string;
};

export async function getCompanies(params?: { status?: string; search?: string; page?: number }): Promise<{ data: AdminCompany[]; meta: { total: number; limit: number; offset: number } }> {
	const qs = new URLSearchParams();
	if (params?.status) qs.set('status', params.status);
	if (params?.search) qs.set('search', params.search);
	if (params?.page) qs.set('page', String(params.page));
	const query = qs.toString() ? `?${qs.toString()}` : '';
	return api(`/admin/companies${query}`);
}

export async function getCompany(id: string): Promise<AdminCompany> {
	return api<AdminCompany>(`/admin/companies/${id}`);
}

export async function createCompany(name: string, slug: string): Promise<AdminCompany> {
	return api<AdminCompany>('/admin/companies', {
		method: 'POST',
		body: JSON.stringify({ name, slug })
	});
}

export async function updateCompany(id: string, data: { name?: string; status?: string }): Promise<void> {
	await api(`/admin/companies/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteCompany(id: string): Promise<void> {
	await api(`/admin/companies/${id}`, { method: 'DELETE' });
}
