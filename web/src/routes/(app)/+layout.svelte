<script lang="ts">
	// Auth guard: redirect to login if not logged in
	// This layout only wraps protected routes (dashboard/*) inside (app) group.
	// Auth state is handled in root +layout.svelte via isPublic check.
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { getToken } from '$lib/api';

	let { children } = $props();

	// Protected routes must redirect to /login if no token.
	// Only redirect on protected routes (not on /login itself to avoid loop).
	$effect(() => {
		if (!browser) return;
		const hasToken = !!getToken();
		const isLoginPage = page.url.pathname === '/login';
		if (!hasToken && !isLoginPage) {
			goto('/login');
		}
	});
</script>

{@render children()}
