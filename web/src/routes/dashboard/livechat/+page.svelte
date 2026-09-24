<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Search, Send, CheckCircle, Users, ChevronDown } from '@lucide/svelte';
	import { getToken, getCompanyId } from '$lib/api';
	import { agentStore } from '$lib/livechat/agent-store.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	const COMPANY_ID = getCompanyId() ?? '00000000-0000-0000-0000-000000000001';

	let search = $state('');
	let messageInput = $state('');
	let messagesEl = $state<HTMLDivElement | null>(null);
	let assignOpen = $state(false);

	const currentAgentId = $derived('self'); // ponytail: derive from auth store

	const filteredQueue = $derived(
		agentStore.queue.filter(
			(s: typeof agentStore.queue[0]) =>
				!search ||
				(s.visitor_name ?? 'Guest').toLowerCase().includes(search.toLowerCase()) ||
				s.visitor_id.toLowerCase().includes(search.toLowerCase())
		)
	);

	const onlineAgents = $derived(agentStore.agents.length);

	const agentOptions = $derived([
		{ value: 'take', label: $t('livechat.take') },
		...agentStore.agents.map((a: typeof agentStore.agents[0]) => ({
			value: a.id,
			label: `${a.full_name} (${a.active_sessions})`
		}))
	]);

	$effect(() => {
		if (messagesEl && agentStore.messages.length) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	});

	onMount(() => {
		const token = getToken();
		if (token) {
			agentStore.init(COMPANY_ID, token);
		}
		return () => agentStore.destroy();
	});

	function timeAgo(iso: string | null): string {
		if (!iso) return '';
		const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (diff < 60) return `${diff}s`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		return `${Math.floor(diff / 3600)}h`;
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	async function handleSend() {
		if (!messageInput.trim() || !agentStore.activeSession) return;
		await agentStore.sendMessage(agentStore.activeSession.id, messageInput.trim());
		messageInput = '';
	}

	async function handleAssign(sessionId: string, value: string) {
		if (value === 'take') {
			await agentStore.takeSession(sessionId);
		} else {
			await agentStore.assignSession(sessionId, value);
		}
		assignOpen = false;
	}

	async function handleResolve() {
		if (!agentStore.activeSession) return;
		await agentStore.resolveSession(agentStore.activeSession.id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function sessionStatusBadge(session: typeof agentStore.queue[0]) {
		if (session.status === 'waiting') return { variant: 'neon' as const, text: $t('livechat.waiting') };
		if (session.status === 'resolved') return { variant: 'neutral' as const, text: $t('common.resolved') };
		if (session.assigned_agent_id === currentAgentId) {
			return { variant: 'success' as const, text: $t('livechat.assignedToYou') };
		}
		return { variant: 'neutral' as const, text: session.assigned_agent_name ?? $t('livechat.assigned') };
	}
</script>

<div class="flex h-[calc(100vh-8rem)] gap-4">
	<!-- Queue Panel -->
	<aside class="flex w-80 shrink-0 flex-col gap-3">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h1 class="text-lg font-semibold">{$t('livechat.title')}</h1>
			<Badge variant="success" dot>
				<Users size={11} />
				{$t('livechat.agentsOnline', { values: { count: onlineAgents } })}
			</Badge>
		</div>

		<!-- Search -->
		<div class="relative">
			<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
			<Input
				bind:value={search}
				placeholder={$t('contacts.search')}
				class="pl-9"
			/>
		</div>

		<!-- Queue List -->
		<div class="flex flex-1 flex-col gap-2 overflow-y-auto">
			{#if filteredQueue.length === 0}
				<p class="py-8 text-center text-sm text-muted">{$t('livechat.noQueue')}</p>
			{:else}
				{#each filteredQueue as session (session.id)}
					{@const badge = sessionStatusBadge(session)}
					<button
						type="button"
						class="w-full text-left rounded-lg border p-3 transition-colors hover:border-neon/50 {agentStore.activeSession?.id === session.id ? 'border-neon bg-neon-soft/30' : 'border-line bg-surface hover:bg-raised'}"
						onclick={() => agentStore.selectSession(session)}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">
									{session.visitor_name ?? `Guest ${session.visitor_id.slice(-6)}`}
								</p>
								{#if session.last_message}
									<p class="mt-0.5 truncate text-xs text-muted">{session.last_message}</p>
								{/if}
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1">
								<Badge variant={badge.variant}>{badge.text}</Badge>
								<span class="text-[10px] text-muted">
									{timeAgo(session.waiting_since)} ago
								</span>
							</div>
						</div>

						<!-- Assign dropdown -->
						<div class="mt-2 flex items-center gap-1">
							<div class="relative flex-1">
								<select
									class="w-full appearance-none rounded-md border border-line bg-raised px-2 py-1 text-xs text-muted focus:border-neon focus:outline-none"
									onchange={(e) => {
										const val = (e.target as HTMLSelectElement).value;
										if (val) handleAssign(session.id, val);
										(e.target as HTMLSelectElement).value = '';
									}}
								>
									<option value="">{$t('livechat.assign')}</option>
									<option value="take">{$t('livechat.take')}</option>
									{#each agentStore.agents as agent (agent.id)}
										<option value={agent.id}>
											{agent.full_name} ({agent.active_sessions})
										</option>
									{/each}
								</select>
								<ChevronDown size={12} class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Distribution Toggle -->
		<div class="rounded-lg border border-line bg-surface p-3">
			<p class="mb-2 text-xs font-medium">{$t('livechat.distribution.title')}</p>
			<div class="grid grid-cols-2 gap-2" role="group">
				<button
					type="button"
					class="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors {agentStore.distributionMode === 'manual' ? 'border-neon bg-neon-soft text-neon-text' : 'border-line text-muted hover:border-line-strong'}"
					onclick={() => agentStore.setDistributionMode('manual')}
				>
					{$t('livechat.distribution.manual')}
				</button>
				<button
					type="button"
					class="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors {agentStore.distributionMode === 'auto' ? 'border-neon bg-neon-soft text-neon-text' : 'border-line text-muted hover:border-line-strong'}"
					onclick={() => agentStore.setDistributionMode('auto')}
				>
					{$t('livechat.distribution.auto')}
				</button>
			</div>
			<p class="mt-1.5 text-[10px] text-muted">
				{agentStore.distributionMode === 'manual' ? $t('livechat.distribution.manualDesc') : $t('livechat.distribution.autoDesc')}
			</p>
		</div>
	</aside>

	<!-- Chat Panel -->
	<main class="flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
		{#if agentStore.activeSession}
			<!-- Chat Header -->
			<header class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold">
						{agentStore.activeSession.visitor_name ?? `Guest ${agentStore.activeSession.visitor_id.slice(-6)}`}
					</p>
					{#if agentStore.activeSession.visitor_email}
						<p class="truncate text-xs text-muted">{agentStore.activeSession.visitor_email}</p>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<Badge variant={agentStore.activeSession.status === 'waiting' ? 'neon' : 'neutral'}>
						{agentStore.activeSession.status}
					</Badge>
					{#if agentStore.activeSession.status !== 'resolved'}
						<Button size="sm" variant="outline" onclick={handleResolve}>
							<CheckCircle size={13} />
							{$t('livechat.resolve')}
						</Button>
					{/if}
				</div>
			</header>

			<!-- Messages -->
			<div bind:this={messagesEl} class="flex-1 space-y-4 overflow-y-auto p-4">
				{#each agentStore.messages as msg, i (msg.id)}
					{#if i === 0 || new Date(msg.created_at).getTime() - new Date(agentStore.messages[i - 1].created_at).getTime() > 300000}
						<p class="text-center text-[10px] text-faint">
							{formatTime(msg.created_at)}
						</p>
					{/if}
					<div class="flex {msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-xs rounded-2xl px-3 py-2 text-sm {msg.direction === 'outbound' ? 'rounded-br-md bg-neon text-on-neon' : 'rounded-bl-md bg-raised text-ink'}"
						>
							{msg.body}
						</div>
					</div>
				{/each}

				{#if agentStore.visitorTyping}
					<div class="flex justify-start">
						<div class="rounded-2xl rounded-bl-md bg-raised px-4 py-3">
							<div class="flex gap-1">
								<span class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></span>
								<span class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></span>
								<span class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Input Area -->
			{#if agentStore.activeSession.status !== 'resolved'}
				<div class="border-t border-line p-4">
					<div class="flex gap-2">
						<textarea
							bind:value={messageInput}
							onkeydown={handleKeydown}
							placeholder={$t('livechat.sendMessage')}
							rows="2"
							class="flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-neon focus:outline-none"
						></textarea>
						<Button onclick={handleSend} disabled={!messageInput.trim()}>
							<Send size={15} />
						</Button>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Empty State -->
			<div class="flex h-full flex-col items-center justify-center text-center">
				<div class="mb-4 rounded-full bg-raised p-4">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
				</div>
				<p class="font-medium text-muted">{$t('livechat.selectSession')}</p>
			</div>
		{/if}
	</main>
</div>
