<script lang="ts">
	// Auth guard: redirect to /login if no token AND on a protected route (dashboard/*).
	// The root layout shows the landing page when isPublic=true (no token).
	// This layout only wraps routes inside the (app) group — none are public.
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { getToken } from '$lib/api';

	let { children } = $props();

	// Only redirect to /login when on a protected route (starts with /dashboard)
	// and NOT on /login to avoid redirect loop.
	$effect(() => {
		if (!browser) return;
		const hasToken = !!getToken();
		const pathname = page.url.pathname;
		const onProtectedRoute = pathname.startsWith('/dashboard');
		const onLoginPage = pathname === '/login';
		// Only redirect if on a protected route, not on login page, and no token.
		if (!hasToken && onProtectedRoute && !onLoginPage) {
			goto('/login');
		}
	});
</script>

{@render children()}
