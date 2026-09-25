import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const BASE = '/api/v1';
const TOKEN_KEY = 'crm.token';
const COMPANY_KEY = 'crm.company_id';
const USER_KEY = 'crm.user';

export type SessionUser = { id: string; email: string; name: string; role: string };

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

function readStoredUser(): SessionUser | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(USER_KEY);
		return raw ? (JSON.parse(raw) as SessionUser) : null;
	} catch {
		return null;
	}
}

// Reactive user store — diisi saat login dari respons backend,
// bukan dari mock, agar role agent/admin tampil sesuai pilihan login.
export const userStore = writable<SessionUser | null>(readStoredUser());

export function getUser(): SessionUser | null {
	let val: SessionUser | null = null;
	userStore.subscribe((v) => (val = v))();
	return val;
}

export function setUser(user: SessionUser | null) {
	if (!browser) return;
	if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
	else localStorage.removeItem(USER_KEY);
	userStore.set(user);
}

export function clearSession() {
	setToken(null);
	setCompanyId(null);
	setUser(null);
}

// Menu yang di-approve untuk user saat ini (sidebar agent dibatasi via ini).
export async function myMenus(): Promise<{ role: string; menus: string[] }> {
	try {
		return await api<{ role: string; menus: string[] }>('/menu-grants');
	} catch {
		return { role: '', menus: [] };
	}
}

export async function getUserMenus(userId: string): Promise<string[]> {
	const res = await api<{ menus: string[] }>(`/users/${userId}/menus`);
	return res.menus ?? [];
}

export async function setUserMenus(userId: string, menus: string[]): Promise<void> {
	await api(`/users/${userId}/menus`, {
		method: 'PUT',
		body: JSON.stringify({ menus })
	});
}
// Fallback untuk sesi lama (token tersimpan sebelum user disimpan):
// ambil role/user_id dari payload JWT tanpa verifikasi signature,
// hanya untuk label UI — otoritas tetap di backend.
export function ensureUserFromToken(): SessionUser | null {
	const existing = getUser();
	if (existing) return existing;
	const token = getToken();
	if (!token) return null;
	try {
		const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
		const role = typeof payload?.role === 'string' ? payload.role : 'agent';
		const fallback: SessionUser = {
			id: String(payload?.user_id ?? ''),
			email: '',
			name: role === 'admin' ? 'Demo Admin' : 'Demo Agent',
			role
		};
		setUser(fallback);
		return fallback;
	} catch {
		return null;
	}
}

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
	const raw = res.status === 204 ? null : await res.json().catch(() => null);

	if (!res.ok) {
		const errObj =
			raw && typeof raw === 'object' && 'error' in raw
				? (raw as { error: unknown }).error
				: null;
		const message =
			typeof errObj === 'string'
				? errObj
				: errObj && typeof errObj === 'object' && 'message' in errObj
					? String((errObj as { message: unknown }).message)
					: res.statusText;
		throw new ApiError(res.status, message);
	}
	// Backend Go membungkus sukses dalam envelope {"data": ...} — unwrap otomatis
	// agar caller bisa langsung pakai {access_token, ...} / array / object.
	const data =
		raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
			? (raw as Record<string, unknown>).data
			: raw;
	return data as T;
}

// apiPage: untuk endpoint paginated (WritePage → {"data": [...], "meta": {...}}).
// api() biasa akan meng-unwrap hingga array dan meta hilang — helper ini
// mempertahankan keduanya.
export async function apiPage<T>(
	path: string,
	options: RequestInit = {}
): Promise<{ data: T; meta: { total: number; limit: number; offset: number } }> {
	const headers = new Headers(options.headers);
	if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	let token: string | null = null;
	tokenStore.subscribe((v) => (token = v))();
	if (token) headers.set('Authorization', `Bearer ${token}`);

	const res = await fetch(`${BASE}${path}`, { ...options, headers });
	const raw = await res.json().catch(() => null);

	if (!res.ok) {
		const errObj =
			raw && typeof raw === 'object' && 'error' in raw
				? (raw as { error: unknown }).error
				: null;
		const message =
			typeof errObj === 'string'
				? errObj
				: errObj && typeof errObj === 'object' && 'message' in errObj
					? String((errObj as { message: unknown }).message)
					: res.statusText || `Request failed (${res.status})`;
		throw new ApiError(res.status, message);
	}
	const data = (raw as any)?.data ?? [];
	const meta = (raw as any)?.meta ?? { total: (data as any[]).length ?? 0, limit: 20, offset: 0 };
	return { data: data as T, meta };
}
