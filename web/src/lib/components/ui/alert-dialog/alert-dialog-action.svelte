<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		danger = false,
		...restProps
	}: AlertDialogPrimitive.ActionProps & { danger?: boolean } = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	class={cn(
		'inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-all focus:outline-none',
		danger
			? 'bg-danger text-white shadow-md hover:brightness-110'
			: 'bg-neon text-on-neon shadow-[0_0_16px_var(--neon-glow)] hover:brightness-110',
		className
	)}
	{...restProps}
/>
