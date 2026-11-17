<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { Dialog, DropdownMenu } from 'bits-ui';
	import {
		AlertTriangle,
		CheckCheck,
		Eye,
		Megaphone,
		MoreHorizontal,
		Plus,
		RefreshCw,
		Send,
		Trash2,
		X
	} from '@lucide/svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { cn } from '$lib/utils';
	import { userStore } from '$lib/api';
	import {
		deleteCampaign,
		getCampaignChannels,
		getCampaigns,
		launchCampaign,
		previewCampaign,
		type Campaign,
		type CampaignChannel
	} from '$lib/campaigns/api';

	let items = $state<Campaign[]>([]);
	let channels = $state<CampaignChannel[]>([]);
	let loading = $state(true);
	let error = $state('');
	let busyId = $state<string | null>(null);
	let poll: ReturnType<typeof setInterval> | null = null;

	let previewOpen = $state(false);
	let previewLoading = $state(false);
	let previewError = $state('');
	let previewName = $state('');
	let previewData = $state<{ total: number; sample: string } | null>(null);

	const role = $derived(((($userStore?.role as string | undefined) ?? '') as string).toLowerCase());
	const canManage = $derived(['admin', 'spv', 'developer', 'owner'].includes(role));

	const statusVariant: Record<string, 'success' | 'neon' | 'neutral' | 'warn' | 'danger'> = {
		draft: 'neutral',
		scheduled: 'neon',
		sending: 'warn',
		done: 'success',
		failed: 'danger'
	};

	const menuItem =
		'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted outline-none data-[highlighted]:bg-raised data-[highlighted]:text-ink';

	const totalSent = $derived(items.reduce((n, c) => n + stat(c, 'sent'), 0));
	const sendingCount = $derived(items.filter((c) => c.status === 'sending').length);

	onMount(async () => {
		await load();
	});

	onDestroy(() => {
		if (poll) clearInterval(poll);
	});

	function stat(c: Campaign, key: 'sent' | 'failed' | 'total'): number {
		const v = c.stats?.[key];
		return typeof v === 'number' ? v : 0;
	}

	function progress(c: Campaign): number {
		const total = stat(c, 'total');
		if (total <= 0) return c.status === 'done' ? 100 : 0;
		return Math.min(100, Math.round(((stat(c, 'sent') + stat(c, 'failed')) / total) * 100));
	}

	function channelName(id: string): string {
		return channels.find((c) => c.id === id)?.name ?? '—';
	}

	function audienceLabel(a: Campaign['audience']): string {
		if (!a) return $t('campaigns.audience.all');
		if (a.tags && a.tags.length > 0) return a.tags.join(', ');
		if (a.source) return a.source;
		return $t('campaigns.audience.all');
	}

	function scheduleLabel(value: string | null): string {
		if (!value) return '';
		try {
			return new Intl.DateTimeFormat('id-ID', {
				day: 'numeric',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit'
			}).format(new Date(value));
		} catch {
			return value;
		}
	}

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		try {
			const [cs, chs] = await Promise.all([getCampaigns(), getCampaignChannels()]);
			items = cs;
			channels = chs;
		} catch (e: any) {
			error = e?.message || $t('campaigns.list.error');
		} finally {
			if (!silent) loading = false;
			schedulePoll();
		}
	}

	function schedulePoll() {
		const needsPoll = items.some((c) => c.status === 'sending');
		if (needsPoll && !poll) {
			poll = setInterval(() => void load(true), 3000);
		} else if (!needsPoll && poll) {
			clearInterval(poll);
			poll = null;
		}
	}

	async function openPreview(c: Campaign) {
		previewName = c.name;
		previewData = null;
		previewError = '';
		previewOpen = true;
		previewLoading = true;
		try {
			previewData = await previewCampaign(c.id);
		} catch (e: any) {
			previewError = e?.message || $t('campaigns.list.error');
		} finally {
			previewLoading = false;
		}
	}

	async function launch(c: Campaign) {
		const ok = await askConfirm({
			title: $t('campaigns.list.confirmLaunch'),
			description: $t('campaigns.list.confirmLaunchDesc', {
				values: { name: c.name, n: stat(c, 'total') }
			}),
			confirmLabel: $t('campaigns.list.launch'),
			danger: true
		});
		if (!ok) return;
		busyId = c.id;
		error = '';
		try {
			await launchCampaign(c.id);
			await load(true);
		} catch (e: any) {
			error = e?.message || $t('campaigns.list.error');
		} finally {
			busyId = null;
		}
	}

	async function remove(c: Campaign) {
		const ok = await askConfirm({
			title: $t('campaigns.list.confirmDelete'),
			description: c.name,
			confirmLabel: $t('common.delete'),
			danger: true
		});
		if (!ok) return;
		busyId = c.id;
		error = '';
		try {
			await deleteCampaign(c.id);
			await load(true);
		} catch (e: any) {
			error = e?.message || $t('campaigns.list.error');
		} finally {
			busyId = null;
		}
	}
