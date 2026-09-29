<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Search, Send, Eye, EyeOff, Plus, UserPlus, Link2, Save, ArrowUpRight, UserCheck } from '@lucide/svelte';
	import { getCompanyId, getUser } from '$lib/api';
	import { getCompanyChannels, type CompanyChannel } from '$lib/api-channels';
	import {
		getQueue,
		getMessages as getLivechatMessages,
		sendMessage as sendLivechatMessage,
		getDistribution,
		setDistribution,
		takeSession,
		escalateSession,
		assignSession,
		getAgents,
		tabOf,
		type LivechatSession,
		type ChatTab,
		type Agent
	} from '$lib/livechat/agent-api';
	import { getTicketFields, type TicketField } from '$lib/team/api';	import {
		getConversations,
		getConvMessages,
		replyConversation,
		searchContacts,
		getContact,
		createContact,
		updateContact,
		getTickets,
		createTicket,
		getTicketDetail,
		replyTicket,
		updateTicket,
		getAssignees,
		maskEmail,
		maskPhone,
		type Conversation,
		type Contact,
		type Ticket,
		type Assignee
	} from '$lib/conversations/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { ChatMessage } from '$lib/components/ui/chat';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { cn, initials } from '$lib/utils';

	const COMPANY_ID = getCompanyId() ?? '00000000-0000-0000-0000-000000000001';

	// Mode workspace: 'livechat' (page khusus Live Chat) atau 'channels' (Percakapan).
	let { mode = 'livechat' }: { mode?: 'livechat' | 'channels' } = $props();

	// Agent: hanya membalas chat + membuat tiket (tanpa take/eskalasi/distribusi/kelola tiket).
	const myRole = $derived((getUser()?.role ?? '').toLowerCase());
	const isAgent = $derived(myRole === 'agent');
	// Distribusi (assign manual bot→agent) untuk admin/developer/owner/spv.
	const canDistribute = $derived(!isAgent);

	// ---- channel submenu ----
	let channels = $state<CompanyChannel[]>([]);
	let activeChannel = $state('');

	// ---- list + isi chat ----
	type ChatItem = {
		id: string;
		title: string;
		subtitle: string | null;
		time: string | null;
		status: string;
		contactId: string | null;
		channelLabel: string;
		tab: ChatTab | 'all';
		unread: number;
		raw: LivechatSession | Conversation;
	};
	let items = $state<ChatItem[]>([]);
	let loadingList = $state(false);
	let activeId = $state<string | null>(null);
	let activeItem = $derived(items.find((i) => i.id === activeId) ?? null);
	let chatTab = $state<ChatTab | 'all'>('all');

	// status aux global ada di header; di sini hanya mode distribusi
	let distributionMode = $state<'manual' | 'auto'>('manual');

	type Msg = { id: string; direction: string; body: string; sender?: string | null; created_at: string };
	let messages = $state<Msg[]>([]);
	let loadingMsgs = $state(false);
	let msgInput = $state('');
	let search = $state('');

	// ---- panel ticketing ----
	let panelTab = $state<'profile' | 'ticket' | 'history'>('profile');
	let contact = $state<Contact | null>(null);
	let contactLoading = $state(false);
	let unmask = $state(false);
	let editing = $state(false);
	let editForm = $state({ full_name: '', phone: '', email: '', company_name: '' });
	let checkQuery = $state('');
	let checkResults = $state<Contact[]>([]);
	let checking = $state(false);
	let tickets = $state<Ticket[]>([]);
	let ticketDetail = $state<{ ticket: Ticket; replies: { id: string; body: string; created_at: string; author_type: string }[] } | null>(null);
	let activeTicketId = $state<string | null>(null);
	let ticketForm = $state({ subject: '', description: '', priority: 'medium', escalated: false });
	let customForm = $state<Record<string, string>>({});
	let ticketFields = $state<TicketField[]>([]);
	let assignees = $state<Assignee[]>([]);
	let followupInput = $state('');

	const filtered = $derived(
		items.filter((i) => {
			const okTab = chatTab === 'all' || i.tab === chatTab;
			const q = search.trim().toLowerCase();
			const okSearch =
				!q ||
				i.title.toLowerCase().includes(q) ||
				(i.subtitle ?? '').toLowerCase().includes(q);
			return okTab && okSearch;
		})
	);

	const tabCounts = $derived({
		bot: items.filter((i) => i.tab === 'bot').length,
		unread: items.filter((i) => i.tab === 'unread').length,
		read: items.filter((i) => i.tab === 'read').length,
		resolved: items.filter((i) => i.tab === 'resolved').length
	});

	const channelLabelOf = (typeId: string) =>
		typeId === 'livechat'
			? 'Live Chat'
			: (channels.find((c) => c.channel_type_id === typeId)?.name ?? typeId);

	onMount(async () => {
		if (mode === 'livechat') activeChannel = 'livechat';
		try {
			channels = await getCompanyChannels();
		} catch {
			channels = [];
		}
		if (mode === 'channels') {
			// Livechat punya page khusus — sembunyikan dari submenu Percakapan.
			channels = channels.filter((c) => c.channel_type_id !== 'livechat');
			if (!activeChannel && channels.length > 0) {
				activeChannel = channels[0].channel_type_id;
			}
		}
		try {
			ticketFields = await getTicketFields();
		} catch {
			ticketFields = [];
		}
		try {
			assignees = await getAssignees();
		} catch {
			assignees = [];
		}
		try {
			const d = await getDistribution(COMPANY_ID);
			distributionMode = d.mode;
		} catch { /* abaikan */ }
		await loadList();
	});

	async function changeDistribution(mode: 'manual' | 'auto') {
		try {
			const d = await setDistribution(COMPANY_ID, mode);
			distributionMode = d.mode;
		} catch { /* abaikan */ }
	}

	// ---- Panel distribusi (admin/dev/owner/spv): bot → agent online ----
	let showDist = $state(false);
	let distSessions = $state<LivechatSession[]>([]);
	let distAgents = $state<Agent[]>([]);

	async function loadDistribution() {
		try {
			const [q, agents] = await Promise.all([getQueue(COMPANY_ID, 'all'), getAgents(COMPANY_ID)]);
			distSessions = q.filter((s) => !s.assigned_agent_id && s.status !== 'resolved');
			distAgents = agents;
		} catch {
			distSessions = [];
			distAgents = [];
		}
	}

	async function assignDist(sessionId: string, agentId: string) {
		try {
			await assignSession(sessionId, agentId);
			await loadDistribution();
			await loadList();
		} catch { /* abaikan */ }
	}

	$effect(() => {
		if (showDist && mode === 'livechat' && canDistribute) void loadDistribution();
	});

	async function loadList() {
		loadingList = true;
		activeId = null;
		activeItemReset();
		try {
			if (activeChannel === 'livechat') {
				const q = await getQueue(COMPANY_ID, 'all');
				items = q.map((s) => ({
					id: s.id,
					title: s.visitor_name ?? `Guest ${s.visitor_id.slice(-6)}`,
					subtitle: s.last_message,
					time: s.waiting_since,
					status: s.status,
					contactId: null,
					channelLabel: 'Live Chat',
					tab: tabOf(s),
					unread: s.unread_count ?? 0,
					raw: s
				}));
			} else {
				const convs = await getConversations();
				const list = convs.filter((c) => channelMatch(c));
				const withNames: ChatItem[] = [];
				for (const c of list) {
					let title = c.id.slice(0, 8);
					if (c.contact_id) {
						try {
							const ct = await getContact(c.contact_id);
							title = ct.full_name;
						} catch { /* pakai id */ }
					}
					withNames.push({
						id: c.id,
						title,
						subtitle: c.status,
						time: c.last_message_at,
						status: c.status,
						contactId: c.contact_id,
						channelLabel: channelLabelOf(activeChannel),
						tab: c.status === 'resolved' ? 'resolved' : c.status === 'open' ? 'unread' : 'read',
						unread: c.status === 'open' ? 1 : 0,
						raw: c
					});
				}
				items = withNames;
			}
		} catch {
			items = [];
		} finally {
			loadingList = false;
		}
	}

	function channelMatch(_c: Conversation): boolean {
		// Pemetaan channel legacy (whatsapp_channels) ke company_channels belum 1:1,
		// tampilkan semua percakapan di tiap submenu non-livechat untuk sementara.
		return true;
	}

	function activeItemReset() {
		messages = [];
		contact = null;
		tickets = [];
		ticketDetail = null;
		activeTicketId = null;
		panelTab = 'profile';
	}

	async function selectItem(item: ChatItem) {
		activeId = item.id;
		activeItemReset();
		loadingMsgs = true;
		try {
			if (activeChannel === 'livechat') {
				const ms = await getLivechatMessages(item.id, COMPANY_ID);
				messages = ms.map((m) => ({
					id: m.id,
					direction: m.direction,
					body: m.body,
					sender: m.sender_name,
					created_at: m.created_at
				}));
				// Auto cek customer: cari kontak terdaftar dari nama/email/telp visitor.
				const raw = item.raw as LivechatSession;
				const hint = raw.visitor_email || raw.visitor_phone || raw.visitor_name || '';
				if (hint) {
					checkQuery = hint;
					checkResults = [];
					void runCheck();
				}
			} else {
				const ms = await getConvMessages(item.id);
				messages = ms.map((m) => ({
					id: m.id,
					direction: m.direction,
					body: m.body,
					created_at: m.created_at
				}));
				if (item.contactId) await loadContact(item.contactId);
			}
			await loadTicketsForContact(item.contactId);
		} catch {
			messages = [];
		} finally {
			loadingMsgs = false;
		}
	}

	async function handleSend() {
		if (!msgInput.trim() || !activeId) return;
		const body = msgInput.trim();
		msgInput = '';
		try {
			if (activeChannel === 'livechat') {
				await takeSession(activeId).catch(() => null);
				const msg = await sendLivechatMessage(activeId, body);
				messages = [...messages, { id: msg.id, direction: 'outbound', body, created_at: new Date().toISOString() }];
			} else {
				await replyConversation(activeId, body);
				messages = [...messages, { id: crypto.randomUUID(), direction: 'outbound', body, created_at: new Date().toISOString() }];
			}
		} catch { /* tampilkan toast sederhana via alert? abaikan */ }
	}

	// ---- customer check ----
	async function loadContact(id: string) {
		contactLoading = true;
		try {
			contact = await getContact(id);
			editForm = {
				full_name: contact.full_name,
				phone: contact.phone ?? '',
				email: contact.email ?? '',
				company_name: contact.company_name ?? ''
			};
		} catch {
			contact = null;
		} finally {
			contactLoading = false;
		}
	}

	async function runCheck() {
		if (!checkQuery.trim()) return;
		checking = true;
		try {
			checkResults = await searchContacts(checkQuery.trim());
		} catch {
			checkResults = [];
		} finally {
			checking = false;
		}
	}

	async function linkContact(c: Contact) {
		contact = c;
		editForm = {
			full_name: c.full_name,
			phone: c.phone ?? '',
			email: c.email ?? '',
			company_name: c.company_name ?? ''
		};
		if (activeItem) activeItem.contactId = c.id;
		await loadTicketsForContact(c.id);
		checkResults = [];
		checkQuery = '';
	}

	async function addNewContact() {
		if (!checkQuery.trim()) return;
		try {
			const res = await createContact({ full_name: checkQuery.trim(), source: activeChannel });
			await loadContact(res.id);
			if (activeItem) activeItem.contactId = res.id;
			await loadTicketsForContact(res.id);
			checkResults = [];
			checkQuery = '';
		} catch { /* abaikan */ }
	}

	async function saveEdit() {
		if (!contact) return;
		try {
			await updateContact(contact.id, editForm);
			await loadContact(contact.id);
			editing = false;
		} catch { /* abaikan */ }
	}

	// ---- tickets ----
	async function loadTicketsForContact(contactId: string | null) {
		try {
			const all = await getTickets();
			tickets = contactId ? all.filter((t) => t.contact_id === contactId) : [];
		} catch {
			tickets = [];
		}
	}

	async function openTicket(id: string) {
		activeTicketId = id;
		try {
			ticketDetail = await getTicketDetail(id);
		} catch {
			ticketDetail = null;
		}
	}

	async function submitTicket() {
		if (!ticketForm.subject.trim()) return;
		for (const f of ticketFields) {
			if (f.required && !(customForm[f.field_key] ?? '').trim()) return;
		}
		// Alur: tiket wajib terikat ke customer yang sudah dicek/dikaitkan.
		const contactId = contact?.id || activeItem?.contactId || undefined;
		if (!contactId) {
			await askConfirm({
				title: $t('conversation.needContactTitle'),
				description: $t('conversation.needContactDesc'),
				confirmLabel: $t('common.understand')
			});
			panelTab = 'profile';
			return;
		}
		try {
			const res = await createTicket({
				subject: ticketForm.subject.trim(),
				description: ticketForm.description.trim() || undefined,
				contact_id: contactId,
				priority: ticketForm.priority,
				escalated: ticketForm.escalated,
				custom_fields: customForm
			});
			ticketForm = { subject: '', description: '', priority: 'medium', escalated: false };
			customForm = {};
			await loadTicketsForContact(contact?.id ?? activeItem?.contactId ?? null);
			await openTicket(res.id);
		} catch { /* abaikan */ }
	}

	async function sendFollowup() {
		if (!followupInput.trim() || !activeTicketId) return;
		const body = followupInput.trim();
		followupInput = '';
		try {
			await replyTicket(activeTicketId, body);
			await openTicket(activeTicketId);
		} catch { /* abaikan */ }
	}

	async function changeTicket(patch: { status?: string; priority?: string; assignee_id?: string | null; escalated?: boolean }) {
		if (!activeTicketId) return;
		try {
			await updateTicket(activeTicketId, patch);
			await openTicket(activeTicketId);
			await loadTicketsForContact(contact?.id ?? activeItem?.contactId ?? null);
		} catch { /* abaikan */ }
	}

	function statusVariant(s: string): 'neon' | 'warn' | 'success' | 'neutral' {
		return s === 'open' || s === 'waiting' ? 'neon' : s === 'pending' ? 'warn' : s === 'resolved' ? 'success' : 'neutral';
	}

	let escalating = $state(false);

	async function escalateChat() {
		if (!activeId || activeChannel !== 'livechat' || escalating) return;
		const ok = await askConfirm({ title: $t('conversation.escalateConfirm') });
		if (!ok) return;
		escalating = true;
		try {
			const res = await escalateSession(activeId);
			items = items.map((i) =>
				i.id === activeId ? { ...i, status: 'assigned', subtitle: `Eskalasi ke ${res.spv_name}` } : i
			);
			const updated = items.find((i) => i.id === activeId);
			if (updated) await selectItem(updated);
		} catch {
			// abaikan (mis. tidak ada SPV online)
		} finally {
			escalating = false;
		}
	}
	function priorityVariant(p: string): 'warn' | 'success' | 'danger' {
		return p === 'urgent' ? 'danger' : p === 'medium' ? 'warn' : 'success';
	}
