<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
	<p class="font-mono text-5xl font-semibold text-neon-text">{page.status}</p>
	<h1 class="font-display text-lg font-semibold">{page.error?.message ?? 'Error'}</h1>
	<Button variant="outline" onclick={() => goto('/')}>←</Button>
</div>
