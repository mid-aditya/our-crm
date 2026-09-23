<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import { theme, resolveTheme } from '$lib/theme.svelte';
	import { locale } from 'svelte-i18n';

	let { children } = $props();
	let sidebarOpen = $state(false);

	// Terapkan tema saat nilai store berubah
	$effect(() => {
		const resolved = resolveTheme(theme.value);
		document.documentElement.classList.toggle('dark', resolved === 'dark');
		document.documentElement.style.colorScheme = resolved;
	});

	// Ikuti perubahan tema sistem saat mode "system"
	$effect(() => {
		if (theme.value !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			const dark = resolveTheme('system') === 'dark';
			document.documentElement.classList.toggle('dark', dark);
			document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	// Sinkronkan lang dokumen dengan locale aktif
	$effect(() => {
		if ($locale) document.documentElement.lang = $locale;
	});
</script>

<div class="flex min-h-svh">
	<Sidebar bind:open={sidebarOpen} />
	<div class="flex min-w-0 flex-1 flex-col">
		<Topbar onMenu={() => (sidebarOpen = true)} />
		<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
			{@render children()}
		</main>
	</div>
</div>
