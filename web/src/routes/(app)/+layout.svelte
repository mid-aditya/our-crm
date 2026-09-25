<script lang="ts">
	// (app) layout: wraps all protected routes with app chrome + auth guard.
	// Public pages (/, /login) do NOT use this layout — they use the root layout.
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { getToken, clearSession, ensureUserFromToken } from '$lib/api';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import { cn } from '$lib/utils';

	let { children } = $props();
	let sidebarOpen = $state(false);

	// Halaman kerja lebar (percakapan, kanban) mengisi ruang kosong.
	const wide = $derived(
		page.url.pathname.startsWith('/conversations') || page.url.pathname.startsWith('/kanban')
	);

	// Auth guard: semua route di grup (app) adalah protected.
	// Cukup cek token — tidak perlu whitelist per-path (dulu hanya 3 route,
	// sehingga /tickets, /contacts, dll lolos tanpa login & tanpa chrome).
	$effect(() => {
		if (!browser) return;
		const token = getToken();
		if (!token) {
			goto('/login');
		} else {
			ensureUserFromToken();
		}
	});

	// Logout: clear token BEFORE navigating away to prevent sidebar flash.
	// The root layout has no chrome, so clearing here ensures clean transition.
	beforeNavigate((navigation) => {
		if (browser && navigation.to?.url.pathname === '/') {
			clearSession();
		}
	});
</script>

<!-- App chrome: sidebar + topbar + main content area -->
<div class="flex min-h-svh">
	<Sidebar bind:open={sidebarOpen} />
	<div class="flex min-w-0 flex-1 flex-col">
		<Topbar onMenu={() => (sidebarOpen = true)} />
		<main class={cn('mx-auto w-full flex-1 px-4 py-6 md:px-8', wide ? 'max-w-none' : 'max-w-6xl')}>
			{@render children()}
		</main>
	</div>
</div>