</script>

<div class="flex h-[calc(100vh-8rem)] flex-col gap-3">
	{#if mode === 'livechat' && canDistribute}
		<!-- Panel distribusi: bot → agent online (admin/dev/owner/spv) -->
		<div class="rounded-xl border border-line bg-surface">
			<button
				type="button"
				onclick={() => (showDist = !showDist)}
				class="flex w-full items-center gap-2 px-4 py-2.5 text-left"
				aria-expanded={showDist}
			>
				<UserCheck size={15} class="text-neon-text" />
				<span class="text-xs font-semibold">{$t('distribution.title')}</span>
				<span class="rounded bg-raised px-1.5 py-px text-[10px] text-muted">
					{$t('distribution.mode')}: {distributionMode === 'auto' ? $t('team.auto') : $t('team.manual')}
				</span>
				<span class="ml-auto text-[11px] text-faint">{showDist ? '▾' : '▸'}</span>
			</button>
			{#if showDist}
				<div class="grid gap-3 border-t border-line p-3 lg:grid-cols-[1fr_280px]">
					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<p class="text-[11px] font-medium text-muted">{$t('distribution.queue')}</p>
							<div class="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-0.5" role="group" aria-label={$t('team.distribution')}>
								<button
									type="button"
									onclick={() => changeDistribution('manual')}
									class={cn('rounded-md px-2 py-1 text-[11px] font-medium', distributionMode === 'manual' ? 'bg-neon-soft text-neon-text' : 'text-muted')}
								>
									{$t('team.manual')}
								</button>
								<button
									type="button"
									onclick={() => changeDistribution('auto')}
									class={cn('rounded-md px-2 py-1 text-[11px] font-medium', distributionMode === 'auto' ? 'bg-neon-soft text-neon-text' : 'text-muted')}
								>
									{$t('team.auto')}
								</button>
							</div>
						</div>
						{#each distSessions as s (s.id)}
							<div class="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs">
								<span class="min-w-0 flex-1">
									<span class="block truncate font-medium">{s.visitor_name ?? `Guest ${s.visitor_id.slice(-6)}`}</span>
									<span class="block truncate text-[10px] text-muted">{s.last_message ?? '—'}</span>
								</span>
								<Select
									value=""
									placeholder={$t('distribution.assignTo')}
									aria-label={$t('distribution.assignTo')}
									options={distAgents.map((a) => ({ value: a.id, label: `${a.full_name} (${a.active_sessions})` }))}
									onchange={(v) => v && assignDist(s.id, v)}
									class="w-44"
								/>
							</div>
						{:else}
							<p class="py-3 text-center text-[11px] text-muted">{$t('distribution.empty')}</p>
						{/each}
					</div>
					<div class="space-y-1.5">
						<p class="text-[11px] font-medium text-muted">{$t('distribution.onlineAgents')}</p>
						{#each distAgents as a (a.id)}
							<div class="flex items-center justify-between rounded-lg bg-raised px-3 py-1.5 text-xs">
								<span class="font-medium">{a.full_name}</span>
								<Badge variant="neutral">{a.active_sessions} chat</Badge>
							</div>
						{:else}
							<p class="py-3 text-center text-[11px] text-muted">{$t('distribution.noAgents')}</p>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<!-- Submenu channel milik company -->
	{#if mode === 'channels'}
		<div class="flex items-center gap-2 overflow-x-auto pb-1">
			{#each channels as ch (ch.id)}
				<button
					type="button"
					onclick={() => { activeChannel = ch.channel_type_id; loadList(); }}
					class={cn(
						'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
						activeChannel === ch.channel_type_id
							? 'border-neon bg-neon-soft text-neon-text'
							: 'border-line bg-surface text-muted hover:text-ink'
					)}
				>
					{ch.name}
				</button>
			{/each}
		</div>
	{/if}

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
		<!-- Kolom 1: list chat + filter tab -->
		<div class="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
			<div class="space-y-2 border-b border-line p-3">
				<div class="relative">
					<Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
					<Input bind:value={search} placeholder={$t('conversation.searchChat')} class="pl-8" />
				</div>
				<div class="flex items-center gap-1 overflow-x-auto">
					{#each [{ id: 'all', label: $t('conversation.tabs.all') }, { id: 'bot', label: $t('conversation.tabs.bot', { values: { count: tabCounts.bot } }) }, { id: 'unread', label: $t('conversation.tabs.unread', { values: { count: tabCounts.unread } }) }, { id: 'read', label: $t('conversation.tabs.read', { values: { count: tabCounts.read } }) }, { id: 'resolved', label: $t('conversation.tabs.resolved', { values: { count: tabCounts.resolved } }) }] as tb (tb.id)}
						<button
							type="button"
							onclick={() => (chatTab = tb.id as typeof chatTab)}
							class={cn(
								'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
								chatTab === tb.id ? 'border-neon bg-neon-soft text-neon-text' : 'border-line text-muted hover:text-ink'
							)}
						>
							{tb.label}
						</button>
					{/each}
				</div>
			</div>
			<div class="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
				{#if loadingList}
					<p class="py-8 text-center text-xs text-muted">{$t('common.loading')}</p>
				{:else if filtered.length === 0}
					<p class="py-8 text-center text-xs text-muted">{$t('conversation.emptyChannel')}</p>
				{:else}
					{#each filtered as item (item.id)}
						<button
							type="button"
							onclick={() => selectItem(item)}
							class={cn(
								'w-full rounded-lg border p-2.5 text-left transition-colors',
								activeId === item.id ? 'border-neon bg-neon-soft/30' : 'border-transparent hover:bg-raised'
							)}
						>
							<div class="flex items-center gap-2">
								<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-muted">
									{initials(item.title)}
								</span>
								<span class="min-w-0 flex-1">
									<span class="flex items-center gap-1.5">
										<span class="block truncate text-xs font-medium">{item.title}</span>
										{#if item.unread > 0}
											<span class="flex size-4 shrink-0 items-center justify-center rounded-full bg-neon text-[9px] font-bold text-on-neon">
												{item.unread > 9 ? '9+' : item.unread}
											</span>
										{/if}
									</span>
									{#if item.subtitle}
										<span class="block truncate text-[11px] text-muted">{item.subtitle}</span>
									{/if}
									<span class="mt-0.5 inline-block rounded bg-raised px-1.5 py-px text-[10px] text-muted">
										{item.channelLabel}{item.tab === 'bot' ? ' • Bot' : ''}
									</span>
								</span>
								<Badge variant={item.status === 'open' || item.status === 'waiting' ? 'neon' : 'neutral'}>
									{item.status}
								</Badge>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Kolom 2: isi chat -->
		<div class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
			{#if !activeItem}
				<div class="flex flex-1 items-center justify-center p-8 text-center text-xs text-muted">
					{$t('conversation.selectChat')}
				</div>
			{:else}
				<header class="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
					<div class="min-w-0">
						<p class="truncate text-sm font-semibold">{activeItem.title}</p>
						<p class="text-[11px] text-muted">{activeChannel}</p>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						{#if !isAgent && activeChannel === 'livechat' && activeItem.status !== 'resolved'}
							<Button size="sm" variant="outline" onclick={escalateChat} disabled={escalating}>
								<ArrowUpRight size={13} /> {$t('conversation.escalateSpv')}
							</Button>
						{/if}
						<Badge variant={statusVariant(activeItem.status)}>{activeItem.status}</Badge>
					</div>
				</header>
				<div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
					{#if loadingMsgs}
						<p class="py-6 text-center text-xs text-muted">{$t('common.loading')}</p>
					{:else}
						{#each messages as m (m.id)}
							<ChatMessage variant={m.direction === 'outbound' ? 'outgoing' : 'incoming'} name={m.direction === 'inbound' ? (m.sender ?? null) : null}>
								{m.body}
							</ChatMessage>
						{/each}
					{/if}
				</div>
				<div class="border-t border-line p-3">
					<div class="flex gap-2">
						<Input
							bind:value={msgInput}
							placeholder={$t('conversation.typeReply')}
							onkeydown={(e) => e.key === 'Enter' && handleSend()}
						/>
						<Button onclick={handleSend} disabled={!msgInput.trim()}>
							<Send size={15} />
						</Button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Kolom 3: ticketing -->
		<div class="flex min-h-0 flex-col rounded-xl border border-line bg-surface">
			<div class="grid grid-cols-3 gap-1 border-b border-line p-2">
				{#each [{ id: 'profile', label: $t('conversation.panel.profile') }, { id: 'ticket', label: $t('conversation.panel.ticket') }, { id: 'history', label: $t('conversation.panel.history') }] as tab (tab.id)}
					<button
						type="button"
						onclick={() => (panelTab = tab.id as typeof panelTab)}
						class={cn(
							'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
							panelTab === tab.id ? 'bg-neon-soft text-neon-text' : 'text-muted hover:text-ink'
						)}
					>
						{tab.label}
					</button>
				{/each}
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto p-3">
				{#if !activeItem}
					<p class="py-8 text-center text-xs text-muted">{$t('conversation.selectChatFirst')}</p>
				{:else if panelTab === 'profile'}
					{#if contactLoading}
						<p class="py-6 text-center text-xs text-muted">{$t('common.loading')}</p>
					{:else if !contact}
						<!-- Customer check: terdaftar / baru / existing -->
						<div class="space-y-2">
							<p class="text-xs font-medium">{$t('conversation.checkCustomer')}</p>
							<div class="flex gap-1.5">
								<Input bind:value={checkQuery} placeholder={$t('conversation.checkPh')} onkeydown={(e) => e.key === 'Enter' && runCheck()} />
								<Button size="sm" variant="outline" onclick={runCheck}>{checking ? '…' : $t('conversation.check')}</Button>
							</div>
							{#if checkResults.length > 0}
								<div class="space-y-1">
									{#each checkResults as c (c.id)}
										<div class="flex items-center gap-2 rounded-lg border border-line p-2">
											<span class="min-w-0 flex-1">
												<span class="block truncate text-xs font-medium">{c.full_name}</span>
												<span class="block truncate text-[11px] text-muted">{c.phone ?? c.email ?? ''}</span>
											</span>
											<button
												type="button"
												onclick={() => linkContact(c)}
												class="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:text-ink"
											>
												<Link2 size={12} /> {$t('conversation.link')}
											</button>
										</div>
									{/each}
								</div>
							{:else if checkQuery.trim()}
								<button
									type="button"
									onclick={addNewContact}
									class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted hover:text-ink"
								>
									<UserPlus size={13} /> {$t('conversation.addNew', { values: { name: checkQuery.trim() } })}
								</button>
							{:else}
								<p class="text-[11px] text-muted">{$t('conversation.checkHint')}</p>
							{/if}
						</div>
					{:else}
						<!-- Biodata + masking -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<p class="text-xs font-medium">{$t('conversation.biodata')}</p>
								<div class="flex gap-1">
									<button
										type="button"
										onclick={() => (unmask = !unmask)}
										class="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:text-ink"
									>
										{#if unmask}<EyeOff size={12} /> {$t('conversation.mask')}{:else}<Eye size={12} /> {$t('conversation.unmask')}{/if}
									</button>
									<button
										type="button"
										onclick={() => (editing = !editing)}
										class="rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:text-ink"
									>
										{editing ? $t('common.cancel') : $t('common.edit')}
									</button>
								</div>
							</div>
							{#if !editing}
								<dl class="space-y-1.5 text-xs">
									<div class="flex justify-between gap-2"><dt class="text-muted">{$t('conversation.fName')}</dt><dd class="font-medium">{contact.full_name}</dd></div>
									<div class="flex justify-between gap-2"><dt class="text-muted">{$t('conversation.fPhone')}</dt><dd class="font-mono">{unmask ? (contact.phone ?? '—') : maskPhone(contact.phone)}</dd></div>
									<div class="flex justify-between gap-2"><dt class="text-muted">{$t('conversation.fEmail')}</dt><dd class="font-mono">{unmask ? (contact.email ?? '—') : maskEmail(contact.email)}</dd></div>
									<div class="flex justify-between gap-2"><dt class="text-muted">{$t('conversation.fCompany')}</dt><dd>{contact.company_name ?? '—'}</dd></div>
									<div class="flex justify-between gap-2"><dt class="text-muted">{$t('conversation.fSource')}</dt><dd>{contact.source ?? activeChannel}</dd></div>
								</dl>
								<div>
									<p class="mb-1 text-[11px] font-medium text-muted">{$t('conversation.customerChannels')}</p>
									<p class="rounded-md bg-raised px-2 py-1 text-[11px]">{contact.source ?? activeChannel}</p>
								</div>
							{:else}
								<div class="space-y-2">
									<Input bind:value={editForm.full_name} placeholder={$t('conversation.namePh')} />
									<Input bind:value={editForm.phone} placeholder={$t('conversation.phonePh')} />
									<Input bind:value={editForm.email} placeholder={$t('conversation.emailPh')} />
									<Input bind:value={editForm.company_name} placeholder={$t('conversation.companyPh')} />
									<Button size="sm" onclick={saveEdit}><Save size={13} /> {$t('common.save')}</Button>
								</div>
							{/if}
						</div>
					{/if}
				{:else if panelTab === 'ticket'}
					{#if !ticketDetail}
						<div class="space-y-2">
							<p class="text-xs font-medium">{$t('conversation.createTicket')}</p>
							<Input bind:value={ticketForm.subject} placeholder={$t('conversation.subjectPh')} />
							<textarea
								bind:value={ticketForm.description}
								placeholder={$t('conversation.descPh')}
								rows="3"
								class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
							></textarea>
							<Select
								bind:value={ticketForm.priority}
								aria-label={$t('conversation.fSource')}
								options={[
									{ value: 'low', label: 'Low' },
									{ value: 'medium', label: 'Medium' },
									{ value: 'urgent', label: 'Urgent' }
								]}
							/>
							<label class="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs transition-colors hover:border-line-strong">
								<input
									type="checkbox"
									bind:checked={ticketForm.escalated}
									class="size-4 accent-[var(--neon)]"
								/>
								<span class="font-medium">{$t('conversation.escalateTicket')}</span>
							</label>
							{#each ticketFields as f (f.field_key)}
								{#if f.field_type === 'select'}
									<Select
										value={customForm[f.field_key] ?? ''}
										placeholder={f.label + (f.required ? ' *' : '')}
										aria-label={f.label}
										options={f.options.map((o) => ({ value: o, label: o }))}
										onchange={(v) => (customForm[f.field_key] = v)}
									/>
								{:else if f.field_type === 'textarea'}
									<textarea
										bind:value={customForm[f.field_key]}
										placeholder={f.label + (f.required ? ' *' : '')}
										rows="2"
										class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
									></textarea>
								{:else}
									<Input
										bind:value={customForm[f.field_key]}
										type={f.field_type === 'date' ? 'date' : f.field_type === 'number' ? 'number' : 'text'}
										placeholder={f.label + (f.required ? ' *' : '')}
										aria-label={f.label}
									/>
								{/if}
							{/each}
							<Button size="sm" onclick={submitTicket} disabled={!ticketForm.subject.trim()}>
								<Plus size={13} /> {$t('conversation.createTicket')}
							</Button>
							{#if tickets.length > 0}
								<p class="pt-2 text-[11px] font-medium text-muted">{$t('conversation.customerTickets', { values: { count: tickets.length } })}</p>
								<div class="space-y-1">
									{#each tickets as tk (tk.id)}
										<button
											type="button"
											onclick={() => openTicket(tk.id)}
											class="w-full rounded-lg border border-line p-2 text-left hover:border-neon/50"
										>
											<span class="block truncate text-xs font-medium">{tk.number} — {tk.subject}</span>
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
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<div class="space-y-2">
							<button type="button" onclick={() => (ticketDetail = null)} class="text-[11px] text-muted hover:text-ink">{$t('conversation.allTickets')}</button>
							<div class="flex items-start justify-between gap-2">
								<p class="text-xs font-semibold">{ticketDetail.ticket.number} — {ticketDetail.ticket.subject}</p>
							</div>
							<div class="flex flex-wrap gap-1">
								<Badge variant={statusVariant(ticketDetail.ticket.status)}>{ticketDetail.ticket.status}</Badge>
								<Badge variant={priorityVariant(ticketDetail.ticket.priority)}>{ticketDetail.ticket.priority}</Badge>
								{#if ticketDetail.ticket.escalated}
									<Badge variant="danger">SPV</Badge>
								{/if}
								{#if ticketDetail.ticket.status === 'open' && ticketDetail.replies.length === 0}
									<Badge variant="warn">{$t('ticketsPage.needFollowup')}</Badge>
								{/if}
							</div>
							{#if ticketDetail.ticket.description}
								<p class="rounded-md bg-raised p-2 text-[11px] text-muted">{ticketDetail.ticket.description}</p>
							{/if}
							{#if ticketDetail?.ticket.custom_values && Object.keys(ticketDetail.ticket.custom_values).length > 0}
								<dl class="space-y-1 rounded-md bg-raised p-2 text-[11px]">
									{#each ticketFields.filter((f) => ticketDetail?.ticket.custom_values?.[f.field_key]) as f (f.field_key)}
										<div class="flex justify-between gap-2">
											<dt class="text-muted">{f.label}</dt>
											<dd class="font-medium">{ticketDetail?.ticket.custom_values?.[f.field_key]}</dd>
										</div>
									{/each}
								</dl>
							{/if}
							{#if !isAgent}
							<div class="grid grid-cols-2 gap-1.5">
								<Select
									value={ticketDetail.ticket.status}
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
									value={ticketDetail.ticket.priority}
									aria-label="Priority"
									options={[
										{ value: 'low', label: 'Low' },
										{ value: 'medium', label: 'Medium' },
										{ value: 'urgent', label: 'Urgent' }
									]}
									onchange={(v) => v && changeTicket({ priority: v })}
								/>
							</div>
							<div>
								<p class="mb-1 text-[11px] font-medium text-muted">{$t('conversation.assignee')}</p>
								<Select
									value={ticketDetail.ticket.assignee_id ?? ''}
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
									checked={ticketDetail.ticket.escalated}
									onchange={(e) => changeTicket({ escalated: (e.target as HTMLInputElement).checked })}
									class="size-4 accent-[var(--neon)]"
								/>
								<span class="font-medium">{$t('conversation.escalateTicket')}</span>
							</label>
						{/if}
							<div class="space-y-1.5 border-t border-line pt-2">
								<p class="text-[11px] font-medium">{$t('conversation.followup')}</p>
								{#each ticketDetail.replies as r (r.id)}
									<div class="rounded-md bg-raised p-2 text-[11px]">
										<p>{r.body}</p>
										<p class="mt-0.5 text-[10px] text-faint">{r.author_type} • {new Date(r.created_at).toLocaleString()}</p>
									</div>
								{/each}
								{#if ticketDetail.replies.length === 0}
									<p class="text-[11px] text-faint">{$t('conversation.noFollowup')}</p>
								{/if}
								<div class="flex gap-1.5">
									<Input bind:value={followupInput} placeholder={$t('conversation.followupPh')} onkeydown={(e) => e.key === 'Enter' && sendFollowup()} />
									<Button size="sm" onclick={sendFollowup} disabled={!followupInput.trim()}><Send size={13} /></Button>
								</div>
							</div>
						</div>
					{/if}
				{:else}
					<!-- Riwayat: semua tiket + status tracking customer -->
					<div class="space-y-1.5">
						<p class="text-xs font-medium">{$t('conversation.historyTitle')}</p>
						{#if tickets.length === 0}
							<p class="py-4 text-center text-[11px] text-muted">{$t('conversation.noHistory')}</p>
						{:else}
							{#each tickets as tk (tk.id)}
								<button
									type="button"
									onclick={() => { panelTab = 'ticket'; openTicket(tk.id); }}
									class="w-full rounded-lg border border-line p-2 text-left hover:border-neon/50"
								>
									<span class="block truncate text-xs font-medium">{tk.number} — {tk.subject}</span>
									<span class="mt-0.5 block text-[10px] text-faint">{new Date(tk.created_at).toLocaleString()}</span>
									<span class="mt-1 flex gap-1">
										<Badge variant={statusVariant(tk.status)}>{tk.status}</Badge>
										<Badge variant={priorityVariant(tk.priority)}>{tk.priority}</Badge>
									</span>
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
