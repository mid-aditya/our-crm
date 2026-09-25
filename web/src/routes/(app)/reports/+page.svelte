<script lang="ts">
	import { t } from 'svelte-i18n';
	import { ChartColumnBig } from '@lucide/svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
</script>

<EmptyState title={$t('empty.reportsTitle')} description={$t('empty.reportsDesc')}>
	{#snippet icon()}
		<ChartColumnBig size={20} />
	{/snippet}
</EmptyState>
