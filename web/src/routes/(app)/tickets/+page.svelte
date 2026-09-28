<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Send } from '@lucide/svelte';
	import { getUser } from '$lib/api';
	import {
		getTickets,
		getTicketDetail,
		replyTicket,
		updateTicket,
		getAssignees,
		type Ticket,
		type TicketReply,
		type Assignee
	} from '$lib/conversations/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { cn } from '$lib/utils';

	let tickets = $state<Ticket[]>([]);
	let assignees = $state<Assignee[]>([]);
	let statusFilter = $state('open');
	let priorityFilter = $state('');
	let escFilter = $state(false);
	let activeId = $state<string | null>(null);
	let detail = $state<{ ticket: Ticket; replies: TicketReply[] } | null>(null);
	let followupInput = $state('');

	// Agent: hanya membuat tiket + followup (tanpa ubah status/prioritas/assignee).
	const isAgent = $derived((getUser()?.role ?? '').toLowerCase() === 'agent');

	const assigneeName = $derived((id: string | null) => {
		if (!id) return $t('conversation.unassigned');
		return assignees.find((a) => a.id === id)?.full_name ?? '—';
	});

	const filtered = $derived(
		tickets.filter(
			(t) =>
				(!statusFilter || t.status === statusFilter) &&
				(!priorityFilter || t.priority === priorityFilter) &&
				(!escFilter || t.escalated)
		)
	);

	onMount(async () => {
		try {
			tickets = await getTickets();
		} catch { tickets = []; }
		try {
			assignees = await getAssignees();
		} catch { assignees = []; }
	});

	async function openTicket(id: string) {
		activeId = id;
		try {
			detail = await getTicketDetail(id);
		} catch { detail = null; }
	}

	async function refresh() {
		try {
			tickets = await getTickets();
		} catch { /* abaikan */ }
		if (activeId) await openTicket(activeId);
	}

	async function changeTicket(patch: { status?: string; priority?: string; assignee_id?: string | null; escalated?: boolean }) {
		if (!activeId) return;
		try {
			await updateTicket(activeId, patch);
			await refresh();
		} catch { /* abaikan */ }
	}

	async function sendFollowup() {
		if (!followupInput.trim() || !activeId) return;
		const body = followupInput.trim();
		followupInput = '';
		try {
			await replyTicket(activeId, body);
			await openTicket(activeId);
		} catch { /* abaikan */ }
	}

	function statusVariant(s: string): 'neon' | 'warn' | 'success' | 'neutral' {
		return s === 'open' ? 'neon' : s === 'pending' ? 'warn' : s === 'resolved' ? 'success' : 'neutral';
	}
	function priorityVariant(p: string): 'warn' | 'success' | 'danger' {
		return p === 'urgent' ? 'danger' : p === 'medium' ? 'warn' : 'success';
	}
</script>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<div>
		<h1 class="font-display text-xl font-semibold">{$t('nav.tickets')}</h1>
		<p class="mt-0.5 text-xs text-muted">{$t('ticketsPage.subtitle')}</p>
	</div>
	<div class="ml-auto flex items-center gap-1.5">
		<button
			type="button"
			onclick={() => (escFilter = !escFilter)}
			class={cn(
				'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
				escFilter ? 'border-danger bg-danger-soft text-danger' : 'border-line bg-surface text-muted hover:text-ink'
			)}
		>
			SPV
		</button>
		<Select
			value={statusFilter}
			placeholder={$t('ticketsPage.allStatus')}
			aria-label={$t('common.status')}
			options={[
				{ value: '__all', label: $t('ticketsPage.allStatus') },
				{ value: 'open', label: 'Open' },
				{ value: 'pending', label: 'Pending' },
				{ value: 'resolved', label: 'Resolved' },
				{ value: 'closed', label: 'Closed' }
			]}
			onchange={(v) => (statusFilter = v === '__all' ? '' : v)}
			class="w-36"
		/>
		<Select
			value={priorityFilter}
			placeholder={$t('ticketsPage.allPriority')}
			aria-label="Priority"
			options={[
				{ value: '__all', label: $t('ticketsPage.allPriority') },
				{ value: 'low', label: 'Low' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'urgent', label: 'Urgent' }
			]}
			onchange={(v) => (priorityFilter = v === '__all' ? '' : v)}
			class="w-36"
		/>
	</div>
</div>

