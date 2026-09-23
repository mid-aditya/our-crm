<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		icon?: Snippet;
		children?: Snippet;
	};

	let { title, description, icon, children }: Props = $props();
</script>

<div
	class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center"
>
	{#if icon}
		<div class="mb-1 flex size-11 items-center justify-center rounded-full bg-raised text-faint">
			{@render icon()}
		</div>
	{/if}
	<h2 class="font-display text-sm font-semibold">{title}</h2>
	{#if description}
		<p class="max-w-sm text-sm text-muted">{description}</p>
	{/if}
	{#if children}<div class="mt-3">{@render children()}</div>{/if}
</div>
