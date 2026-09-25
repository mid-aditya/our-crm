<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { theme, resolveTheme } from '$lib/theme.svelte';
	import { locale } from 'svelte-i18n';
	import { beforeNavigate } from '$app/navigation';

	let { children } = $props();

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

	// Root layout: public pages only (landing at /, login at /login).
	// App chrome (sidebar + topbar) lives in the (app) group layout.
	// This layout just renders children — no chrome here.
</script>

{@render children()}