</script>

<svelte:head>
	<title>{$t('campaigns.title')} · Our CRM</title>
</svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-xl font-semibold tracking-tight">{$t('campaigns.title')}</h1>
		<p class="mt-1 text-sm text-muted">{$t('campaigns.subtitle')}</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="ghost" size="icon" onclick={() => load()} aria-label={$t('campaigns.list.refresh')}>
			<RefreshCw size={16} class={loading ? 'animate-spin' : ''} />
		</Button>
		{#if canManage}
			<Button onclick={() => goto('/campaigns/new')}>
				<Plus size={16} />
				{$t('campaigns.new')}
			</Button>
		{/if}
	</div>
</div>

{#if error}
	<div class="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
		{error}
	</div>
{/if}

<div class="mb-4 grid grid-cols-3 gap-2">
	<div class="rounded-xl border border-line bg-surface px-3 py-2.5">
		<p class="text-[10px] font-medium uppercase tracking-wide text-faint">
			{$t('campaigns.list.totalCampaigns')}
		</p>
		<p class="mt-0.5 font-display text-lg font-semibold leading-none">{items.length}</p>
	</div>
	<div class="rounded-xl border border-line bg-surface px-3 py-2.5">
		<p class="text-[10px] font-medium uppercase tracking-wide text-faint">
			{$t('campaigns.list.sendingNow')}
		</p>
		<p class="mt-0.5 font-display text-lg font-semibold leading-none">{sendingCount}</p>
	</div>
	<div class="rounded-xl border border-line bg-surface px-3 py-2.5">
		<p class="text-[10px] font-medium uppercase tracking-wide text-faint">
			{$t('campaigns.list.totalSent')}
		</p>
		<p class="mt-0.5 font-display text-lg font-semibold leading-none">{totalSent}</p>
	</div>
</div>

{#if loading}
	<div class="space-y-3">
		{#each [1, 2, 3] as i (i)}
			<div class="h-24 animate-pulse rounded-xl border border-line bg-surface"></div>
		{/each}
	</div>
{:else if items.length === 0}
	<EmptyState
		title={$t('campaigns.list.emptyTitle')}
		description={$t('campaigns.list.emptyDesc')}
	>
		{#snippet icon()}
			<Megaphone size={18} />
		{/snippet}
		{#if canManage}
			<Button onclick={() => goto('/campaigns/new')}>
				<Plus size={16} />
				{$t('campaigns.new')}
			</Button>
		{/if}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each items as campaign (campaign.id)}
			<li class="rounded-xl border border-line bg-surface p-4">
				<div class="flex flex-wrap items-center gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="truncate font-display text-sm font-semibold">{campaign.name}</h3>
							<Badge variant={statusVariant[campaign.status] ?? 'neutral'} dot>
								{$t(`campaigns.status.${campaign.status}`)}
							</Badge>
							{#if campaign.status === 'sending'}
								<span class="text-[11px] text-warn">{$t('campaigns.list.sending')}</span>
							{/if}
						</div>
						<p class="mt-1 text-xs text-muted">
							{audienceLabel(campaign.audience)}
							·
							{channelName(campaign.channel_id)}
							{#if campaign.scheduled_at}
								· {scheduleLabel(campaign.scheduled_at)}
							{/if}
						</p>
						<p class="mt-1 text-[11px] text-faint">
							{stat(campaign, 'sent')} {$t('campaigns.list.sent')}
							· {stat(campaign, 'failed')} {$t('campaigns.list.failed')}
							· {stat(campaign, 'total')} {$t('campaigns.composer.recipients')}
						</p>
					</div>

					<div class="w-full max-w-48">
						<div class="mb-1 flex justify-between text-[11px] text-faint">
							<span>{$t('campaigns.table.progress')}</span>
							<span class="font-mono">{progress(campaign)}%</span>
						</div>
						<div class="h-1.5 overflow-hidden rounded-full bg-raised">
							<div
								class={cn(
									'h-full rounded-full transition-[width]',
									campaign.status === 'failed' ? 'bg-danger' : 'bg-neon'
								)}
								style="width: {progress(campaign)}%"
							></div>
						</div>
					</div>

					<div class="flex items-center gap-1">
						{#if canManage && campaign.status === 'draft'}
							<Button
								size="sm"
								onclick={() => launch(campaign)}
								disabled={busyId === campaign.id}
							>
								<Send size={14} />
								{$t('campaigns.list.launch')}
							</Button>
						{/if}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								class="inline-flex size-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus:outline-none"
								aria-label={$t('contacts.table.actions')}
							>
								<MoreHorizontal size={16} />
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									sideOffset={4}
									align="end"
									class="z-50 min-w-44 rounded-lg border border-line bg-surface p-1 shadow-lg shadow-black/10 outline-none dark:shadow-black/50"
								>
									<DropdownMenu.Item class={menuItem} onSelect={() => openPreview(campaign)}>
										<Eye size={15} />
										{$t('campaigns.menu.preview')}
									</DropdownMenu.Item>
									{#if canManage && campaign.status === 'draft'}
										<DropdownMenu.Item class={menuItem} onSelect={() => launch(campaign)}>
											<Send size={15} />
											{$t('campaigns.list.launch')}
										</DropdownMenu.Item>
									{/if}
									{#if canManage}
										<DropdownMenu.Separator class="my-1 h-px bg-line" />
										<DropdownMenu.Item
											class={cn(
												menuItem,
												'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger'
											)}
											disabled={campaign.status === 'sending'}
											onSelect={() => remove(campaign)}
										>
											<Trash2 size={15} />
											{$t('campaigns.menu.delete')}
										</DropdownMenu.Item>
									{/if}
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<Dialog.Root open={previewOpen} onOpenChange={(v) => (previewOpen = v ?? false)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl outline-none"
		>
			<div class="mb-3 flex items-start justify-between gap-4">
				<div class="min-w-0">
					<Dialog.Title class="truncate font-display text-base font-semibold">
						{$t('campaigns.list.previewTitle')}
					</Dialog.Title>
					<Dialog.Description class="mt-0.5 truncate text-xs text-muted">
						{previewName}
					</Dialog.Description>
				</div>
				<Dialog.Close
					class="flex size-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-ink"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>

			{#if previewLoading}
				<p class="py-10 text-center text-xs text-muted">{$t('common.loading')}</p>
			{:else if previewError}
				<div class="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
					<AlertTriangle size={14} class="mt-0.5 shrink-0" />
					{previewError}
				</div>
			{:else if previewData}
				<div class="overflow-hidden rounded-[1.2rem] border-[5px] border-ink/80 bg-[#0b141a]">
					<div class="flex items-center gap-2 bg-[#1f2c34] px-3 py-2 text-white">
						<div class="flex size-7 items-center justify-center rounded-full bg-[#00a884] text-[10px] font-semibold">
							WA
						</div>
						<p class="text-xs font-semibold">WhatsApp</p>
					</div>
					<div
						class="min-h-[180px] px-3 py-4"
						style="background-color:#0b141a;background-image:radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);background-size:16px 16px;"
					>
						<div class="ml-auto max-w-[90%]">
							<div
								class="rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-[13px] leading-relaxed text-[#e9edef] shadow"
							>
								<p class="whitespace-pre-wrap break-words">
									{previewData.sample || $t('campaigns.list.previewEmpty')}
								</p>
								<div class="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/55">
									<span>09:41</span>
									<CheckCheck size={12} />
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="mt-3 flex items-center justify-between text-xs text-muted">
					<span>{$t('campaigns.list.previewTotal')}</span>
					<span class="font-mono font-semibold text-ink">{previewData.total}</span>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
