<script lang="ts">
	import { t } from 'svelte-i18n';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { confirmState, resolveConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { TriangleAlert } from '@lucide/svelte';

	const state = $derived($confirmState);
</script>

<AlertDialog.Root open={state.open} onOpenChange={(o) => { if (!o) resolveConfirm(false); }}>
	<AlertDialog.Content>
		<div class="flex items-start gap-3">
			{#if state.danger}
				<span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
					<TriangleAlert size={17} />
				</span>
			{/if}
			<div class="min-w-0">
				<AlertDialog.Title>{state.title}</AlertDialog.Title>
				{#if state.description}
					<AlertDialog.Description class="mt-1">{state.description}</AlertDialog.Description>
				{/if}
			</div>
		</div>
		<div class="flex justify-end gap-2 pt-1">
			<AlertDialog.Cancel onclick={() => resolveConfirm(false)}>
				{state.cancelLabel ?? $t('common.cancel')}
			</AlertDialog.Cancel>
			<AlertDialog.Action danger={!!state.danger} onclick={() => resolveConfirm(true)}>
				{state.confirmLabel ?? $t('common.save')}
			</AlertDialog.Action>
		</div>
	</AlertDialog.Content>
</AlertDialog.Root>
