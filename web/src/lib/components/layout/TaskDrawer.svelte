<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { ListTodo, Ticket, SquareKanban, X } from '@lucide/svelte';
	import { getMyCards, getMyTickets, type MyCard, type MyTicket } from '$lib/kanban/api';
	import { cn } from '$lib/utils';
	import { browser } from '$app/environment';

	let open = $state(false);
	let tickets = $state<MyTicket[]>([]);
	let cards = $state<MyCard[]>([]);

	const count = $derived(tickets.length + cards.length);

	// Posisi floating button — draggable tapi dikunci di dalam layar.
	const SIZE = 52;
	const MARGIN = 12;
	let pos = $state({ x: 0, y: 0 });
	let placed = $state(false);

	function clamp(x: number, y: number) {
		if (!browser) return { x, y };
		const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
		const maxY = Math.max(MARGIN, window.innerHeight - SIZE - MARGIN);
		return {
			x: Math.min(Math.max(MARGIN, x), maxX),
			y: Math.min(Math.max(MARGIN, y), maxY)
		};
	}

	function defaultPos() {
		if (!browser) return { x: 0, y: 0 };
		return { x: window.innerWidth - SIZE - 24, y: window.innerHeight - SIZE - 96 };
	}

	function loadPos() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem('crm.tasks_fab');
			if (raw) {
				const p = JSON.parse(raw) as { x: number; y: number };
				pos = clamp(p.x, p.y);
				placed = true;
				return;
			}
		} catch { /* abaikan */ }
		pos = defaultPos();
		placed = true;
	}

	function savePos() {
		if (!browser) return;
		localStorage.setItem('crm.tasks_fab', JSON.stringify(pos));
	}

	let dragging = $state(false);
	let moved = $state(false);
	let suppressClick = false;
	let grab = { dx: 0, dy: 0 };

	function onPointerDown(e: PointerEvent) {
		loadPosIfNeeded();
		dragging = true;
		moved = false;
		grab = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const next = clamp(e.clientX - grab.dx, e.clientY - grab.dy);
		if (Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 4) moved = true;
		pos = next;
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (moved) {
			savePos();
			suppressClick = true;
		}
	}

	function onClick() {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		void toggle();
	}

	function loadPosIfNeeded() {
		if (!placed) loadPos();
	}

	async function toggle() {
		open = !open;
		if (open) await load();
	}

	async function load() {
		try {
			const [t, c] = await Promise.all([getMyTickets(), getMyCards()]);
			tickets = t.filter((x) => x.status === 'open' || x.status === 'pending');
			cards = c;
		} catch { /* abaikan */ }
	}

	function goTicket() {
		open = false;
		goto('/tickets');
	}

	function goCard(boardId: string) {
		open = false;
		goto(`/kanban?board=${boardId}`);
	}

	$effect(() => {
		loadPos();
		if (!browser) return;
		const onResize = () => {
			pos = clamp(pos.x, pos.y);
		};
		window.addEventListener('resize', onResize);
		void load();
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<!-- Floating trigger: draggable, terkunci di dalam viewport -->
{#if placed}
	<button
		type="button"
		class={cn(
			'fixed z-40 flex touch-none items-center justify-center rounded-full bg-neon text-on-neon shadow-xl shadow-neon/30 transition-shadow hover:shadow-neon/50 focus:outline-none',
			dragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
		)}
		style="left: {pos.x}px; top: {pos.y}px; width: {SIZE}px; height: {SIZE}px;"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onclick={onClick}
		aria-label={$t('tasks.title')}
		title={$t('tasks.title')}
	>
		<ListTodo size={22} />
		{#if count > 0}
			<span class="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-danger font-mono text-[10px] font-bold text-white">
				{count > 9 ? '9+' : count}
			</span>
		{/if}
	</button>
{/if}

<!-- Drawer -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
		aria-label={$t('common.close')}
		onclick={() => (open = false)}
	></button>
	<aside class="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[90vw] flex-col border-l border-line bg-surface shadow-2xl">
		<div class="flex items-center justify-between border-b border-line px-4 py-3">
			<p class="font-display text-sm font-semibold">{$t('tasks.title')} ({count})</p>
			<button
				type="button"
				onclick={() => (open = false)}
				class="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
				aria-label={$t('common.close')}
			>
				<X size={16} />
			</button>
		</div>
		<div class="flex-1 space-y-4 overflow-y-auto p-3">
			<div>
				<p class="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-faint">
					<Ticket size={12} /> {$t('tasks.myTickets')}
				</p>
				{#if tickets.length === 0}
					<p class="rounded-lg bg-raised px-3 py-2 text-[11px] text-muted">{$t('tasks.noTickets')}</p>
				{:else}
					<div class="space-y-1">
						{#each tickets as tk (tk.id)}
							<button
								type="button"
								onclick={goTicket}
								class="w-full rounded-lg border border-line p-2 text-left transition-colors hover:border-neon/50"
							>
								<span class="block truncate text-xs font-medium">{tk.number} — {tk.subject}</span>
								<span class="mt-0.5 block text-[10px] text-muted">{tk.status} • {tk.priority}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<div>
				<p class="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-faint">
					<SquareKanban size={12} /> {$t('tasks.myCards')}
				</p>
				{#if cards.length === 0}
					<p class="rounded-lg bg-raised px-3 py-2 text-[11px] text-muted">{$t('tasks.noCards')}</p>
				{:else}
					<div class="space-y-1">
						{#each cards as c (c.id)}
							<button
								type="button"
								onclick={() => goCard(c.board_id)}
								class="w-full rounded-lg border border-line p-2 text-left transition-colors hover:border-neon/50"
							>
								<span class="block truncate text-xs font-medium">{c.title}</span>
								<span class="mt-0.5 block truncate text-[10px] text-muted">{c.board_name} • {c.column_name}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</aside>
{/if}
