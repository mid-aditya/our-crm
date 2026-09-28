<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { ref = $bindable(null), class: className, ...restProps }: AlertDialogPrimitive.CancelProps =
		$props();
</script>

<AlertDialogPrimitive.Cancel
	bind:ref
	class={cn(
		'inline-flex items-center justify-center rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-ink focus:outline-none',
		className
	)}
	{...restProps}
/>
