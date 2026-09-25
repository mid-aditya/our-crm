<script lang="ts">
	// (app) layout: wraps all protected routes with app chrome + auth guard.
	// Public pages (/, /login) do NOT use this layout — they use the root layout.
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { getToken, setToken, setCompanyId } from '$lib/api';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';

	let { children } = $props();
	let sidebarOpen = $state(false);

	// Auth guard: redirect to /login if no token AND on a protected route.
	// Only guards routes that start with /dashboard, /companies, /livechat.
	$effect(() => {
		if (!browser) return;
		const token = getToken();
		const pathname = page.url.pathname;
		const onProtectedRoute =
			pathname.startsWith('/dashboard') ||
			pathname.startsWith('/companies') ||
			pathname.startsWith('/livechat');
		if (!token && onProtectedRoute) {
			goto('/login');
		}
	});

	// Logout: clear token BEFORE navigating away to prevent sidebar flash.
	// The root layout has no chrome, so clearing here ensures clean transition.
	beforeNavigate((navigation) => {
		if (
			browser &&
			navigation.to?.url.pathname === '/' &&
			!navigation.to?.url.pathname.startsWith('/dashboard') &&
			!navigation.to?.url.pathname.startsWith('/companies') &&
			!navigation.to?.url.pathname.startsWith('/livechat')
		) {
			setToken(null);
			setCompanyId(null);
		}
	});
</script>

<!-- App chrome: sidebar + topbar + main content area -->
<div class="flex min-h-svh">
	<Sidebar bind:open={sidebarOpen} />
	<div class="flex min-w-0 flex-1 flex-col">
		<Topbar onMenu={() => (sidebarOpen = true)} />
		<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
			{@render children()}
		</main>
	</div>
</div>
