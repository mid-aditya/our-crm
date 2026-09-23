<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLInputAttributes & {
		error?: string | null;
		mono?: boolean;
	};

	let { value = $bindable(''), error = null, mono = false, class: cls = '', ...rest }: Props = $props();
</script>

<input
	class={cn(
		'h-9.5 w-full rounded-lg border bg-surface px-3 text-sm text-ink transition-colors',
		'placeholder:text-faint hover:border-line-strong focus:border-neon focus:outline-none',
		'disabled:cursor-not-allowed disabled:opacity-60',
		error ? 'border-danger' : 'border-line',
		mono && 'font-mono text-[13px]',
		cls
	)}
	{...rest}
/>
{#if error}
	<p class="mt-1.5 text-xs text-danger">{error}</p>
{/if}
