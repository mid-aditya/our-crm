<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Send, X, MessageSquare, Loader2 } from '@lucide/svelte';
	import { livechatStore } from '$lib/livechat/store.svelte';
	import { ChatMessage, ChatTyping } from '$lib/components/ui/chat';
	import { getHours } from '$lib/team/api';

	let inputEl = $state<HTMLTextAreaElement | null>(null);
	let messageEl = $state<HTMLDivElement | null>(null);
	let msgInput = $state('');
	let nameInput = $state('');
	let contactInput = $state('');
	let showName = $state(false);
	let isOpenHours = $state<boolean | null>(null);

	onMount(() => {
		livechatStore.init();
		void checkHours();
	});

	async function checkHours() {
		try {
			const hours = await getHours();
			if (hours.length === 0) {
				isOpenHours = null;
				return;
			}
			const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
			const dow = now.getDay();
			const h = hours.find((x) => x.day_of_week === dow);
			if (!h || h.is_closed || !h.open_time || !h.close_time) {
				isOpenHours = false;
				return;
			}
			const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
			isOpenHours = cur >= h.open_time.slice(0, 5) && cur <= h.close_time.slice(0, 5);
		} catch {
			isOpenHours = null;
		}
	}

	// Auto-scroll on new messages
	$effect(() => {
		if (messageEl && livechatStore.messages.length) {
			messageEl.scrollTop = messageEl.scrollHeight;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function send() {
		const body = msgInput.trim();
		if (!body) return;
		msgInput = '';
		livechatStore.sendMessage(body);
	}

	function validContact(v: string): { email?: string; phone?: string } | null {
		const s = v.trim();
		if (!s) return null;
		if (s.includes('@') && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return { email: s };
		const digits = s.replace(/\D/g, '');
		if (digits.length >= 9 && digits.length <= 16) return { phone: s };
		return null;
	}

	function startChat() {
		if (showName) {
			const parsed = validContact(contactInput);
			if (nameInput.trim() && parsed) {
				livechatStore.openChat(nameInput.trim(), parsed.email, parsed.phone);
			}
		} else {
			showName = true;
		}
	}

	const canStart = $derived(!!nameInput.trim() && !!validContact(contactInput));

	function formatTime(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<!-- Floating button -->
<button
	type="button"
	class="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-xl shadow-neon/30 transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon"
	style="background: var(--neon); color: var(--on-neon);"
	onclick={() => livechatStore.toggleChat()}
	aria-label={$t('widget.openChat')}
>
	{#if livechatStore.open}
		<X size={22} />
	{:else}
		<MessageSquare size={22} />
	{/if}
</button>

<!-- Chat window -->
{#if livechatStore.open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-neon/10"
		role="dialog"
		aria-label={$t('widget.title')}
		style="height: 520px; max-height: calc(100svh - 120px);"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-4 py-3"
			style="background: var(--neon);"
		>
			<div class="flex items-center gap-2">
				<MessageSquare size={18} class="text-on-neon" />
				<span class="font-display text-sm font-semibold text-on-neon">{$t('widget.title')}</span>
			</div>
			<div class="flex items-center gap-2">
				{#if livechatStore.connected}
					<span class="size-2 rounded-full bg-on-neon opacity-60"></span>
				{/if}
				<button
					type="button"
					class="flex size-7 items-center justify-center rounded-lg text-on-neon opacity-80 transition-opacity hover:opacity-100"
					onclick={() => livechatStore.closeChat()}
					aria-label={$t('widget.close')}
				>
					<X size={16} />
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex flex-1 flex-col overflow-hidden">
			{#if !livechatStore.session}
				<!-- Pre-chat: name input or CTA -->
				<div class="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
					<div class="rounded-full bg-neon-soft p-4">
						<MessageSquare size={28} class="text-neon-text" />
					</div>
					{#if isOpenHours === false}
						<div>
							<p class="font-display text-sm font-semibold">{$t('widget.closedHours')}</p>
							<p class="mt-1 text-xs text-muted">{$t('widget.closedHoursDesc')}</p>
						</div>
					{/if}
					<div>
						<p class="font-display text-sm font-semibold">{$t('widget.welcome')}</p>
						<p class="mt-1 text-xs text-muted">
							{nameInput.trim() ? $t('widget.helloName', { values: { name: nameInput.trim() } }) : $t('widget.askName')}
						</p>
					</div>
					{#if showName}
						<input
							type="text"
							bind:value={nameInput}
							placeholder={$t('widget.yourName')}
							class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-neon focus:outline-none"
							onkeydown={(e) => { if (e.key === 'Enter') startChat(); }}
						/>
						<input
							type="text"
							bind:value={contactInput}
							placeholder={$t('widget.yourContact')}
							class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-neon focus:outline-none"
							onkeydown={(e) => { if (e.key === 'Enter') startChat(); }}
						/>
						{#if contactInput.trim() && !validContact(contactInput)}
							<p class="w-full text-left text-[11px] text-danger">{$t('widget.invalidContact')}</p>
						{/if}
						{#if livechatStore.error}
							<p class="w-full rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-left text-xs text-danger">
								{livechatStore.error}
							</p>
						{/if}
						<button
							type="button"
							class="w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
							style="background: var(--neon); color: var(--on-neon);"
							disabled={livechatStore.status === 'connecting' || !canStart}
							onclick={startChat}
						>
							{#if livechatStore.status === 'connecting'}
								<span class="inline-flex items-center gap-2"><Loader2 size={15} class="animate-spin" /> {$t('widget.connecting')}</span>
							{:else}
								{$t('widget.startChat')}
							{/if}
						</button>
					{:else}
						<button
							type="button"
							class="rounded-lg px-6 py-2 text-sm font-medium transition-colors"
							style="background: var(--neon); color: var(--on-neon);"
							onclick={startChat}
						>
							{$t('widget.startChat')}
						</button>
					{/if}
				</div>
			{:else}
				<!-- Messages area -->
				<div bind:this={messageEl} class="flex-1 space-y-3 overflow-y-auto p-4">
					{#if livechatStore.status === 'waiting' && livechatStore.messages.length === 0}
						<div class="flex flex-col items-center gap-2 py-4 text-center">
							<div class="flex gap-1">
								<div class="size-2 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></div>
								<div class="size-2 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></div>
								<div class="size-2 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></div>
							</div>
							<p class="text-xs text-muted">{$t('widget.waitingAgent')}</p>
						</div>
					{/if}

					{#each livechatStore.messages as msg (msg.id)}
						<ChatMessage
							variant={msg.direction === 'outbound' ? 'outgoing' : 'incoming'}
							name={msg.direction === 'inbound' && msg.sender_name && msg.sender_name !== 'Guest'
								? msg.sender_name
								: null}
							time={formatTime(msg.created_at)}
						>
							{msg.body}
						</ChatMessage>
					{/each}

					{#if livechatStore.agentTyping}
						<ChatTyping />
					{/if}

					{#if livechatStore.session?.assigned_agent_name && livechatStore.status === 'chatting'}
						<div class="flex flex-col items-center gap-1 py-2 text-center">
							<div class="h-px w-16 bg-line"></div>
							<p class="text-[10px] text-faint">😀 {$t('widget.joined', { values: { name: livechatStore.session.assigned_agent_name } })}</p>
						</div>
					{/if}
				</div>

				<!-- Input area -->
				{#if livechatStore.status !== 'resolved'}
					<div class="border-t border-line p-3">
						<div class="flex items-end gap-2">
							<textarea
								bind:this={inputEl}
								bind:value={msgInput}
								onkeydown={handleKeydown}
								oninput={() => livechatStore.sendTyping()}
								placeholder={$t('widget.typeMessage')}
								rows="1"
								class="flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-neon focus:outline-none"
								style="min-height: 40px; max-height: 100px;"
							></textarea>
							<button
								type="button"
								class="flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40"
								style="background: var(--neon); color: var(--on-neon);"
								disabled={!msgInput.trim() || !livechatStore.connected}
								onclick={send}
								aria-label={$t('widget.send')}
							>
								<Send size={15} />
							</button>
						</div>
					</div>
				{:else}
					<div class="border-t border-line p-4 text-center">
						<p class="text-xs text-muted">{$t('widget.resolvedNote')}</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
