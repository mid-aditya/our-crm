<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t, locale as i18nLocale } from 'svelte-i18n';
	import {
		Megaphone,
		MessagesSquare,
		Send,
		Ticket,
		Gauge,
		UserRound
	} from '@lucide/svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getUser } from '$lib/api';
	import { getDashboardSummary, type DashboardSummary } from '$lib/team/api';
	import { getScoreboard, type ScoreRow } from '$lib/team/api';
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

	const user = $derived(getUser());
	const firstName = $derived((user?.name ?? '').split(' ')[0] || '—');

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);
	let score = $state<ScoreRow[]>([]);

	const isManager = $derived((summary?.scope_level ?? 0) >= 50);

	function fmtFrt(sec: number | null): string {
		if (sec == null) return '—';
		if (sec < 60) return `${sec}dtk`;
		const m = Math.floor(sec / 60);
		if (m < 60) return `${m}mnt`;
		return `${Math.floor(m / 60)}j ${m % 60}mnt`;
	}

	onMount(async () => {
		try {
			summary = await getDashboardSummary();
		} catch {
			summary = null;
		} finally {
			loading = false;
		}
		if ((summary?.scope_level ?? 0) >= 50) {
			try {
				score = await getScoreboard(new Date().toISOString().slice(0, 7));
			} catch {
				score = [];
			}
		}
	});

	const numberFmt = $derived(new Intl.NumberFormat(bcp($i18nLocale)));

	const stats = $derived([
		{ key: 'assigned', icon: MessagesSquare, value: summary?.totals.assigned_chats ?? 0 },
		{ key: 'resolved', icon: Gauge, value: summary?.totals.resolved_chats ?? 0 },
		{ key: 'messages', icon: Send, value: summary?.totals.messages_sent ?? 0 },
		{ key: 'tickets', icon: Ticket, value: (summary?.totals.tickets_open ?? 0) + (summary?.totals.tickets_done ?? 0) }
	]);
</script>

<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
	<div class="min-w-0">
		<h2 class="font-display text-xl font-semibold tracking-tight md:text-2xl">
			{$t(greetingKey)}, {firstName}
		</h2>
		<p class="mt-1 text-sm text-muted">
			{today} — {$t(isManager ? 'dashboard.teamSubtitle' : 'dashboard.mySubtitle')}
		</p>
	</div>
	<Button onclick={() => goto('/campaigns')}>
		<Megaphone size={16} />
		{$t('dashboard.newCampaign')}
	</Button>
</div>

