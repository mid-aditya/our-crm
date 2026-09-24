<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { ArrowLeft, Settings2, CheckCircle, XCircle, AlertCircle, Phone, MessageCircle, MessageSquare, User, Hash, ShoppingBag, Send } from '@lucide/svelte';
	import { getCompany, getChannelTypes, getCompanyChannels, enableChannel, disableChannel, saveChannelConfig, type ChannelType, type CompanyChannel, type ChannelDetail } from '$lib/api-channels';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	const companyId = $derived(page.params.id);

	let company = $state<any>(null);
	let channelTypes = $state<ChannelType[]>([]);
	let companyChannels = $state<Map<string, CompanyChannel>>(new Map());
	let loading = $state(true);
	let error = $state('');
	let configModal = $state<ChannelType | null>(null);
	let channelDetail = $state<ChannelDetail | null>(null);
	let configLoading = $state(false);
	let saving = $state(false);
	let configError = $state('');
	let configValues = $state<Record<string, string>>({});

	const iconMap: Record<string, any> = {
		Phone: Phone,
		MessageCircle: MessageCircle,
		MessageSquare: MessageSquare,
		User: User,
		Hash: Hash,
		ShoppingBag: ShoppingBag,
		Send: Send,
	};

	async function load() {
		loading = true;
		error = '';
		try {
			const [co, types, channels] = await Promise.all([
				getCompany(companyId),
				getChannelTypes(),
				getCompanyChannels()
			]);
			company = co;
			channelTypes = types;
			const map = new Map<string, CompanyChannel>();
			for (const ch of channels) {
				map.set(ch.channel_type_id, ch);
			}
			companyChannels = map;
		} catch (e: any) {
			error = e.message || 'Gagal memuat data';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (companyId) load();
	});

	function isEnabled(typeId: string): boolean {
		return companyChannels.get(typeId)?.status === 'active';
	}

	function getStatus(typeId: string): 'active' | 'inactive' | 'error' {
		return companyChannels.get(typeId)?.status ?? 'inactive';
	}

	async function toggleChannel(typeId: string) {
		try {
			if (isEnabled(typeId)) {
				await disableChannel(typeId);
			} else {
				await enableChannel(typeId);
			}
			await load();
		} catch (e: any) {
			error = e.message;
		}
	}

	async function openConfig(ch: ChannelType) {
		configModal = ch;
		configError = '';
		configValues = {};
		configLoading = true;
		try {
			const detail = await getCompanyChannels().then(channels => {
				const found = channels.find((c: CompanyChannel) => c.channel_type_id === ch.id);
				if (!found) return null;
				return getCompanyChannel(ch.id);
			});
			// @ts-ignore
			if (detail) {
				channelDetail = await detail;
				if (channelDetail?.configs?.[0]?.config) {
					configValues = { ...channelDetail.configs[0].config };
				}
			} else {
				channelDetail = null;
			}
		} catch (e: any) {
			configError = e.message;
		} finally {
			configLoading = false;
		}
	}

	async function handleSaveConfig() {
		if (!configModal) return;
		saving = true;
		configError = '';
		try {
			await saveChannelConfig(configModal.id, configValues);
			configModal = null;
			await load();
		} catch (e: any) {
			configError = e.message;
		} finally {
			saving = false;
		}
	}

	const statusVariant = (s: string) =>
		s === 'active' ? 'success' : s === 'error' ? 'error' : 'default';
	const statusLabel = (s: string) =>
		s === 'active' ? 'Aktif' : s === 'error' ? 'Error' : 'Nonaktif';
</script>

