<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Plus, Trash2, History, X, GripVertical } from '@lucide/svelte';
	import {
		getBoards,
		createBoard,
		getBoard,
		deleteBoard,
		createColumn,
		deleteColumn,
		createCard,
		moveCard,
		deleteCard,
		getCardMoves,
		type BoardSummary,
		type BoardDetail,
		type CardMove
	} from '$lib/kanban/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { cn } from '$lib/utils';

	let boards = $state<BoardSummary[]>([]);
	let activeBoard = $state<BoardDetail | null>(null);
	let newBoardName = $state('');
	let newColName = $state('');
	let newCardTitle = $state('');
	let newCardCol = $state('');
	let dragCard = $state<string | null>(null);
	let historyCard = $state<string | null>(null);
	let moves = $state<CardMove[]>([]);

	onMount(async () => {
		await loadBoards();
	});

	async function loadBoards() {
		try {
			boards = await getBoards();
		} catch { boards = []; }
		if (boards.length > 0 && !activeBoard) await openBoard(boards[0].id);
	}

	async function openBoard(id: string) {
		try {
			activeBoard = await getBoard(id);
		} catch { activeBoard = null; }
	}

	async function addBoard() {
		if (!newBoardName.trim()) return;
		try {
			const res = await createBoard(newBoardName.trim());
			newBoardName = '';
			await loadBoards();
			await openBoard(res.id);
		} catch { /* abaikan */ }
	}

	async function removeBoard(id: string) {
		if (!confirm($t('common.confirmDeleteBoard'))) return;
		try {
			await deleteBoard(id);
			if (activeBoard?.id === id) activeBoard = null;
			await loadBoards();
		} catch { /* abaikan */ }
	}

	async function addColumn() {
		if (!newColName.trim() || !activeBoard) return;
		try {
			await createColumn(activeBoard.id, newColName.trim());
			newColName = '';
			await openBoard(activeBoard.id);
		} catch { /* abaikan */ }
	}

	async function addCard() {
		if (!newCardTitle.trim() || !newCardCol || !activeBoard) return;
		try {
			await createCard({ column_id: newCardCol, title: newCardTitle.trim() });
			newCardTitle = '';
			await openBoard(activeBoard.id);
		} catch { /* abaikan */ }
	}

	function onDragStart(cardId: string, e: DragEvent) {
		dragCard = cardId;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	async function onDrop(colId: string, e: DragEvent) {
		e.preventDefault();
		if (!dragCard || !activeBoard) return;
		const cardId = dragCard;
		dragCard = null;
		try {
			await moveCard(cardId, colId);
			await openBoard(activeBoard.id);
		} catch { /* abaikan */ }
	}

	async function openHistory(cardId: string) {
		historyCard = cardId;
		try {
			moves = await getCardMoves(cardId);
		} catch { moves = []; }
	}

	async function removeCard(cardId: string) {
		if (!confirm($t('common.confirmDeleteCard'))) return;
		try {
			await deleteCard(cardId);
			if (activeBoard) await openBoard(activeBoard.id);
		} catch { /* abaikan */ }
	}
</script>

<div class="mb-4 flex flex-wrap items-center gap-2">
	<div>
		<h1 class="font-display text-xl font-semibold">{$t('kanban.title')}</h1>
		<p class="mt-0.5 text-xs text-muted">{$t('kanban.subtitle')}</p>
	</div>
	<div class="ml-auto flex items-center gap-1.5">
		<Input bind:value={newBoardName} placeholder={$t('kanban.boardNamePh')} class="w-44" />
		<Button size="sm" onclick={addBoard}><Plus size={13} /> {$t('kanban.board')}</Button>
	</div>
</div>

<div class="mb-3 flex gap-1.5 overflow-x-auto pb-1">
	{#each boards as b (b.id)}
		<div class="flex shrink-0 items-center gap-1">
			<button
				type="button"
				onclick={() => openBoard(b.id)}
				class={cn(
					'rounded-lg border px-3 py-1.5 text-xs font-medium',
					activeBoard?.id === b.id ? 'border-neon bg-neon-soft text-neon-text' : 'border-line bg-surface text-muted hover:text-ink'
				)}
			>
				{b.name}
				<span class="ml-1 text-[10px] text-faint">{b.cards}</span>
			</button>
			<button type="button" onclick={() => removeBoard(b.id)} class="text-faint hover:text-danger" aria-label={$t('kanban.deleteBoard')}>
				<Trash2 size={13} />
			</button>
		</div>
	{:else}
		<p class="text-xs text-muted">{$t('kanban.noBoards')}</p>
	{/each}
</div>

{#if activeBoard}
	<div class="mb-3 flex items-center gap-1.5">
		<Input bind:value={newColName} placeholder={$t('kanban.newColPh')} class="w-44" />
		<Button size="sm" variant="outline" onclick={addColumn}>{$t('kanban.addColumn')}</Button>
		<span class="mx-1 h-4 w-px bg-line"></span>
		<Input bind:value={newCardTitle} placeholder={$t('kanban.newCardPh')} class="w-52" />
		<select
			bind:value={newCardCol}
			class="rounded-lg border border-line bg-surface px-2 py-2 text-xs focus:border-neon focus:outline-none"
			aria-label={$t('kanban.addCard')}
		>
			<option value="">{$t('kanban.colPh')}</option>
			{#each activeBoard.columns as c (c.id)}
				<option value={c.id}>{c.name}</option>
			{/each}
		</select>
		<Button size="sm" variant="outline" onclick={addCard}>{$t('kanban.addCard')}</Button>
	</div>

	<div class="grid auto-cols-[260px] grid-flow-col items-start gap-3 overflow-x-auto pb-4">
		{#each activeBoard.columns as col (col.id)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex max-h-[calc(100vh-22rem)] min-h-40 flex-col rounded-xl border border-line bg-raised/40"
				ondragover={(e) => e.preventDefault()}
				ondrop={(e) => onDrop(col.id, e)}
			>
				<div class="flex items-center justify-between px-3 py-2">
					<p class="text-xs font-semibold">{col.name} <span class="text-faint">({col.cards.length})</span></p>
					<button type="button" onclick={() => deleteColumn(col.id).then(() => activeBoard && openBoard(activeBoard.id))} class="text-faint hover:text-danger" aria-label={$t('kanban.deleteColumn')}>
						<X size={13} />
					</button>
				</div>
				<div class="min-h-10 flex-1 space-y-2 overflow-y-auto p-2">
					{#each col.cards as card (card.id)}
						<div
							role="listitem"
							draggable="true"
							ondragstart={(e) => onDragStart(card.id, e)}
							class={cn(
								'cursor-grab rounded-lg border border-line bg-surface p-2.5 shadow-sm active:cursor-grabbing',
								dragCard === card.id && 'opacity-50'
							)}
						>
							<div class="flex items-start gap-1.5">
								<GripVertical size={13} class="mt-0.5 shrink-0 text-faint" />
								<p class="min-w-0 flex-1 text-xs font-medium">{card.title}</p>
							</div>
							{#if card.description}
								<p class="mt-1 line-clamp-2 text-[11px] text-muted">{card.description}</p>
							{/if}
							<div class="mt-1.5 flex items-center gap-1">
								{#if card.assignee_name}
									<Badge variant="neutral">{card.assignee_name}</Badge>
								{/if}
								<span class="ml-auto flex gap-1">
									<button type="button" onclick={() => openHistory(card.id)} class="rounded p-1 text-faint hover:text-ink" aria-label={$t('kanban.history')}>
										<History size={13} />
									</button>
									<button type="button" onclick={() => removeCard(card.id)} class="rounded p-1 text-faint hover:text-danger" aria-label={$t('kanban.deleteCard')}>
										<Trash2 size={13} />
									</button>
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if historyCard}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label={$t('kanban.history')}>
		<Card title={$t('kanban.history')} class="w-full max-w-md">
			{#snippet actions()}
				<button type="button" onclick={() => (historyCard = null)} class="text-muted hover:text-ink" aria-label={$t('kanban.closeHistory')}>
					<X size={15} />
				</button>
			{/snippet}
			<div class="max-h-80 space-y-1.5 overflow-y-auto">
				{#each moves as m (m.id)}
					<div class="rounded-md bg-raised px-3 py-1.5 text-xs">
						<p><span class="font-medium">{m.from ?? '—'}</span> → <span class="font-medium">{m.to ?? '—'}</span></p>
						<p class="mt-0.5 text-[10px] text-faint">{m.moved_by ?? 'sistem'} • {new Date(m.created_at).toLocaleString()}</p>
					</div>
				{:else}
					<p class="py-4 text-center text-xs text-muted">{$t('kanban.noMoves')}</p>
				{/each}
			</div>
		</Card>
	</div>
{/if}
