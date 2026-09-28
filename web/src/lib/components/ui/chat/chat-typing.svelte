<script lang="ts">
	import { cn } from '$lib/utils';

	let { class: klass = '' }: { class?: string } = $props();
</script>

<div class={cn('flex justify-start', klass)}>
	<div class="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-raised px-4 py-3">
		<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></div>
		<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></div>
		<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></div>
	</div>
</div>