<div class="mb-6">
	<button onclick={() => goto('/dashboard/companies')} class="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
		<ArrowLeft size={14} />
		Semua Companies
	</button>
	{#if company}
		<h1 class="font-display text-2xl font-bold">{company.name}</h1>
		<p class="mt-1 text-sm text-muted">/{company.slug} · {company.user_count} users</p>
	{/if}
</div>

{#if error}
	<div class="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">{error}</div>
{/if}

{#if loading}
	<div class="py-12 text-center text-sm text-muted">Memuat channel configuration...</div>
{:else}
	<div class="grid gap-4 xl:grid-cols-2">
		{#each channelTypes as ct (ct.id)}
			{@const enabled = isEnabled(ct.id)}
			{@const status = getStatus(ct.id)}
			{@const Icon = iconMap[ct.icon] ?? MessageSquare}
			<Card class="relative overflow-hidden">
				<!-- Status indicator stripe -->
				<div class="absolute left-0 top-0 bottom-0 w-1" style="background: {enabled ? ct.color : 'var(--color-faint)'}"></div>

				<div class="flex items-start gap-4 pl-3">
					<!-- Channel icon -->
					<div
						class="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl"
						style="background: {enabled ? ct.color + '20' : 'var(--color-raised)'}; color: {enabled ? ct.color : 'var(--color-muted)'}">
						<Icon size={18} />
					</div>

					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2 flex-wrap">
							<h3 class="font-semibold text-foreground">{ct.name}</h3>
							<Badge variant={statusVariant(status)} dot size="sm">{statusLabel(status)}</Badge>
						</div>
						<p class="mt-1 text-xs text-muted line-clamp-2">{ct.description}</p>

						<div class="mt-3 flex items-center gap-2">
							{#if enabled}
								<Button variant="outline" size="sm" onclick={() => openConfig(ct)}>
									<Settings2 size={13} />
									Configure
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => toggleChannel(ct.id)}
									class="text-warn hover:bg-warn/10"
								>
									Disable
								</Button>
							{:else}
								<Button size="sm" onclick={() => toggleChannel(ct.id)}>
									Enable Channel
								</Button>
							{/if}
						</div>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}

<!-- Config Modal -->
{#if configModal}
	{@const Icon = iconMap[configModal.icon] ?? MessageSquare}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) configModal = null; }}>
		<div class="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-xl" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-line p-5">
				<div class="flex items-center gap-3">
					<div class="flex size-9 items-center justify-center rounded-lg" style="background: {configModal.color}20; color: {configModal.color}">
						<Icon size={16} />
					</div>
					<div>
						<h2 class="font-semibold">{configModal.name} Configuration</h2>
						<p class="text-xs text-muted">Set API credentials for this channel</p>
					</div>
				</div>
				<button onclick={() => (configModal = null)} class="size-8 flex items-center justify-center rounded-lg text-muted hover:bg-raised transition-colors">
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
				</button>
			</div>

			<div class="p-5">
				{#if configError}
					<div class="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">{configError}</div>
				{/if}

				{#if configLoading}
					<div class="py-6 text-center text-sm text-muted">Memuat...</div>
				{:else}
					<div class="space-y-4">
						{#if configModal.config_schema && Object.keys(configModal.config_schema).length > 0}
							{#each Object.entries(configModal.config_schema) as [key, field] (key)}
								<div>
									<label class="mb-1.5 block text-xs font-medium text-muted" for="cfg-{key}">
										{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
										{#if field.description}
											<span class="font-normal text-faint"> — {field.description}</span>
										{/if}
									</label>
									{#if key.toLowerCase().includes('token') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('key')}
										<input
											id="cfg-{key}"
											type="password"
											bind:value={configValues[key]}
											placeholder="••••••••"
											class="w-full rounded-xl border border-line bg-surface-secondary px-3.5 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
										/>
									{:else}
										<Input
											id="cfg-{key}"
											bind:value={configValues[key]}
											placeholder="Masukkan nilai..."
										/>
									{/if}
								</div>
							{/each}
						{:else}
							<p class="text-sm text-muted">Tidak ada field konfigurasi untuk channel ini.</p>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex justify-end gap-2 border-t border-line p-4">
				<Button variant="ghost" onclick={() => (configModal = null)}>Batal</Button>
				<Button onclick={handleSaveConfig} disabled={saving || configLoading}>
					{saving ? 'Menyimpan...' : 'Simpan'}
				</Button>
			</div>
		</div>
	</div>
{/if}
