<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { ref = $bindable(null), class: className, ...restProps }: AlertDialogPrimitive.TitleProps =
		$props();
</script>

<AlertDialogPrimitive.Title
	bind:ref
	class={cn('font-display text-sm font-semibold', className)}
	{...restProps}
/>
