import { browser } from '$app/environment';

const KEY = 'crm.sidebar_collapsed';

function initial(): boolean {
	if (!browser) return false;
	return localStorage.getItem(KEY) === '1';
}

// Sidebar in/out (collapse) — persist per browser.
export const layout = $state<{ collapsed: boolean }>({ collapsed: initial() });

export function toggleSidebar() {
	layout.collapsed = !layout.collapsed;
	if (browser) localStorage.setItem(KEY, layout.collapsed ? '1' : '0');
}
