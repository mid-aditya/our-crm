<script lang="ts">
	import { t } from 'svelte-i18n';
	import { MessagesSquare } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { goto } from '$app/navigation';
</script>

<EmptyState
	title={$t('empty.conversationsTitle')}
	description={$t('empty.conversationsDesc')}
>
	{#snippet icon()}
		<MessagesSquare size={20} />
	{/snippet}
	{#snippet children()}
		<Button onclick={() => goto('/settings')}>{$t('empty.conversationsCta')}</Button>
	{/snippet}
</EmptyState>
