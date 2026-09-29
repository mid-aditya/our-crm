<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Pencil } from '@lucide/svelte';
	import {
		getTargets,
		setTarget,
		getScoreboard,
		type ScoreRow
	} from '$lib/team/api';
	import { formatIDR } from '$lib/sales/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { cn } from '$lib/utils';

	const thisMonth = new Date().toISOString().slice(0, 7);
	let period = $state(thisMonth);
	let rows = $state<ScoreRow[]>([]);
	let editing = $state<ScoreRow | null>(null);
	let form = $state({ chats_target: 0, tickets_target: 0, deals_target: 0, deals_value_target: 0 });

	function pct(real: number, target: number): number {
		if (target <= 0) return real > 0 ? 100 : 0;
		return Math.round((real * 100) / target);
	}

	function pctVariant(p: number): 'success' | 'warn' | 'danger' {
		return p >= 100 ? 'success' : p >= 50 ? 'warn' : 'danger';
	}

	function fmtFrt(sec: number | null): string {
		if (sec == null) return '—';
		if (sec < 60) return `${sec}dtk`;
		const m = Math.floor(sec / 60);
		if (m < 60) return `${m}mnt`;
		return `${Math.floor(m / 60)}j ${m % 60}mnt`;
	}

	onMount(async () => {
		await reload();
	});

	async function reload() {
		try {
			rows = await getScoreboard(period);
		} catch {
			rows = [];
		}
	}

	function startEdit(r: ScoreRow) {
		editing = r;
		form = {
			chats_target: r.chats_target,
			tickets_target: r.tickets_target,
			deals_target: r.deals_target,
			deals_value_target: r.deals_value_target
		};
	}

	async function saveTarget() {
		if (!editing) return;
		try {
			await setTarget({ user_id: editing.user_id, period, ...form });
			editing = null;
			await reload();
		} catch { /* abaikan */ }
	}
</script>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<div>
		<h1 class="font-display text-xl font-semibold">{$t('productivity.title')}</h1>
		<p class="mt-0.5 text-xs text-muted">{$t('productivity.subtitle')}</p>
	</div>
	<div class="ml-auto">
		<Input bind:value={period} type="month" aria-label={$t('productivity.period')} class="w-44" onchange={reload} />
	</div>
</div>

<Card>
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-line text-left text-[11px] font-medium text-muted">
					<th class="px-3 py-2 font-medium">{$t('employees.colName')}</th>
					<th class="px-3 py-2 text-right font-medium">{$t('productivity.colChats')}</th>
					<th class="px-3 py-2 text-right font-medium">{$t('productivity.colTickets')}</th>
					<th class="px-3 py-2 text-right font-medium">{$t('productivity.colDeals')}</th>
					<th class="px-3 py-2 text-right font-medium">{$t('productivity.colValue')}</th>
					<th class="px-3 py-2 text-right font-medium">FRT</th>
					<th class="px-3 py-2 text-right font-medium">{$t('productivity.colPresent')}</th>
					<th class="px-3 py-2 text-right font-medium"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each rows as r (r.user_id)}
					<tr class="hover:bg-raised/50">
						<td class="px-3 py-2">
							<p class="text-xs font-medium">{r.full_name}</p>
							<p class="text-[10px] text-faint">{r.role || '—'}</p>
						</td>
						<td class="px-3 py-2 text-right">
							<span class="font-mono text-xs">{r.chats_done}/{r.chats_target}</span>
							<Badge variant={pctVariant(pct(r.chats_done, r.chats_target))}>{pct(r.chats_done, r.chats_target)}%</Badge>
						</td>
						<td class="px-3 py-2 text-right">
							<span class="font-mono text-xs">{r.tickets_done}/{r.tickets_target}</span>
							<Badge variant={pctVariant(pct(r.tickets_done, r.tickets_target))}>{pct(r.tickets_done, r.tickets_target)}%</Badge>
						</td>
						<td class="px-3 py-2 text-right">
							<span class="font-mono text-xs">{r.deals_won}/{r.deals_target}</span>
							<Badge variant={pctVariant(pct(r.deals_won, r.deals_target))}>{pct(r.deals_won, r.deals_target)}%</Badge>
						</td>
						<td class="px-3 py-2 text-right">
							<span class="block font-mono text-xs">{formatIDR(r.deals_value)}</span>
							<span class="text-[10px] text-faint">/ {formatIDR(r.deals_value_target)}</span>
						</td>
						<td class="px-3 py-2 text-right font-mono text-xs">{fmtFrt(r.avg_frt_seconds)}</td>
						<td class="px-3 py-2 text-right font-mono text-xs">{r.present_days} {$t('productivity.days')}</td>
						<td class="px-3 py-2 text-right">
							<button type="button" onclick={() => startEdit(r)} class="rounded p-1.5 text-faint hover:text-ink" aria-label={$t('productivity.setTarget')}>
								<Pencil size={14} />
							</button>
						</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="px-3 py-8 text-center text-xs text-muted">{$t('common.empty')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>

{#if editing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) editing = null; }} role="presentation">
		<div class="w-full max-w-sm rounded-2xl border border-line bg-surface shadow-xl">
			<div class="border-b border-line p-4">
				<h2 class="font-semibold">{$t('productivity.setTarget')}</h2>
				<p class="text-xs text-muted">{editing.full_name} • {period}</p>
			</div>
			<div class="grid grid-cols-2 gap-2 p-4">
				<div>
					<p class="mb-1 text-[11px] text-muted">{$t('productivity.colChats')}</p>
					<Input bind:value={form.chats_target} type="number" />
				</div>
				<div>
					<p class="mb-1 text-[11px] text-muted">{$t('productivity.colTickets')}</p>
					<Input bind:value={form.tickets_target} type="number" />
				</div>
				<div>
					<p class="mb-1 text-[11px] text-muted">{$t('productivity.colDeals')}</p>
					<Input bind:value={form.deals_target} type="number" />
				</div>
				<div>
					<p class="mb-1 text-[11px] text-muted">{$t('productivity.colValue')}</p>
					<Input bind:value={form.deals_value_target} type="number" />
				</div>
			</div>
			<div class="flex justify-end gap-2 border-t border-line p-4">
				<Button size="sm" variant="ghost" onclick={() => (editing = null)}>{$t('common.cancel')}</Button>
				<Button size="sm" onclick={saveTarget}>{$t('common.save')}</Button>
			</div>
		</div>
	</div>
{/if}
