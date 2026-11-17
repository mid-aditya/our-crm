<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import {
		AlertTriangle,
		ArrowLeft,
		CheckCheck,
		MessageSquare,
		Save,
		Send,
		Sparkles,
		Users
	} from '@lucide/svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { userStore } from '$lib/api';
	import { cn, initials } from '$lib/utils';
	import {
		createCampaign,
		getAudienceMeta,
		getCampaignChannels,
		launchCampaign,
		previewDraft,
		type AudienceMeta,
		type CampaignChannel,
		type PreviewResult
	} from '$lib/campaigns/api';

	const VAR_KEYS = ['nama', 'nama_lengkap', 'perusahaan', 'email', 'hp'] as const;
	const MAX_CHARS = 4096;

	const FALLBACK_VARS: Record<string, string> = {
		nama: 'Rina',
		nama_lengkap: 'Rina Kusuma',
		perusahaan: 'TokoKita',
		email: 'rina@tokokita.id',
		hp: '+62 812-3456-7890'
	};

	let name = $state('');
	let channelId = $state('');
	let tag = $state('');
	let source = $state('');
	let template = $state('');
	let editorWrap = $state<HTMLDivElement>();

	let channels = $state<CampaignChannel[]>([]);
	let audienceMeta = $state<AudienceMeta | null>(null);
	let previewData = $state<PreviewResult | null>(null);
	let sampleIndex = $state(0);

	let loading = $state(true);
	let loaded = $state(false);
	let previewing = $state(false);
	let saving = $state(false);
	let sending = $state(false);
	let loadError = $state('');
	let actionError = $state('');

	let errors = $state<{
		name?: string;
		channel?: string;
		template?: string;
		audience?: string;
	}>({});

	const role = $derived(((($userStore?.role as string | undefined) ?? '') as string).toLowerCase());
	const canUse = $derived(['admin', 'spv', 'developer', 'owner'].includes(role));

	const channelOptions = $derived(
		channels.map((c) => ({
			value: c.id,
			label: c.ready
				? c.name
				: `${c.name} · ${$t('campaigns.composer.channelNotReady')}`
		}))
	);
	const selectedChannel = $derived(channels.find((c) => c.id === channelId) ?? null);

	const tagOptions = $derived([
		{ value: '', label: $t('campaigns.composer.allTags') },
		...(audienceMeta?.tags ?? []).map((v) => ({ value: v, label: v }))
	]);
	const sourceOptions = $derived([
		{ value: '', label: $t('campaigns.composer.allSources') },
		...(audienceMeta?.sources ?? []).map((v) => ({ value: v, label: v }))
	]);

	const samples = $derived(previewData?.samples ?? []);
	const activeSample = $derived(
		samples.length === 0 ? null : samples[Math.min(sampleIndex, samples.length - 1)]
	);
	const recipientCount = $derived(previewData?.total ?? audienceMeta?.with_phone ?? 0);
	const previewText = $derived(renderLocal(template, activeSample?.vars));
	const senderName = $derived(selectedChannel?.name ?? 'WhatsApp Business');
	const tooLong = $derived(template.length > MAX_CHARS);

	const canSubmit = $derived(
		name.trim() !== '' &&
			channelId !== '' &&
			selectedChannel?.ready === true &&
			template.trim() !== '' &&
			recipientCount > 0 &&
			!tooLong &&
			!saving &&
			!sending
	);

	onMount(async () => {
		if (!canUse) {
			loading = false;
			return;
		}
		try {
			const [chs, meta] = await Promise.all([getCampaignChannels(), getAudienceMeta()]);
			channels = chs;
			audienceMeta = meta;
			const first = chs.find((c) => c.ready) ?? chs[0];
			channelId = first?.id ?? '';
		} catch (e: any) {
			loadError = e?.message || $t('campaigns.list.error');
		} finally {
			loading = false;
			loaded = true;
		}
	});

	// Pratinjau ulang (debounce) setiap template/filter berubah.
	$effect(() => {
		const tpl = template;
		const tg = tag;
		const src = source;
		if (!loaded || !canUse) return;
		const handle = setTimeout(() => {
			void refreshPreview(tpl, tg, src);
		}, 400);
		return () => clearTimeout(handle);
	});

	let previewSeq = 0;

	async function refreshPreview(tpl: string, tg: string, src: string) {
		const seq = ++previewSeq;
		previewing = true;
		try {
			const res = await previewDraft(tpl, {
				tags: tg ? [tg] : [],
				source: src
			});
			if (seq !== previewSeq) return;
			previewData = res;
			if (sampleIndex >= res.samples.length) sampleIndex = 0;
		} catch (e: any) {
			if (seq === previewSeq) actionError = e?.message || $t('campaigns.list.error');
		} finally {
			if (seq === previewSeq) previewing = false;
		}
	}

	function renderLocal(tpl: string, vars: Record<string, string> | undefined): string {
		const values = vars ?? FALLBACK_VARS;
		return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, rawKey) => {
			const key = String(rawKey).toLowerCase();
			return values[key] ?? match;
		});
	}

	async function insertVar(key: string) {
		const token = `{{${key}}}`;
		const el = editorWrap?.querySelector('textarea');
		if (!el) {
			template += token;
			return;
		}
		const start = el.selectionStart ?? template.length;
		const end = el.selectionEnd ?? start;
		template = template.slice(0, start) + token + template.slice(end);
		await tick();
		el.focus();
		el.selectionStart = el.selectionEnd = start + token.length;
	}

	function audiencePayload() {
		return { tags: tag ? [tag] : [], source };
	}

	function validate(): boolean {
		errors = {};
		if (!name.trim()) errors.name = $t('campaigns.composer.errName');
		if (!channelId) errors.channel = $t('campaigns.composer.errChannel');
		else if (!selectedChannel?.ready) errors.channel = $t('campaigns.composer.errChannel');
		if (!template.trim()) errors.template = $t('campaigns.composer.errTemplate');
		if (tooLong) errors.template = $t('campaigns.composer.errTooLong');
		if (recipientCount === 0) errors.audience = $t('campaigns.composer.noRecipients');
		return Object.keys(errors).length === 0;
	}

	async function saveDraft() {
		actionError = '';
		if (!validate()) return;
		saving = true;
		try {
			await createCampaign({
				name: name.trim(),
				channel_id: channelId,
				template,
				audience: audiencePayload()
			});
			goto('/campaigns');
		} catch (e: any) {
			actionError = e?.message || $t('campaigns.list.error');
		} finally {
			saving = false;
		}
	}

	async function sendNow() {
		actionError = '';
		if (!validate()) return;
		sending = true;
		try {
			const fresh = await previewDraft(template, audiencePayload());
			previewData = fresh;
			const ok = await askConfirm({
				title: $t('campaigns.composer.confirmTitle'),
				description: $t('campaigns.composer.confirmDesc', {
					values: { n: fresh.total }
				}),
				confirmLabel: $t('campaigns.composer.confirmSend'),
				danger: true
			});
			if (!ok) return;
			const { id } = await createCampaign({
				name: name.trim(),
				channel_id: channelId,
				template,
				audience: audiencePayload()
			});
			await launchCampaign(id);
			goto('/campaigns');
		} catch (e: any) {
			actionError = e?.message || $t('campaigns.list.error');
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('campaigns.composer.title')} · {$t('campaigns.title')}</title>
</svelte:head>

{#if !canUse}
	<EmptyState
		title={$t('campaigns.composer.restricted')}
		description={$t('campaigns.composer.restrictedDesc')}
	>
		{#snippet icon()}
			<Users size={18} />
		{/snippet}
		<Button variant="outline" onclick={() => goto('/campaigns')}>
			{$t('common.back')}
		</Button>
	</EmptyState>
{:else}
	<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
		<div>
			<a
				href="/campaigns"
				class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
			>
				<ArrowLeft size={14} />
				{$t('campaigns.composer.back')}
			</a>
			<h1 class="font-display text-xl font-semibold tracking-tight">
				{$t('campaigns.composer.title')}
			</h1>
			<p class="mt-1 max-w-2xl text-sm text-muted">{$t('campaigns.composer.subtitle')}</p>
		</div>
		<Badge variant="neon" dot>{role === 'spv' ? 'SPV' : role.toUpperCase()}</Badge>
	</div>

	{#if loadError}
		<div class="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
			{loadError}
		</div>
	{/if}

	{#if !loading && channels.length === 0}
		<div class="mb-4 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
			<p class="text-sm font-medium text-warn">{$t('campaigns.composer.noChannels')}</p>
			<p class="mt-1 text-xs text-muted">{$t('campaigns.composer.noChannelsDesc')}</p>
			<a
				href="/settings"
				class="mt-2 inline-block text-xs font-semibold text-neon-text hover:underline"
			>
				{$t('campaigns.composer.goSettings')} →
			</a>
		</div>
	{/if}

	<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
		<!-- Kolom form -->
		<div class="space-y-4">
			<Card
				title={$t('campaigns.composer.audienceTitle')}
				description={$t('campaigns.composer.audienceDesc')}
			>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label={$t('campaigns.form.name')} for="campaign-name">
						<Input
							id="campaign-name"
							bind:value={name}
							placeholder={$t('campaigns.form.namePh')}
							error={errors.name}
						/>
					</Field>
					<Field label={$t('campaigns.form.channel')} for="campaign-channel">
						<Select
							options={channelOptions}
							bind:value={channelId}
							placeholder={$t('common.select')}
						/>
						{#if errors.channel}
							<p class="mt-1 text-xs text-danger">{errors.channel}</p>
						{/if}
					</Field>
				</div>

				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					<Field label={$t('campaigns.composer.tags')}>
						<Select options={tagOptions} bind:value={tag} />
					</Field>
					<Field label={$t('campaigns.composer.source')}>
						<Select options={sourceOptions} bind:value={source} />
					</Field>
				</div>

				<div
					class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised/50 px-3 py-2"
				>
					<Users size={14} class="text-neon-text" />
					<span class="text-xs text-muted">
						{$t('campaigns.composer.recipientsHint', {
							values: { n: recipientCount }
						})}
					</span>
					{#if audienceMeta}
						<span class="ml-auto text-[11px] text-faint">
							{audienceMeta.with_phone} / {audienceMeta.total}
							{$t('campaigns.composer.havePhone')}
						</span>
					{/if}
				</div>
				{#if errors.audience}
					<p class="mt-2 text-xs text-danger">{errors.audience}</p>
				{/if}
			</Card>

			<Card
				title={$t('campaigns.composer.messageTitle')}
				description={$t('campaigns.composer.messageDesc')}
			>
				<div class="mb-2 flex flex-wrap items-center gap-1.5">
					<span class="mr-1 text-[11px] font-medium uppercase tracking-wide text-faint">
						{$t('campaigns.composer.variables')}
					</span>
					{#each VAR_KEYS as key (key)}
						<button
							type="button"
							onclick={() => insertVar(key)}
							class="rounded-md border border-line bg-surface px-2 py-1 font-mono text-[11px] text-neon-text transition-colors hover:border-neon hover:bg-neon-soft"
						>
							{`{{${key}}}`}
						</button>
					{/each}
				</div>

				<div bind:this={editorWrap}>
					<Textarea
						bind:value={template}
						rows={9}
						placeholder={$t('campaigns.composer.messagePh')}
						error={errors.template}
						class="font-mono text-[13px] leading-relaxed"
					/>
				</div>

				<div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
					<p class="text-faint">{$t('campaigns.composer.formatHint')}</p>
					<p class={tooLong ? 'font-mono font-semibold text-danger' : 'font-mono text-faint'}>
						{template.length} / {MAX_CHARS}
					</p>
				</div>
			</Card>

			{#if previewData?.unknown_vars?.length}
				<div class="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-soft px-3 py-2.5">
					<AlertTriangle size={15} class="mt-0.5 shrink-0 text-warn" />
					<div class="text-xs text-warn">
						<span class="font-semibold">{$t('campaigns.composer.unknownVars')}</span>
						<span class="ml-1 font-mono">
							{previewData.unknown_vars.map((v) => `{{${v}}}`).join(', ')}
						</span>
						<p class="mt-0.5 text-[11px] opacity-80">
							{$t('campaigns.composer.unknownVarsHint')}
						</p>
					</div>
				</div>
			{/if}

			{#if actionError}
				<div class="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
					{actionError}
				</div>
			{/if}

			<div
				class="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/95 p-3 shadow-lg shadow-black/5 backdrop-blur"
			>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-medium">
						{recipientCount}
						{$t('campaigns.composer.recipients')}
					</p>
					<p class="truncate text-[11px] text-faint">
						{template.length} {$t('campaigns.composer.chars')}
						{#if selectedChannel && !selectedChannel.ready}
							· <span class="text-warn">{$t('campaigns.composer.channelNotReady')}</span>
						{/if}
					</p>
				</div>
				<Button variant="outline" onclick={saveDraft} disabled={!canSubmit}>
					<Save size={15} />
					{$t('campaigns.composer.saveDraft')}
				</Button>
				<Button onclick={sendNow} disabled={!canSubmit}>
					<Send size={15} />
					{sending ? $t('campaigns.composer.sending') : $t('campaigns.composer.sendNow')}
				</Button>
			</div>
		</div>

		<!-- Kolom pratinjau -->
		<div class="lg:sticky lg:top-20 lg:self-start">
			<div class="rounded-2xl border border-line bg-surface p-4">
				<div class="mb-3 flex items-center justify-between gap-2">
					<div>
						<h2 class="font-display text-sm font-semibold">
							{$t('campaigns.composer.previewTitle')}
						</h2>
						<p class="text-[11px] text-faint">{$t('campaigns.composer.previewDesc')}</p>
					</div>
					{#if previewing}
						<Sparkles size={14} class="animate-pulse text-neon-text" />
					{:else}
						<MessageSquare size={14} class="text-faint" />
					{/if}
				</div>

				<!-- Frame WhatsApp -->
				<div class="overflow-hidden rounded-[1.4rem] border-[6px] border-ink/80 bg-[#0b141a] shadow-xl">
					<div class="flex items-center gap-2 bg-[#1f2c34] px-3 py-2.5 text-white">
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[11px] font-semibold"
						>
							{initials(activeSample?.name || senderName)}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-semibold">{senderName}</p>
							<p class="text-[10px] text-white/55">{$t('campaigns.composer.online')}</p>
						</div>
						<CheckCheck size={15} class="text-white/50" />
					</div>

					<div
						class="min-h-[300px] px-3 py-4"
						style="background-color:#0b141a;background-image:radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);background-size:16px 16px;"
					>
						{#if template.trim()}
							<div class="ml-auto max-w-[88%]">
								<div
									class="rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-[13px] leading-relaxed text-[#e9edef] shadow"
								>
									<p class="whitespace-pre-wrap break-words">{previewText}</p>
									<div class="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/55">
										<span>09:41</span>
										<CheckCheck size={12} />
									</div>
								</div>
							</div>
						{:else}
							<div class="flex h-[260px] items-center justify-center px-6 text-center">
								<p class="text-xs leading-relaxed text-white/35">
									{$t('campaigns.composer.emptyPreview')}
								</p>
							</div>
						{/if}
					</div>
				</div>

				{#if samples.length > 0}
					<div class="mt-3">
						<p class="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">
							{$t('campaigns.composer.sample')}
						</p>
						<div class="flex flex-wrap gap-1.5">
							{#each samples as sample, i (sample.phone)}
								<button
									type="button"
									onclick={() => (sampleIndex = i)}
									class={cn(
										'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
										i === sampleIndex
											? 'border-neon bg-neon-soft text-neon-text'
											: 'border-line text-muted hover:border-line-strong'
									)}
								>
									{sample.name || sample.phone}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
					<div class="rounded-lg bg-raised/60 px-2 py-2">
						<p class="font-display text-lg font-semibold leading-none">{recipientCount}</p>
						<p class="mt-1 text-[10px] uppercase tracking-wide text-faint">
							{$t('campaigns.composer.recipients')}
						</p>
					</div>
					<div class="rounded-lg bg-raised/60 px-2 py-2">
						<p class="font-display text-lg font-semibold leading-none">{template.length}</p>
						<p class="mt-1 text-[10px] uppercase tracking-wide text-faint">
							{$t('campaigns.composer.chars')}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
