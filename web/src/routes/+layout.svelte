<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { theme, resolveTheme } from '$lib/theme.svelte';
	import { locale } from 'svelte-i18n';
	import { getToken } from '$lib/api';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';

	let { children } = $props();

	// Determine if we're on the public landing page (no dashboard chrome)
	const isPublic = $derived(
		page.url.pathname === '/' && !getToken()
	);

	let sidebarOpen = $state(false);

	// Apply theme
	$effect(() => {
		if (!browser) return;
		const resolved = resolveTheme(theme.value);
		document.documentElement.classList.toggle('dark', resolved === 'dark');
		document.documentElement.style.colorScheme = resolved;
	});

	$effect(() => {
		if (!browser || theme.value !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			const dark = resolveTheme('system') === 'dark';
			document.documentElement.classList.toggle('dark', dark);
			document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	$effect(() => {
		if ($locale) document.documentElement.lang = $locale;
	});
</script>

{#if isPublic}
	<!-- Public layout: no chrome -->
	{@render children()}
{:else}
	<!-- App layout: sidebar + topbar -->
	<div class="flex min-h-svh">
		<Sidebar bind:open={sidebarOpen} />
		<div class="flex min-w-0 flex-1 flex-col">
			<Topbar onMenu={() => (sidebarOpen = true)} />
			<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
