<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Plus, Trash2, X, GripVertical, History } from '@lucide/svelte';
	import {
		getStages,
		getDeals,
		createDeal,
		getDealDetail,
		updateDeal,
		deleteDeal,
		getSalesSummary,
		formatIDR,
		type Deal,
		type SalesStage,
		type DealMove,
		type SalesSummaryRow
	} from '$lib/sales/api';
	import { getAssignees, type Assignee } from '$lib/conversations/api';
	import { getUser } from '$lib/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { cn } from '$lib/utils';

	const isAgent = $derived((getUser()?.role ?? '').toLowerCase() === 'agent');

	let stages = $state<SalesStage[]>([]);
	let deals = $state<Deal[]>([]);
	let summary = $state<SalesSummaryRow[]>([]);
	let assignees = $state<Assignee[]>([]);
	let dragDeal = $state<string | null>(null);

	let newTitle = $state('');
	let newValue = $state('');
	let newClose = $state('');
	let newStage = $state('');

	let detail = $state<Deal | null>(null);
	let moves = $state<DealMove[]>([]);
	let editNotes = $state('');
	let lostInput = $state('');

	const totalOpen = $derived(
		summary.filter((s) => !s.is_won && !s.is_lost).reduce((a, s) => a + (s.value ?? 0), 0)
	);
	const totalWon = $derived(
		summary.filter((s) => s.is_won).reduce((a, s) => a + (s.value ?? 0), 0)
	);

	const dealsByStage = $derived((stageId: string) => deals.filter((d) => d.stage_id === stageId));

	onMount(async () => {
		await reload();
		try {
			assignees = await getAssignees();
		} catch { assignees = []; }
	});

	async function reload() {
		try {
			[stages, deals, summary] = await Promise.all([getStages(), getDeals(), getSalesSummary()]);
		} catch {
			stages = [];
			deals = [];
			summary = [];
		}
	}

	async function addDeal() {
		if (!newTitle.trim()) return;
		try {
			await createDeal({
				title: newTitle.trim(),
				value: Number(newValue) || 0,
				expected_close: newClose || undefined,
				stage_id: newStage || undefined
			});
			newTitle = '';
			newValue = '';
			newClose = '';
			newStage = '';
			await reload();
		} catch { /* abaikan */ }
	}

	async function openDetail(id: string) {
		try {
			const res = await getDealDetail(id);
			detail = res.deal;
			moves = res.moves;
			editNotes = res.deal.notes ?? '';
		} catch { detail = null; }
	}

	async function saveNotes() {
		if (!detail) return;
		try {
			await updateDeal(detail.id, { notes: editNotes });
			await reload();
			await openDetail(detail.id);
		} catch { /* abaikan */ }
	}

	async function removeDeal(id: string) {
		const ok = await askConfirm({ title: $t('sales.confirmDelete'), danger: true });
		if (!ok) return;
		try {
			await deleteDeal(id);
			detail = null;
			await reload();
		} catch { /* abaikan */ }
	}

	function onDragStart(id: string, e: DragEvent) {
		dragDeal = id;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	async function onDrop(stageId: string, e: DragEvent) {
		e.preventDefault();
		if (!dragDeal) return;
		const id = dragDeal;
		dragDeal = null;
		const d = deals.find((x) => x.id === id);
		if (!d || d.stage_id === stageId) return;
		try {
			await updateDeal(id, { stage_id: stageId });
			await reload();
			if (detail?.id === id) await openDetail(id);
		} catch { /* abaikan */ }
	}
</script>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<div>
		<h1 class="font-display text-xl font-semibold">{$t('sales.title')}</h1>
		<p class="mt-0.5 text-xs text-muted">{$t('sales.subtitle')}</p>
	</div>
	<div class="ml-auto flex items-center gap-2">
		<div class="rounded-lg border border-line bg-surface px-3 py-1.5 text-right">
			<p class="text-[10px] text-faint">{$t('sales.openValue')}</p>
			<p class="font-mono text-sm font-semibold text-neon-text">{formatIDR(totalOpen)}</p>
		</div>
		<div class="rounded-lg border border-line bg-surface px-3 py-1.5 text-right">
			<p class="text-[10px] text-faint">{$t('sales.wonValue')}</p>
			<p class="font-mono text-sm font-semibold">{formatIDR(totalWon)}</p>
		</div>
	</div>
</div>

<div class="mb-3 grid grid-cols-2 items-center gap-1.5 lg:grid-cols-[minmax(0,1fr)_150px_160px_150px_auto]">
	<Input bind:value={newTitle} placeholder={$t('sales.dealTitlePh')} />
	<Input bind:value={newValue} type="number" placeholder={$t('sales.valuePh')} />
	<Input bind:value={newClose} type="date" aria-label={$t('sales.closePh')} />
	<Select
		value={newStage}
		placeholder={$t('sales.stagePh')}
		aria-label={$t('sales.stagePh')}
		options={stages.map((s) => ({ value: s.id, label: s.name }))}
		onchange={(v) => (newStage = v)}
	/>
	<Button size="sm" onclick={addDeal} disabled={!newTitle.trim()}><Plus size={13} /> {$t('sales.addDeal')}</Button>
</div>

<div class="grid auto-cols-[270px] grid-flow-col items-start gap-3 overflow-x-auto pb-4">
	{#each stages as st (st.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex max-h-[calc(100vh-24rem)] min-h-40 flex-col rounded-xl border border-line bg-raised/40"
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => onDrop(st.id, e)}
		>
			<div class="flex items-center justify-between px-3 py-2">
				<p class="text-xs font-semibold">
					{st.name}
					<span class="font-normal text-faint">({dealsByStage(st.id).length})</span>
				</p>
				<span class="font-mono text-[10px] text-muted">
					{formatIDR(dealsByStage(st.id).reduce((a, d) => a + (d.value ?? 0), 0))}
				</span>
			</div>
			<div class="min-h-10 flex-1 space-y-2 overflow-y-auto p-2">
				{#each dealsByStage(st.id) as d (d.id)}
					<div
						role="listitem"
						draggable="true"
						ondragstart={(e) => onDragStart(d.id, e)}
						class={cn(
							'cursor-grab rounded-lg border border-line bg-surface p-2.5 shadow-sm active:cursor-grabbing',
							dragDeal === d.id && 'opacity-50'
						)}
					>
						<div class="flex items-start gap-1.5">
							<GripVertical size={13} class="mt-0.5 shrink-0 text-faint" />
							<button type="button" onclick={() => openDetail(d.id)} class="min-w-0 flex-1 text-left">
								<p class="truncate text-xs font-medium hover:text-neon-text">{d.number} — {d.title}</p>
							</button>
						</div>
						<p class="mt-1 font-mono text-xs font-semibold text-neon-text">{formatIDR(d.value ?? 0)}</p>
						<div class="mt-1.5 flex items-center gap-1 text-[10px] text-muted">
							{#if d.contact_name}<span class="truncate">{d.contact_name}</span>{/if}
							{#if d.owner_name}<span class="ml-auto shrink-0 rounded bg-raised px-1.5 py-px">{d.owner_name}</span>{/if}
						</div>
						{#if d.expected_close}
							<p class="mt-1 text-[10px] text-faint">⏰ {d.expected_close}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

{#if detail}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) detail = null; }} role="presentation">
		<div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface shadow-xl">
			<div class="flex items-center justify-between border-b border-line p-4">
				<div>
					<h2 class="font-semibold">{detail.number} — {detail.title}</h2>
					<p class="font-mono text-xs text-neon-text">{formatIDR(detail.value ?? 0)} • {detail.probability ?? 0}%</p>
				</div>
				<button onclick={() => (detail = null)} class="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-raised" aria-label={$t('common.close')}>
					<X size={16} />
				</button>
			</div>
			<div class="space-y-3 p-4">
				{#if !isAgent}
					<div>
						<p class="mb-1 text-[11px] font-medium text-muted">{$t('sales.owner')}</p>
						<Select
							value={detail.owner_id ?? ''}
							placeholder={$t('conversation.unassigned')}
							aria-label={$t('sales.owner')}
							options={[
								{ value: '__none', label: $t('conversation.unassigned') },
								...assignees.map((a) => ({ value: a.id, label: `${a.full_name} (${a.role || '—'})` }))
							]}
							onchange={async (v) => {
								if (!detail) return;
								await updateDeal(detail.id, { owner_id: v === '__none' ? null : v });
								await reload();
								await openDetail(detail.id);
							}}
						/>
					</div>
				{/if}
				<div>
					<p class="mb-1 text-[11px] font-medium text-muted">{$t('sales.notes')}</p>
					<textarea
						bind:value={editNotes}
						rows="3"
						class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
					></textarea>
					<div class="mt-1.5 flex justify-end">
						<Button size="sm" variant="outline" onclick={saveNotes}>{$t('common.save')}</Button>
					</div>
				</div>
				{#if detail.lost_reason}
					<p class="rounded-md bg-danger-soft p-2 text-[11px] text-danger">{$t('sales.lostReason')}: {detail.lost_reason}</p>
				{/if}
				<div>
					<p class="mb-1 text-[11px] font-medium text-muted">{$t('sales.lostReasonPh')}</p>
					<div class="flex gap-1.5">
						<Input bind:value={lostInput} placeholder={$t('sales.lostReasonPh')} />
						<Button
							size="sm"
							variant="outline"
							onclick={async () => {
								if (!detail || !lostInput.trim()) return;
								await updateDeal(detail.id, { lost_reason: lostInput.trim() });
								lostInput = '';
								await reload();
								await openDetail(detail.id);
							}}
						>
							{$t('common.save')}
						</Button>
					</div>
				</div>
				<div>
					<p class="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted"><History size={12} /> {$t('sales.history')}</p>
					{#each moves as m (m.id)}
						<p class="rounded-md bg-raised px-2 py-1 text-[11px] text-muted">
							{m.from ?? '—'} → <span class="font-medium text-ink">{m.to ?? '—'}</span>
							{#if m.by} • {m.by}{/if} • {new Date(m.created_at).toLocaleString()}
						</p>
					{:else}
						<p class="text-[11px] text-faint">{$t('kanban.noMoves')}</p>
					{/each}
				</div>
				<div class="flex justify-end border-t border-line pt-3">
					<Button size="sm" variant="outline" onclick={() => detail && removeDeal(detail.id)} class="text-danger">
						<Trash2 size={13} /> {$t('common.delete')}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
