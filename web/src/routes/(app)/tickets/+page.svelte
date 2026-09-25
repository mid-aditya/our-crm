<script lang="ts">
	import { t } from 'svelte-i18n';
	import { Ticket } from '@lucide/svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
</script>

<EmptyState title={$t('empty.ticketsTitle')} description={$t('empty.ticketsDesc')}>
	{#snippet icon()}
		<Ticket size={20} />
	{/snippet}
</EmptyState>
