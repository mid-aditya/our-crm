<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		inset = false,
		...restProps
	}: DropdownMenuPrimitive.GroupHeadingProps & { inset?: boolean } = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
	bind:ref
	class={cn(
		'px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-faint',
		inset && 'pl-8',
		className
	)}
	{...restProps}
/>
