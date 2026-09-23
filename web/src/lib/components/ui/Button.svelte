<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Variant = 'solid' | 'outline' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'icon';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
		children?: Snippet;
	};

	let {
		variant = 'solid',
		size = 'md',
		class: cls = '',
		type = 'button',
		children,
		...rest
	}: Props = $props();

	const variants: Record<Variant, string> = {
		solid: 'bg-neon text-on-neon hover:bg-neon-strong shadow-[0_0_14px_var(--neon-glow)]',
		outline: 'border border-line bg-surface text-ink hover:border-neon hover:text-neon-text',
		ghost: 'text-muted hover:bg-raised hover:text-ink',
		danger: 'border border-transparent bg-danger-soft text-danger hover:bg-danger hover:text-white'
	};

	const sizes: Record<Size, string> = {
		sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
		md: 'h-9.5 gap-2 rounded-lg px-4 text-sm',
		icon: 'size-9 rounded-lg'
	};
</script>

<button
	{type}
	class={cn(
		'inline-flex shrink-0 cursor-pointer items-center justify-center font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
		variants[variant],
		sizes[size],
		cls
	)}
	{...rest}
>
	{@render children?.()}
</button>
