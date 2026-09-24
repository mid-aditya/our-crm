import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const BASE = '/api/v1';
const TOKEN_KEY = 'crm.token';
const COMPANY_KEY = 'crm.company_id';

export class ApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

// Reactive token store — syncs with localStorage
export const tokenStore = writable<string | null>(
	browser ? localStorage.getItem(TOKEN_KEY) : null
);

// Reactive company_id store
export const companyIdStore = writable<string | null>(
	browser ? localStorage.getItem(COMPANY_KEY) : null
);

export function getToken(): string | null {
	let val: string | null = null;
	tokenStore.subscribe((v) => (val = v))();
	return val;
}

export function getCompanyId(): string | null {
	let val: string | null = null;
	companyIdStore.subscribe((v) => (val = v))();
	return val;
}

export function setToken(token: string | null) {
	if (!browser) return;
	if (token) localStorage.setItem(TOKEN_KEY, token);
	else localStorage.removeItem(TOKEN_KEY);
	tokenStore.set(token);
}

export function setCompanyId(id: string | null) {
	if (!browser) return;
	if (id) localStorage.setItem(COMPANY_KEY, id);
	else localStorage.removeItem(COMPANY_KEY);
	companyIdStore.set(id);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const headers = new Headers(options.headers);
	if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	let token: string | null = null;
	tokenStore.subscribe((v) => (token = v))();
	if (token) headers.set('Authorization', `Bearer ${token}`);

	const res = await fetch(`${BASE}${path}`, { ...options, headers });
	const data = res.status === 204 ? null : await res.json().catch(() => null);

	if (!res.ok) {
		const message =
			data && typeof data === 'object' && 'error' in data
				? String((data as { error: unknown }).error)
				: res.statusText;
		throw new ApiError(res.status, message);
	}
	return data as T;
}
