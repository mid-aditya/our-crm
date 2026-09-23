import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const KEY = 'crm.theme';

function initial(): Theme {
	if (!browser) return 'system';
	const v = localStorage.getItem(KEY);
	return v === 'light' || v === 'dark' ? v : 'system';
}

export const theme = $state<{ value: Theme }>({ value: initial() });

export function setTheme(t: Theme) {
	theme.value = t;
	if (browser) localStorage.setItem(KEY, t);
}

export function resolveTheme(t: Theme): 'light' | 'dark' {
	if (t !== 'system') return t;
	return browser && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
