<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { channelStore } from '$lib/channels/store';
	import type { ChannelDef } from '$lib/channels/definitions';
	import type { ChannelState } from '$lib/channels/store';
	import { t } from 'svelte-i18n';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { Check, Loader2, X } from '@lucide/svelte';

	type Props = {
		open?: boolean;
		def: ChannelDef;
		state: ChannelState;
	};

	let { open = $bindable(false), def, state: chState }: Props = $props();

	// Local form state — copy from store on open
	let form = $state<Record<string, string>>({ ...state.config });
	let saving = $state(false);
	let saved = $state(false);

	// Reset form when dialog opens
	$effect(() => {
		if (open) {
			form = { ...chState.config };
			saved = false;
		}
	});

	async function save() {
		saving = true;
		channelStore.updateConfig(def.id, { ...form });
		await new Promise((r) => setTimeout(r, 400)); // simulate save
		saving = false;
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	async function connect() {
		// Save first if there are changes
		await save();
		channelStore.connect(def.id);
	}

	async function disconnect() {
		channelStore.disconnect(def.id);
	}
</script>

	<Dialog.Root open={open} onOpenChange={(v) => (open = v ?? false)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl outline-none"
		>
			<div class="mb-5 flex items-start justify-between gap-4">
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
						style="background: {def.color}22; color: {def.color};"
					>
						<def.icon size={20} />
					</div>
					<div>
						<Dialog.Title class="font-display text-base font-semibold">
							{$t(def.nameId)}
						</Dialog.Title>
						<p class="mt-0.5 text-xs text-muted">{$t(def.descriptionId)}</p>
					</div>
				</div>
				<Dialog.Close
					class="flex size-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-ink"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>

			<div class="space-y-4">
				{#each def.fields as field (field.key)}
					<Field label={$t(field.labelId)}>
						<Input
							type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
							bind:value={form[field.key]}
							placeholder={field.placeholder}
						/>
						{#if field.helpId}
							{#snippet hint()}
								<span class="text-xs text-faint">{$t(field.helpId)}</span>
							{/snippet}
						{/if}
					</Field>
				{/each}
			</div>

			<!-- Connection status indicator -->
			{#if chState.status !== 'disconnected'}
				<div
					class="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
					class:border-neon={chState.status === 'connected'}
					class:bg-neon-soft={chState.status === 'connected'}
					class:border-danger={chState.status === 'error'}
					class:bg-danger-soft={chState.status === 'error'}
					class:border-warn={chState.status === 'connecting'}
					class:bg-warn-soft={chState.status === 'connecting'}
				>
					{#if chState.status === 'connected'}
						<Check size={15} class="text-neon-text" />
						<span class="text-neon-text">{$t('channels.status.connected')}</span>
						{#if chState.lastSync}
							<span class="ml-auto text-xs text-muted">
								{new Date(chState.lastSync).toLocaleString()}
							</span>
						{/if}
					{:else if chState.status === 'connecting'}
						<Loader2 size={15} class="text-warn animate-spin" />
						<span class="text-warn">{$t('channels.status.connecting')}…</span>
					{:else if chState.status === 'error'}
						<Check size={15} class="text-danger" />
						<span class="text-danger">{chState.error ?? 'Connection failed'}</span>
					{/if}
				</div>
			{/if}

			<div class="mt-5 flex items-center justify-between gap-3">
				<div class="flex gap-2">
					{#if chState.status === 'connected'}
						<Button
							variant="ghost"
							onclick={disconnect}
							disabled={chState.status === 'connecting'}
						>
							<X size={15} />
							{$t('channels.disconnect')}
						</Button>
					{:else}
						<Button
							onclick={connect}
							disabled={chState.status === 'connecting'}
						>
							{#if state.status === 'connecting'}
								<Loader2 size={15} class="animate-spin" />
							{/if}
							{$t('channels.connect')}
						</Button>
					{/if}
				</div>
				<div class="flex gap-2">
					<Button variant="ghost" onclick={() => (open = false)}>
						{$t('common.close')}
					</Button>
					<Button onclick={save} disabled={saving}>
						{#if saved}
							<Check size={15} />
							{$t('settings.saved')}
						{:else if saving}
							<Loader2 size={15} class="animate-spin" />
							…
						{:else}
							{$t('settings.save')}
						{/if}
					</Button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
