<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getToken } from '$lib/api';

	let { children } = $props();

	if (browser && !getToken()) {
		goto('/login');
	}
</script>

{@render children()}
