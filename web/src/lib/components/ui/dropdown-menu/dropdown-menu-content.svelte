<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		sideOffset = 6,
		align = 'end',
		class: className,
		...restProps
	}: DropdownMenuPrimitive.ContentProps = $props();
</script>

<DropdownMenuPrimitive.Content
	bind:ref
	{sideOffset}
	{align}
	class={cn(
		'dropdown-in z-50 min-w-40 overflow-hidden rounded-xl border border-line bg-surface p-1.5 text-ink shadow-2xl',
		className
	)}
	{...restProps}
/>
