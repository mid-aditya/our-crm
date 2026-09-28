<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		inset = false,
		...restProps
	}: DropdownMenuPrimitive.ItemProps & { inset?: boolean } = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	class={cn(
		'relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none',
		'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		'data-[highlighted]:bg-neon-soft data-[highlighted]:text-ink',
		inset && 'pl-8',
		className
	)}
	{...restProps}
/>
