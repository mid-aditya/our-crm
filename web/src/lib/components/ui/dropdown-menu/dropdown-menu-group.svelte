<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let { ...restProps }: DropdownMenuPrimitive.GroupProps = $props();
</script>

<DropdownMenuPrimitive.Group {...restProps} />
