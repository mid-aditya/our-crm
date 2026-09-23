<script lang="ts">
	import { goto } from '$app/navigation';
	import { t, locale as i18nLocale } from 'svelte-i18n';
	import type { Component } from 'svelte';
	import {
		ArrowDownRight,
		ArrowUpRight,
		Check,
		Gauge,
		Megaphone,
		MessagesSquare,
		Plus,
		Send,
		Ticket,
		TriangleAlert
	} from '@lucide/svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { mockConversations, mockChannels, mockStats, currentUser, type Stat } from '$lib/mock';
	import { bcp } from '$lib/i18n';
	import { initials } from '$lib/utils';

	const hour = new Date().getHours();
	const greetingKey =
		hour < 11
			? 'dashboard.greetingMorning'
			: hour < 15
				? 'dashboard.greetingAfternoon'
				: 'dashboard.greetingEvening';

	const today = $derived(
		new Intl.DateTimeFormat(bcp($i18nLocale), {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date())
	);

	const statIcons: Record<Stat['key'], Component<any>> = {
		activeChats: MessagesSquare,
		delivered: Send,
		openTickets: Ticket,
		replyRate: Gauge
	};

	const numberFmt = $derived(new Intl.NumberFormat(bcp($i18nLocale)));
</script>

<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
	<div class="min-w-0">
		<h2 class="font-display text-xl font-semibold tracking-tight md:text-2xl">
			{$t(greetingKey)}, {currentUser.name.split(' ')[0]}
		</h2>
		<p class="mt-1 text-sm text-muted">{today} — {$t('dashboard.subtitle')}</p>
	</div>
	<Button onclick={() => goto('/campaigns')}>
		<Megaphone size={16} />
		{$t('dashboard.newCampaign')}
	</Button>
</div>

<!-- Statistik -->
<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
	{#each mockStats as stat (stat.key)}
		{@const Icon = statIcons[stat.key]}
		{@const max = Math.max(...stat.spark)}
		<div class="rounded-xl border border-line bg-surface p-4">
			<div class="flex items-center justify-between gap-2">
				<p class="truncate text-xs font-medium text-muted">{$t(`dashboard.stats.${stat.key}`)}</p>
				<Icon size={16} class="shrink-0 text-faint" />
			</div>
			<div class="mt-2 flex items-baseline gap-2">
				<p class="font-mono text-2xl font-semibold tracking-tight">
					{numberFmt.format(stat.value)}{stat.suffix ?? ''}
				</p>
				<Badge variant={stat.good ? 'success' : 'warn'}>
					{#if stat.trend === 'up'}<ArrowUpRight size={12} />{:else}<ArrowDownRight size={12} />{/if}
					{$t('dashboard.stats.fromYesterday', { values: { delta: stat.delta } })}
				</Badge>
			</div>
			<div class="mt-3 flex h-8 items-end gap-px" aria-hidden="true">
				{#each stat.spark as v, i (i)}
					<div
						class="w-full rounded-sm bg-neon"
						style="height: {Math.max(12, (v / max) * 100)}%; opacity: {0.25 + (i / (stat.spark.length - 1)) * 0.75};"
					></div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<!-- Percakapan terbaru + status saluran -->
<div class="mt-4 grid gap-3 lg:grid-cols-5">
	<Card title={$t('dashboard.recent.title')} class="lg:col-span-3">
		{#snippet actions()}
			<a
				href="/conversations"
				class="text-xs font-medium text-neon-text hover:underline"
			>
				{$t('dashboard.recent.viewAll')}
			</a>
		{/snippet}
		<ul class="divide-y divide-line">
			{#each mockConversations as convo (convo.id)}
				<li>
					<a
						href="/conversations"
						class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-raised/70"
					>
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-muted"
						>
							{initials(convo.name)}
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-2">
								<span class="truncate text-sm font-medium">{convo.name}</span>
								{#if convo.unread}
									<span class="size-2 shrink-0 rounded-full bg-neon"></span>
								{/if}
							</span>
							<span class="mt-0.5 block truncate text-xs text-muted">{convo.message}</span>
						</span>
						<span class="shrink-0 font-mono text-[11px] text-faint">{convo.time}</span>
					</a>
				</li>
			{/each}
		</ul>
	</Card>

	<Card title={$t('dashboard.channels.title')} class="lg:col-span-2">
		{#snippet actions()}
			<Button variant="outline" size="sm" onclick={() => goto('/settings')}>
				<Plus size={14} />
				{$t('dashboard.channels.new')}
			</Button>
		{/snippet}
		<ul class="space-y-3">
			{#each mockChannels as channel (channel.id)}
				<li class="flex items-center gap-3 rounded-lg border border-line px-3 py-3">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-lg {channel.status ===
						'connected'
							? 'bg-neon-soft text-neon-text'
							: 'bg-warn-soft text-warn'}"
					>
						{#if channel.status === 'connected'}
							<Check size={16} />
						{:else}
							<TriangleAlert size={16} />
						{/if}
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium">{$t(`dashboard.channel.${channel.id}`)}</p>
						<p class="text-xs text-muted">{$t(`dashboard.channelDetail.${channel.id}`)}</p>
					</div>
					<Badge variant={channel.status === 'connected' ? 'success' : 'warn'} dot>
						{$t(`dashboard.status.${channel.status}`)}
					</Badge>
				</li>
			{/each}
		</ul>
	</Card>
</div>
