<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { ref = $bindable(null), class: className, ...restProps }: AlertDialogPrimitive.ContentProps =
		$props();
</script>

<AlertDialogPrimitive.Portal>
	<AlertDialogPrimitive.Overlay
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
	/>
	<AlertDialogPrimitive.Content
		bind:ref
		class={cn(
			'dropdown-in fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-3 rounded-2xl border border-line bg-surface p-5 shadow-2xl',
			className
		)}
		{...restProps}
	/>
</AlertDialogPrimitive.Portal>