{#if tickets.length === 0}
	<EmptyState title={$t('empty.ticketsTitle')} description={$t('empty.ticketsDesc')} />
{:else}
	<div class="grid min-h-0 gap-3 lg:grid-cols-[320px_1fr]">
		<Card>
			<div class="max-h-[calc(100vh-16rem)] space-y-1 overflow-y-auto">
				{#each filtered as tk (tk.id)}
					<button
						type="button"
						onclick={() => openTicket(tk.id)}
						class={cn(
							'w-full rounded-lg border p-2.5 text-left transition-colors',
							activeId === tk.id ? 'border-neon bg-neon-soft/30' : 'border-transparent hover:bg-raised'
						)}
					>
						<span class="block truncate text-xs font-medium">{tk.number} — {tk.subject}</span>
						<span class="mt-0.5 block truncate text-[10px] text-muted">
							{assigneeName(tk.assignee_id)} • {new Date(tk.created_at).toLocaleDateString()}
						</span>
						<span class="mt-1 flex flex-wrap gap-1">
							<Badge variant={statusVariant(tk.status)}>{tk.status}</Badge>
							<Badge variant={priorityVariant(tk.priority)}>{tk.priority}</Badge>
							{#if tk.escalated}
								<Badge variant="danger">SPV</Badge>
							{/if}
							{#if tk.status === 'open' && (tk.replies_count ?? 0) === 0}
								<Badge variant="warn">{$t('ticketsPage.needFollowup')}</Badge>
							{/if}
						</span>
					</button>
				{:else}
					<p class="py-6 text-center text-xs text-muted">{$t('ticketsPage.noMatch')}</p>
				{/each}
			</div>
		</Card>
		<Card title={detail ? `${detail.ticket.number} — ${detail.ticket.subject}` : $t('ticketsPage.detail')}>
			{#if !detail}
				<p class="py-8 text-center text-xs text-muted">{$t('ticketsPage.pick')}</p>
			{:else}
				<div class="space-y-3">
					<div class="flex flex-wrap gap-1">
						<Badge variant={statusVariant(detail.ticket.status)}>{detail.ticket.status}</Badge>
						<Badge variant={priorityVariant(detail.ticket.priority)}>{detail.ticket.priority}</Badge>
						{#if detail.ticket.escalated}
							<Badge variant="danger">SPV</Badge>
						{/if}
						{#if detail.ticket.status === 'open' && detail.replies.length === 0}
							<Badge variant="warn">{$t('ticketsPage.needFollowup')}</Badge>
						{/if}
					</div>
					{#if detail.ticket.description}
						<p class="rounded-md bg-raised p-2 text-xs text-muted">{detail.ticket.description}</p>
					{/if}
					{#if detail.ticket.custom_values && Object.keys(detail.ticket.custom_values).length > 0}
						<dl class="space-y-1 rounded-md bg-raised p-2 text-[11px]">
							{#each Object.entries(detail.ticket.custom_values) as [k, v] (k)}
								<div class="flex justify-between gap-2">
									<dt class="text-muted">{k}</dt>
									<dd class="font-medium">{v}</dd>
								</div>
							{/each}
						</dl>
					{/if}
					{#if !isAgent}
					<div class="grid grid-cols-3 gap-1.5">
						<Select
							value={detail.ticket.status}
							aria-label={$t('common.status')}
							options={[
								{ value: 'open', label: 'Open' },
								{ value: 'pending', label: 'Pending' },
								{ value: 'resolved', label: 'Resolved' },
								{ value: 'closed', label: 'Closed' }
							]}
							onchange={(v) => v && changeTicket({ status: v })}
						/>
						<Select
							value={detail.ticket.priority}
							aria-label="Priority"
							options={[
								{ value: 'low', label: 'Low' },
								{ value: 'medium', label: 'Medium' },
								{ value: 'urgent', label: 'Urgent' }
							]}
							onchange={(v) => v && changeTicket({ priority: v })}
						/>
						<Select
							value={detail.ticket.assignee_id ?? ''}
							placeholder={$t('conversation.unassigned')}
							aria-label={$t('conversation.assignee')}
							options={[
								{ value: '__none', label: $t('conversation.unassigned') },
								...assignees.map((a) => ({ value: a.id, label: `${a.full_name} (${a.role || '—'})` }))
							]}
							onchange={(v) => changeTicket({ assignee_id: v === '__none' ? null : v })}
						/>
					</div>
					<label class="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs transition-colors hover:border-line-strong">
						<input
							type="checkbox"
							checked={detail.ticket.escalated}
							onchange={(e) => changeTicket({ escalated: (e.target as HTMLInputElement).checked })}
							class="size-4 accent-[var(--neon)]"
						/>
						<span class="font-medium">{$t('conversation.escalateTicket')}</span>
					</label>
					{/if}
					<div class="space-y-1.5 border-t border-line pt-2">
						<p class="text-[11px] font-medium">{$t('conversation.followup')}</p>
						{#each detail.replies as r (r.id)}
							<div class="rounded-md bg-raised p-2 text-[11px]">
								<p>{r.body}</p>
								<p class="mt-0.5 text-[10px] text-faint">{r.author_type} • {new Date(r.created_at).toLocaleString()}</p>
							</div>
						{:else}
							<p class="text-[11px] text-faint">{$t('conversation.noFollowup')}</p>
						{/each}
						<div class="flex gap-1.5">
							<Input bind:value={followupInput} placeholder={$t('conversation.followupPh')} onkeydown={(e) => e.key === 'Enter' && sendFollowup()} />
							<Button size="sm" onclick={sendFollowup} disabled={!followupInput.trim()}><Send size={13} /></Button>
						</div>
					</div>
				</div>
			{/if}
		</Card>
	</div>
{/if}
