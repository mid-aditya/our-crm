import { browser } from '$app/environment';

const BASE = '/api/v1';
const TOKEN_KEY = 'crm.token';

export class ApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

// Token with localStorage sync. Exposed as a plain variable so callers
// can mutate it directly — no runes needed.
export let tokenValue: string | null = browser ? localStorage.getItem(TOKEN_KEY) : null;

export function getToken(): string | null {
	return tokenValue;
}

	export function setToken(token: string | null) {
		if (!browser) return;
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
		tokenValue = token;
		bumpTokenVersion(); // force re-render of $derived in layout
	}

// Counter incremented on token change — used by components to force re-render
export let tokenVersion = 0;

export function bumpTokenVersion() {
	tokenVersion++;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const headers = new Headers(options.headers);
	if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	const token = getToken();
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
