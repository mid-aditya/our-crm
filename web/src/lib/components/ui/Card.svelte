<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		title?: string;
		description?: string;
		actions?: Snippet;
		children?: Snippet;
		class?: string;
	};

	let { title = '', description = '', actions, children, class: cls = '' }: Props = $props();
</script>

<section class={cn('rounded-xl border border-line bg-surface', cls)}>
	{#if title || actions}
		<header class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
			<div class="min-w-0">
				{#if title}<h2 class="font-display text-sm font-semibold tracking-tight">{title}</h2>{/if}
				{#if description}<p class="mt-0.5 truncate text-xs text-muted">{description}</p>{/if}
			</div>
			{#if actions}{@render actions()}{/if}
		</header>
	{/if}
	<div class="p-4">{@render children?.()}</div>
</section>
