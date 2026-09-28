<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { ref = $bindable(null), class: className, ...restProps }: DropdownMenuPrimitive.SeparatorProps =
		$props();
</script>

<DropdownMenuPrimitive.Separator
	bind:ref
	class={cn('my-1.5 h-px bg-line', className)}
	{...restProps}
/>
