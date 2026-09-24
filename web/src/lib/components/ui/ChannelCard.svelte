<script lang="ts">
	import { channelStore } from '$lib/channels/store';
	import type { ChannelDef } from '$lib/channels/definitions';
	import { cn } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import { t } from 'svelte-i18n';
	import { CalendarDays, Check, Loader2, TriangleAlert, X } from '@lucide/svelte';
	import ChannelConfigDialog from './ChannelConfigDialog.svelte';

	type Props = {
		def: ChannelDef;
	};

	let { def }: Props = $props();

	const state = $derived(channelStore.channels[def.id] ?? {
		id: def.id,
		config: {},
		status: 'disconnected' as const,
		lastSync: null,
		error: null,
		enabled: false
	});

	const statusConfig: Record<string, { labelId: string; color: string; dotColor: string }> = {
		connected: { labelId: 'channels.status.connected', color: 'text-neon-text', dotColor: 'bg-neon dot-pulse' },
		connecting: { labelId: 'channels.status.connecting', color: 'text-warn', dotColor: 'bg-warn' },
		error: { labelId: 'channels.status.error', color: 'text-danger', dotColor: 'bg-danger' },
		disconnected: { labelId: 'channels.status.disconnected', color: 'text-faint', dotColor: 'bg-faint' }
	};

	const sc = $derived(statusConfig[state.status] ?? statusConfig.disconnected);

	const isLoading = $derived(state.status === 'connecting');

	function formatLastSync(iso: string | null): string {
		if (!iso) return '—';
		const d = new Date(iso);
		const now = Date.now();
		const diff = Math.floor((now - d.getTime()) / 1000);
		if (diff < 60) return `${diff}s`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		return `${Math.floor(diff / 3600)}h`;
	}

	let dialogOpen = $state(false);
</script>

<div class="rounded-xl border border-line bg-surface">
	<!-- Header row -->
	<div class="flex items-center gap-3 px-4 py-3.5">
		<!-- Icon -->
		<div
			class="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
			style="background: {def.color}22; color: {def.color};"
		>
			<def.icon size={20} />
		</div>

		<!-- Name + description -->
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<h3 class="font-display text-sm font-semibold">{$t(def.nameId)}</h3>
				<span
					class={cn(
						'inline-flex items-center gap-1.5 text-[11px] font-medium',
						sc.color
					)}
				>
					<span class={cn('size-1.5 rounded-full', sc.dotColor)}></span>
					{$t(sc.labelId)}
				</span>
			</div>
			<p class="mt-0.5 truncate text-xs text-muted">{$t(def.descriptionId)}</p>
		</div>

		<!-- Quick actions -->
		<div class="flex shrink-0 items-center gap-2">
			{#if state.enabled && state.status === 'connected'}
				<span class="hidden text-xs text-faint sm:block">
					<CalendarDays size={12} class="inline -mt-0.5 mr-1" />
					{formatLastSync(state.lastSync)}
				</span>
			{/if}
			<Button
				variant="outline"
				size="sm"
				onclick={() => (dialogOpen = true)}
			>
				{$t('channels.configure')}
			</Button>
		</div>
	</div>

	<!-- Error message -->
	{#if state.status === 'error' && state.error}
		<div class="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2">
			<TriangleAlert size={14} class="mt-0.5 shrink-0 text-danger" />
			<p class="text-xs text-danger">{state.error}</p>
		</div>
	{/if}
</div>

<ChannelConfigDialog
	bind:open={dialogOpen}
	{def}
	{state}
/>
