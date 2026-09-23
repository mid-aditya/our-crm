<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLTextareaAttributes & {
		error?: string | null;
	};

	let { value = $bindable(''), error = null, class: cls = '', ...rest }: Props = $props();
</script>

<textarea
	class={cn(
		'min-h-24 w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink transition-colors',
		'placeholder:text-faint hover:border-line-strong focus:border-neon focus:outline-none',
		'disabled:cursor-not-allowed disabled:opacity-60',
		error ? 'border-danger' : 'border-line',
		cls
	)}
	{...rest}
></textarea>
{#if error}
	<p class="mt-1.5 text-xs text-danger">{error}</p>
{/if}
