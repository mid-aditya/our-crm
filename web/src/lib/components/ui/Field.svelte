<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		for?: string;
		hint?: Snippet;
		children: Snippet;
	};

	let { label, for: inputId, hint, children }: Props = $props();
</script>

<div class="grid gap-1.5">
	<label class="text-xs font-medium text-muted" for={inputId}>{label}</label>
	{@render children()}
	{#if hint}
		<p class="text-xs text-faint">{@render hint()}</p>
	{/if}
</div>