<!-- Statistik ringkasan aktivitas -->
{#if loading}
	<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
		{#each [0, 1, 2, 3] as i (i)}
			<div class="animate-pulse rounded-xl border border-line bg-surface p-4">
				<div class="h-3 w-2/3 rounded bg-raised"></div>
				<div class="mt-3 h-7 w-1/3 rounded bg-raised"></div>
			</div>
		{/each}
	</div>
{:else}
	<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
		{#each stats as stat (stat.key)}
			{@const Icon = stat.icon}
			<div class="rounded-xl border border-line bg-surface p-4">
				<div class="flex items-center justify-between gap-2">
					<p class="truncate text-xs font-medium text-muted">{$t(`dashboard.summary.${stat.key}`)}</p>
					<Icon size={16} class="shrink-0 text-faint" />
				</div>
				<p class="mt-2 font-mono text-2xl font-semibold tracking-tight">
					{numberFmt.format(stat.value)}
				</p>
			</div>
		{/each}
	</div>
{/if}

<!-- Tabel tim (SPV/admin) + aktivitas terbaru -->
<div class="mt-4 grid gap-3 lg:grid-cols-5">
	<Card
		title={isManager ? $t('dashboard.teamTitle') : $t('dashboard.myActivityTitle')}
		class="lg:col-span-3"
	>
		{#if !summary || summary.members.length === 0}
			<p class="py-6 text-center text-xs text-muted">{$t('common.empty')}</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-line text-left text-[11px] font-medium text-muted">
							<th class="pb-2 pr-3 font-medium">{$t('dashboard.col.member')}</th>
							<th class="pb-2 pr-3 text-right font-medium">{$t('dashboard.col.chats')}</th>
							<th class="pb-2 pr-3 text-right font-medium">{$t('dashboard.col.resolved')}</th>
							<th class="pb-2 pr-3 text-right font-medium">{$t('dashboard.col.messages')}</th>
							<th class="pb-2 text-right font-medium">{$t('dashboard.col.tickets')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each summary.members as m (m.user_id)}
							<tr>
								<td class="py-2.5 pr-3">
									<div class="flex items-center gap-2">
										<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-muted">
											{initials(m.full_name)}
										</span>
										<span class="min-w-0">
											<span class="block truncate text-xs font-medium">{m.full_name}</span>
											<span class="block text-[10px] capitalize text-faint">{m.role}</span>
										</span>
									</div>
								</td>
								<td class="py-2.5 pr-3 text-right font-mono">{m.stats.assigned_chats}</td>
								<td class="py-2.5 pr-3 text-right font-mono">{m.stats.resolved_chats}</td>
								<td class="py-2.5 pr-3 text-right font-mono">{m.stats.messages_sent}</td>
								<td class="py-2.5 text-right font-mono">{m.stats.tickets_open + m.stats.tickets_done}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>

	<Card title={$t('dashboard.recentActivity')} class="lg:col-span-2">
		{#snippet actions()}
			<a href="/conversations" class="text-xs font-medium text-neon-text hover:underline">
				{$t('dashboard.recent.viewAll')}
			</a>
		{/snippet}		{#if !summary || summary.recent.length === 0}
			<div class="flex flex-col items-center gap-2 py-8 text-center">
				<span class="flex size-10 items-center justify-center rounded-full bg-raised text-muted">
					<UserRound size={18} />
				</span>
				<p class="text-xs text-muted">{$t('dashboard.noActivity')}</p>
			</div>
		{:else}
			<ul class="space-y-1.5">
				{#each summary.recent as a (a.created_at + a.path + a.method)}
						<li class="flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-[11px]">
							<Badge variant={a.status_code >= 400 ? 'danger' : 'neutral'}>
								{a.method} {a.status_code}
							</Badge>
							<span class="min-w-0 flex-1 truncate">
								<span class="font-medium">{a.user_name}</span>
								<span class="text-faint"> • </span>
								<span class="font-mono text-muted">{a.path}</span>
							</span>
							<span class="shrink-0 text-[10px] text-faint">
								{new Date(a.created_at).toLocaleString()}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>

{#if isManager && score.length > 0}
	<!-- Ringkasan produktivitas (FRT, capaian) + link halaman penuh -->
	<div class="mt-4">
		<Card title={$t('productivity.title')}>
			{#snippet actions()}
				<a href="/productivity" class="text-xs font-medium text-neon-text hover:underline">
					{$t('dashboard.recent.viewAll')}
				</a>
			{/snippet}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-line text-left text-[11px] font-medium text-muted">
							<th class="pb-2 pr-3 font-medium">{$t('dashboard.col.member')}</th>
							<th class="pb-2 pr-3 text-right font-medium">{$t('productivity.colChats')}</th>
							<th class="pb-2 pr-3 text-right font-medium">{$t('productivity.colTickets')}</th>
							<th class="pb-2 pr-3 text-right font-medium">FRT</th>
							<th class="pb-2 text-right font-medium">{$t('productivity.colPresent')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each score.slice(0, 5) as r (r.user_id)}
							<tr>
								<td class="py-2 pr-3">
									<span class="block truncate text-xs font-medium">{r.full_name}</span>
									<span class="block text-[10px] capitalize text-faint">{r.role}</span>
								</td>
								<td class="py-2 pr-3 text-right font-mono text-xs">{r.chats_done}/{r.chats_target}</td>
								<td class="py-2 pr-3 text-right font-mono text-xs">{r.tickets_done}/{r.tickets_target}</td>
								<td class="py-2 pr-3 text-right font-mono text-xs">{fmtFrt(r.avg_frt_seconds)}</td>
								<td class="py-2 text-right font-mono text-xs">{r.present_days} {$t('productivity.days')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
{/if}
