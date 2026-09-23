<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Variant = 'neutral' | 'success' | 'warn' | 'danger' | 'neon';

	type Props = {
		variant?: Variant;
		dot?: boolean;
		class?: string;
		children: Snippet;
	};

	let { variant = 'neutral', dot = false, class: cls = '', children }: Props = $props();

	const styles: Record<Variant, string> = {
		neutral: 'border-line bg-raised text-muted',
		success: 'border-transparent bg-neon-soft text-neon-text',
		warn: 'border-transparent bg-warn-soft text-warn',
		danger: 'border-transparent bg-danger-soft text-danger',
		neon: 'border-neon/30 bg-neon-soft text-neon-text'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
		styles[variant],
		cls
	)}
>
	{#if dot}<span class="size-1.5 shrink-0 rounded-full bg-current"></span>{/if}
	{@render children()}
</span>
