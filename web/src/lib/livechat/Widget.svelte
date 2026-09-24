<script lang="ts">
	import { onMount } from 'svelte';
	import { Send, X, MessageSquare, Loader2 } from '@lucide/svelte';
	import { livechatStore } from '$lib/livechat/store.svelte';

	let inputEl = $state<HTMLTextAreaElement | null>(null);
	let messageEl = $state<HTMLDivElement | null>(null);
	let msgInput = $state('');
	let nameInput = $state('');
	let showName = $state(false);

	onMount(() => {
		livechatStore.init();
	});

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

	function startChat() {
		if (showName && nameInput.trim()) {
			livechatStore.openChat(nameInput.trim());
			showName = false;
		} else if (!showName) {
			showName = true;
		}
	}

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
	aria-label="Open chat"
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
		aria-label="Live chat"
		style="height: 520px; max-height: calc(100svh - 120px);"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-4 py-3"
			style="background: var(--neon);"
		>
			<div class="flex items-center gap-2">
				<MessageSquare size={18} class="text-on-neon" />
				<span class="font-display text-sm font-semibold text-on-neon">Live Chat</span>
			</div>
			<div class="flex items-center gap-2">
				{#if livechatStore.connected}
					<span class="size-2 rounded-full bg-on-neon opacity-60"></span>
				{/if}
				<button
					type="button"
					class="flex size-7 items-center justify-center rounded-lg text-on-neon opacity-80 transition-opacity hover:opacity-100"
					onclick={() => livechatStore.closeChat()}
					aria-label="Close"
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
					<div>
						<p class="font-display text-sm font-semibold">Selamat datang! 👋</p>
						<p class="mt-1 text-xs text-muted">
							{nameInput.trim() ? `Hai ${nameInput.trim()}, kamu bisa mulai chat sekarang.` : 'Isi nama kamu untuk memulai.'}
						</p>
					</div>
					{#if showName}
						<input
							type="text"
							bind:value={nameInput}
							placeholder="Nama kamu"
							class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-neon focus:outline-none"
							onkeydown={(e) => { if (e.key === 'Enter') startChat(); }}
						/>
						<button
							type="button"
							class="w-full rounded-lg py-2 text-sm font-medium transition-colors"
							style="background: var(--neon); color: var(--on-neon);"
							onclick={startChat}
						>
							Mulai Chat
						</button>
					{:else}
						<button
							type="button"
							class="rounded-lg px-6 py-2 text-sm font-medium transition-colors"
							style="background: var(--neon); color: var(--on-neon);"
							onclick={startChat}
						>
							Mulai Chat
						</button>
					{/if}
				</div>
			{:else}
				<!-- Messages area -->
				<div bind:this={messageEl} class="flex-1 space-y-3 overflow-y-auto p-4">
					{#if livechatStore.status === 'waiting'}
						<div class="flex flex-col items-center gap-2 py-4 text-center">
							<div class="flex gap-1">
								<div class="size-2 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></div>
								<div class="size-2 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></div>
								<div class="size-2 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></div>
							</div>
							<p class="text-xs text-muted">Menunggu agen…</p>
						</div>
					{/if}

					{#each livechatStore.messages as msg (msg.id)}
						<div class="flex {msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}">
							<div
								class="max-w-[75%] rounded-2xl px-3 py-2 text-sm {msg.direction === 'outbound'
									? 'rounded-br-sm'
									: 'rounded-bl-sm bg-raised text-ink'}"
								style={msg.direction === 'outbound' ? `background: var(--neon); color: var(--on-neon);` : ''}
							>
								{msg.body}
							</div>
						</div>
					{/each}

					{#if livechatStore.agentTyping}
						<div class="flex justify-start">
							<div class="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-raised px-4 py-3">
								<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></div>
								<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></div>
								<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></div>
							</div>
						</div>
					{/if}

					{#if livechatStore.session?.assigned_agent_name && livechatStore.status === 'chatting'}
						<div class="flex flex-col items-center gap-1 py-2 text-center">
							<div class="h-px w-16 bg-line"></div>
							<p class="text-[10px] text-faint">😀 {livechatStore.session.assigned_agent_name} sudah bergabung</p>
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
								placeholder="Ketik pesan…"
								rows="1"
								class="flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-neon focus:outline-none"
								style="min-height: 40px; max-height: 100px;"
							></textarea>
							<button
								type="button"
								class="flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40"
								style="background: var(--neon); color: var(--on-neon);"
								disabled={!msgInput.trim() || livechatStore.status === 'waiting'}
								onclick={send}
								aria-label="Send"
							>
								<Send size={15} />
							</button>
						</div>
					</div>
				{:else}
					<div class="border-t border-line p-4 text-center">
						<p class="text-xs text-muted">Percakapan selesai. 💬</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
