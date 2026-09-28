<script lang="ts">
	import { onMount } from 'svelte';
	import { t, locale as currentLocale } from 'svelte-i18n';
	import { Check, Languages, Monitor, Moon, Sun } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import {
		getChannelTypes,
		getCompanyChannels,
		enableChannel,
		disableChannel,
		saveChannelConfig,
		type ChannelType,
		type CompanyChannel
	} from '$lib/api-channels';
	import { theme, setTheme, type Theme } from '$lib/theme.svelte';
	import { setLocale, locales, localeNames, type AppLocale } from '$lib/i18n';
	import { apiPage, getRoleMenus, setRoleMenus, getUser } from '$lib/api';
	import { setSupervisor } from '$lib/team/api';
	import { navItems } from '$lib/navigation';
	import {
		getHours,
		putHours,
		getActivityLogs,
		getBotQA,
		createBotQA,
		updateBotQA,
		deleteBotQA,
		dayName,
		getTicketFields,
		createTicketField,
		deleteTicketField,
		updateTicketField,
		type HourRow,
		type ActivityRow,
		type BotQA,
		type TicketField
	} from '$lib/team/api';
	import { cn } from '$lib/utils';

	let company = $state('PT Maju Jaya');
	let timezone = $state('Asia/Jakarta');
	let saved = $state(false);
	let savedTimeout: ReturnType<typeof setTimeout>;

	const tzOptions = [
		{ value: 'Asia/Jakarta', label: 'Asia/Jakarta (GMT+7)' },
		{ value: 'Asia/Makassar', label: 'Asia/Makassar (GMT+8)' },
		{ value: 'Asia/Jayapura', label: 'Asia/Jayapura (GMT+9)' }
	];

	const themeOptions: Array<{ value: Theme; key: string }> = [
		{ value: 'light', key: 'theme.light' },
		{ value: 'dark', key: 'theme.dark' },
		{ value: 'system', key: 'theme.system' }
	];

	function segmented(selected: boolean) {
		return cn(
			'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
			selected
				? 'border-neon bg-neon-soft text-ink'
				: 'border-line text-muted hover:border-line-strong hover:text-ink'
		);
	}

	function save(e: SubmitEvent) {
		e.preventDefault();
		saved = true;
		clearTimeout(savedTimeout);
		savedTimeout = setTimeout(() => (saved = false), 2000);
	}

	// ---- Approval menu agent (admin/developer) ----
	type TeamUser = { id: string; email: string; full_name: string; role_id: string | null; status: string; supervisor_id?: string | null };
	let teamUsers = $state<TeamUser[]>([]);
	let selectedUserId = $state('');
	let menusLoading = $state(false);
	let supervisorId = $state('');
	let supervisorSaving = $state(false);

	// ---- Akses sidebar per role (agent/spv) ----
	const menuRoles = ['agent', 'spv'] as const;
	let menuRole = $state<'agent' | 'spv'>('agent');
	let roleMenus = $state<Record<string, string[]>>({ agent: [], spv: [] });
	let roleMenusSaving = $state(false);

	onMount(async () => {
		try {
			const res = await apiPage<TeamUser[]>('/users');
			teamUsers = res.data ?? [];
		} catch {
			teamUsers = [];
		}
	});

	async function loadGrants(userId: string) {
		selectedUserId = userId;
		const sel = teamUsers.find((u) => u.id === userId);
		supervisorId = sel?.supervisor_id ?? '';
		if (!userId) return;
		menusLoading = true;
		try {
			await loadRoleMenus();
		} finally {
			menusLoading = false;
		}
	}

	async function loadRoleMenus() {
		try {
			const [agent, spv] = await Promise.all([getRoleMenus('agent'), getRoleMenus('spv')]);
			roleMenus = { agent, spv };
		} catch {
			// abaikan, pakai state terakhir
		}
	}

	function toggleRoleMenu(key: string) {
		const cur = roleMenus[menuRole] ?? [];
		roleMenus = {
			...roleMenus,
			[menuRole]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
		};
	}

	async function saveRoleMenus() {
		roleMenusSaving = true;
		try {
			await setRoleMenus(menuRole, roleMenus[menuRole] ?? []);
			saved = true;
			clearTimeout(savedTimeout);
			savedTimeout = setTimeout(() => (saved = false), 2000);
		} catch {
			// abaikan
		} finally {
			roleMenusSaving = false;
		}
	}

	async function saveSupervisor() {
		if (!selectedUserId) return;
		supervisorSaving = true;
		try {
			await setSupervisor(selectedUserId, supervisorId || null);
			const sel = teamUsers.find((u) => u.id === selectedUserId);
			if (sel) sel.supervisor_id = supervisorId || null;
		} catch {
			// abaikan
		} finally {
			supervisorSaving = false;
		}
	}

	const myRole = $derived((getUser()?.role ?? '').toLowerCase());
	const canManageOps = $derived(['developer', 'admin', 'owner'].includes(myRole));
	const canSeeActivity = $derived(['developer', 'admin', 'spv', 'owner'].includes(myRole));

	// ---- Jam operasional ----
	let hours = $state<HourRow[]>([]);
	let hoursSaving = $state(false);

	onMount(async () => {
		try {
			hours = await getHours();
		} catch { hours = []; }
		if (canSeeActivity) {
			try {
				activity = await getActivityLogs();
			} catch { activity = []; }
		}
	});

	async function saveHours() {
		hoursSaving = true;
		try {
			await putHours(hours);
			saved = true;
			clearTimeout(savedTimeout);
			savedTimeout = setTimeout(() => (saved = false), 2000);
		} catch {
			// abaikan
		} finally {
			hoursSaving = false;
		}
	}

	// ---- Log aktivitas ----
	let activity = $state<ActivityRow[]>([]);

	// ---- Bot responder ----
	let botQA = $state<BotQA[]>([]);
	let botForm = $state({ keywords: '', question: '', answer: '', escalate: false });
	let subFor = $state<string | null>(null);
	let subForm = $state({ keywords: '', question: '', answer: '', escalate: false });

	const topBotQA = $derived(botQA.filter((b) => !b.parent_id));
	const botChildren = $derived((id: string) => botQA.filter((b) => b.parent_id === id));

	// ---- Form tiket custom per company ----
	let ticketFields = $state<TicketField[]>([]);
	let fieldForm = $state({ label: '', field_type: 'text', required: false, options: '' });
	let editingField = $state<string | null>(null);
	let editFieldForm = $state({ label: '', options: '' });

	// ---- Channel API per company ----
	let channelTypes = $state<ChannelType[]>([]);
	let companyChannels = $state<CompanyChannel[]>([]);
	let chLoading = $state(false);
	let chError = $state('');
	let cfgFor = $state<string | null>(null);
	let cfgValues = $state<Record<string, string>>({});
	let cfgSaving = $state(false);

	function chEnabled(typeId: string) {
		return companyChannels.find((c) => c.channel_type_id === typeId)?.status === 'active';
	}

	async function loadChannels() {
		chLoading = true;
		chError = '';
		try {
			const [types, mine] = await Promise.all([getChannelTypes(), getCompanyChannels()]);
			channelTypes = types;
			companyChannels = mine;
		} catch (e: any) {
			chError = e.message || 'Gagal memuat channel';
		} finally {
			chLoading = false;
		}
	}

	async function toggleCh(typeId: string) {
		try {
			if (chEnabled(typeId)) await disableChannel(typeId);
			else await enableChannel(typeId);
			await loadChannels();
		} catch (e: any) {
			chError = e.message;
		}
	}

	function schemaKeys(t: ChannelType): string[] {
		try {
			const s = (t.config_schema ?? {}) as Record<string, unknown>;
			return Object.keys(s);
		} catch {
			return [];
		}
	}

	async function saveCfg(t: ChannelType) {
		cfgSaving = true;
		try {
			await saveChannelConfig(t.id, cfgValues);
			cfgFor = null;
			cfgValues = {};
			await loadChannels();
		} catch (e: any) {
			chError = e.message;
		} finally {
			cfgSaving = false;
		}
	}

	onMount(async () => {
		void loadChannels();
	});

	onMount(async () => {
		if (canManageOps) {
			try {
				botQA = await getBotQA();
			} catch { botQA = []; }
			try {
				ticketFields = await getTicketFields();
			} catch { ticketFields = []; }
			await loadRoleMenus();
		}
	});

	async function addField() {
		if (!fieldForm.label.trim()) return;
		try {
			await createTicketField({
				label: fieldForm.label.trim(),
				field_type: fieldForm.field_type,
				required: fieldForm.required,
				options: fieldForm.options.split(',').map((s) => s.trim()).filter(Boolean)
			});
			fieldForm = { label: '', field_type: 'text', required: false, options: '' };
			ticketFields = await getTicketFields();
		} catch { /* abaikan */ }
	}

	async function removeField(id: string) {
		if (!confirm($t('common.confirmDelete'))) return;
		try {
			await deleteTicketField(id);
			ticketFields = await getTicketFields();
		} catch { /* abaikan */ }
	}

	async function toggleFieldFlag(f: TicketField, key: 'required' | 'active') {
		try {
			await updateTicketField(f.id, { [key]: !f[key] });
			ticketFields = await getTicketFields();
		} catch { /* abaikan */ }
	}

	async function moveField(f: TicketField, dir: -1 | 1) {
		const sorted = [...ticketFields].sort((a, b) => a.position - b.position);
		const i = sorted.findIndex((x) => x.id === f.id);
		const j = i + dir;
		if (i < 0 || j < 0 || j >= sorted.length) return;
		try {
			await updateTicketField(sorted[i].id, { position: sorted[j].position });
			await updateTicketField(sorted[j].id, { position: sorted[i].position });
			ticketFields = await getTicketFields();
		} catch { /* abaikan */ }
	}

	function startEditField(f: TicketField) {
		editingField = f.id;
		editFieldForm = { label: f.label, options: f.options.join(', ') };
	}

	async function saveFieldEdit(f: TicketField) {
		if (!editFieldForm.label.trim()) return;
		try {
			await updateTicketField(f.id, {
				label: editFieldForm.label.trim(),
				options: editFieldForm.options.split(',').map((s) => s.trim()).filter(Boolean)
			});
			editingField = null;
			ticketFields = await getTicketFields();
		} catch { /* abaikan */ }
	}

	async function addBotQA() {
		if (!botForm.answer.trim()) return;
		try {
			await createBotQA(botForm);
			botForm = { keywords: '', question: '', answer: '', escalate: false };
			botQA = await getBotQA();
		} catch { /* abaikan */ }
	}

	async function toggleBotActive(b: BotQA) {
		try {
			await updateBotQA(b.id, { active: !b.active });
			botQA = await getBotQA();
		} catch { /* abaikan */ }
	}

	async function removeBotQA(id: string, childCount = 0) {
		if (!confirm(childCount > 0 ? $t('common.confirmDeleteBotCascade') : $t('common.confirmDeleteBot'))) return;
		try {
			await deleteBotQA(id);
			botQA = await getBotQA();
		} catch { /* abaikan */ }
	}

	async function addSubQA(parentId: string) {
		if (!subForm.answer.trim()) return;
		try {
			await createBotQA({ ...subForm, parent_id: parentId });
			subForm = { keywords: '', question: '', answer: '', escalate: false };
			subFor = null;
			botQA = await getBotQA();
		} catch { /* abaikan */ }
	}
</script>

<p class="mb-4 text-sm text-muted">{$t('settings.subtitle')}</p>

<div class="mx-auto max-w-2xl space-y-5">
	<Card title={$t('settings.appearance')}>
		<div class="space-y-5">
			<div>
				<p class="text-sm font-medium">{$t('settings.theme')}</p>
				<p class="mt-0.5 text-xs text-muted">{$t('settings.themeDesc')}</p>
				<div class="mt-3 grid max-w-sm grid-cols-3 gap-2" role="group" aria-label={$t('settings.theme')}>
					{#each themeOptions as opt (opt.value)}
						<button
							class={segmented(theme.value === opt.value)}
							aria-pressed={theme.value === opt.value}
							onclick={() => setTheme(opt.value)}
						>
							{#if opt.value === 'light'}
								<Sun size={15} />
							{:else if opt.value === 'dark'}
								<Moon size={15} />
							{:else}
								<Monitor size={15} />
							{/if}
							{$t(opt.key)}
						</button>
					{/each}
				</div>
			</div>
			<div>
				<p class="text-sm font-medium">{$t('settings.language')}</p>
				<p class="mt-0.5 text-xs text-muted">{$t('settings.languageDesc')}</p>
				<div class="mt-3 grid max-w-sm grid-cols-2 gap-2" role="group" aria-label={$t('settings.language')}>
					{#each locales as l (l)}
						{@const label = localeNames[l as AppLocale]}
						<button
							class={segmented(($currentLocale as AppLocale) === l)}
							aria-pressed={($currentLocale as AppLocale) === l}
							onclick={() => setLocale(l as AppLocale)}
						>
							<Languages size={15} />
							{label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</Card>

	<Card title={$t('settings.workspace')}>
		<form class="space-y-3" onsubmit={save}>
			<Field label={$t('settings.company')}>
				<Input bind:value={company} />
			</Field>
			<Field label={$t('settings.timezone')}>
				<Select options={tzOptions} bind:value={timezone} />
			</Field>
			<div class="flex justify-end">
				<Button type="submit">
					{#if saved}
						<Check size={15} />
						{$t('settings.saved')}
					{:else}
						{$t('settings.save')}
					{/if}
				</Button>
			</div>
		</form>
	</Card>

	<Card title={$t('settings.channels')} description={$t('settings.channelsDesc')}>
		{#if chError}
			<p class="mb-2 rounded-md bg-danger-soft px-3 py-1.5 text-xs text-danger">{chError}</p>
		{/if}
		{#if chLoading}
			<p class="py-4 text-center text-xs text-muted">{$t('common.loading')}</p>
		{:else}
			<div class="space-y-2">
				{#each channelTypes as ct (ct.id)}
					<div class="rounded-lg border border-line p-3 text-xs">
						<div class="flex items-center gap-2">
							<span class="size-2.5 rounded-full" style="background: {ct.color};"></span>
							<span class="font-medium">{ct.name}</span>
							<Badge variant={chEnabled(ct.id) ? 'success' : 'neutral'}>
								{chEnabled(ct.id) ? $t('team.connected') : $t('team.disconnected')}
							</Badge>
							<span class="ml-auto flex gap-1.5">
								{#if cfgFor !== ct.id}
									<Button size="sm" variant="outline" onclick={() => { cfgFor = ct.id; cfgValues = {}; }}>
										API
									</Button>
								{/if}
								<Button size="sm" variant={chEnabled(ct.id) ? 'outline' : 'solid'} onclick={() => toggleCh(ct.id)}>
									{chEnabled(ct.id) ? $t('team.disable') : $t('team.enable')}
								</Button>
							</span>
						</div>
						<p class="mt-1 text-[11px] text-muted">{ct.description}</p>
						{#if cfgFor === ct.id}
							<div class="mt-2 space-y-1.5 rounded-md bg-raised p-2.5">
								{#each schemaKeys(ct) as k (k)}
									<Input
										bind:value={cfgValues[k]}
										placeholder={k}
										aria-label={k}
									/>
								{:else}
									<p class="text-[11px] text-muted">{$t('team.noConfigNeeded')}</p>
								{/each}
								<div class="flex justify-end gap-1.5">
									<Button size="sm" variant="outline" onclick={() => (cfgFor = null)}>{$t('common.cancel')}</Button>
									<Button size="sm" onclick={() => saveCfg(ct)} disabled={cfgSaving}>
										{cfgSaving ? $t('common.saving') : $t('common.save')}
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<p class="py-4 text-center text-xs text-muted">{$t('common.empty')}</p>
				{/each}
			</div>
		{/if}
	</Card>

	{#if canManageOps}
		<Card title={$t('team.ticketFormTitle')} description={$t('team.ticketFormDesc')}>
			<div class="space-y-2">
				<Input bind:value={fieldForm.label} placeholder={$t('team.fieldLabelPh')} />
				<div class="grid grid-cols-2 gap-2">
					<Select
						bind:value={fieldForm.field_type}
						aria-label={$t('team.fieldType')}
						options={[
							{ value: 'text', label: 'Text' },
							{ value: 'textarea', label: 'Textarea' },
							{ value: 'number', label: 'Number' },
							{ value: 'date', label: 'Date' },
							{ value: 'select', label: 'Select' }
						]}
					/>
					<label class="flex items-center gap-2 text-xs text-muted">
						<input type="checkbox" bind:checked={fieldForm.required} class="size-4 accent-[var(--neon)]" />
						{$t('team.fieldRequired')}
					</label>
				</div>
				{#if fieldForm.field_type === 'select'}
					<Input bind:value={fieldForm.options} placeholder={$t('team.fieldOptionsPh')} />
				{/if}
				<Button size="sm" onclick={addField} disabled={!fieldForm.label.trim()}>{$t('team.addField')}</Button>
			</div>
			<div class="mt-3 space-y-1.5">
				{#each [...ticketFields].sort((a, b) => a.position - b.position) as f (f.id)}
					{#if editingField === f.id}
						<div class="space-y-2 rounded-lg border border-neon/40 p-2.5">
							<Input bind:value={editFieldForm.label} placeholder={$t('team.fieldLabelPh')} />
							{#if f.field_type === 'select'}
								<Input bind:value={editFieldForm.options} placeholder={$t('team.fieldOptionsPh')} />
							{/if}
							<div class="flex gap-1.5">
								<Button size="sm" onclick={() => saveFieldEdit(f)}>{$t('common.save')}</Button>
								<Button size="sm" variant="ghost" onclick={() => (editingField = null)}>{$t('common.cancel')}</Button>
							</div>
						</div>
					{:else}
						<div class="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs">
							<span class="flex flex-col">
								<button type="button" onclick={() => moveField(f, -1)} class="leading-none text-faint hover:text-ink" aria-label="↑">▲</button>
								<button type="button" onclick={() => moveField(f, 1)} class="leading-none text-faint hover:text-ink" aria-label="↓">▼</button>
							</span>
							<span class="font-medium">{f.label}</span>
							<Badge variant="neutral">{f.field_type}{f.required ? ' • required' : ''}</Badge>
							{#if !f.active}
								<Badge variant="warn">off</Badge>
							{/if}
							<span class="ml-auto"></span>
							<button type="button" onclick={() => startEditField(f)} class="text-[11px] text-muted hover:text-ink hover:underline">
								{$t('common.edit')}
							</button>
							<button type="button" onclick={() => toggleFieldFlag(f, 'required')} class="text-[11px] text-muted hover:text-ink hover:underline">
								{f.required ? $t('team.optional') : $t('team.makeRequired')}
							</button>
							<button type="button" onclick={() => toggleFieldFlag(f, 'active')} class="text-[11px] text-muted hover:text-ink hover:underline">
								{f.active ? $t('team.deactivate') : $t('team.activate')}
							</button>
							<button type="button" onclick={() => removeField(f.id)} class="text-[11px] text-danger hover:underline">
								{$t('common.delete')}
							</button>
						</div>
					{/if}
				{:else}
					<p class="py-2 text-center text-[11px] text-muted">{$t('team.noFields')}</p>
				{/each}
			</div>
		</Card>
	{/if}

	<Card title={$t('team.hoursTitle')} description={$t('team.hoursDesc')}>
		<div class="space-y-1.5">
			{#each [1, 2, 3, 4, 5, 6, 0] as d (d)}
				{@const h = hours.find((x) => x.day_of_week === d)}
				<div class="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs">
					<span class="w-16 font-medium">{dayName(d, $currentLocale)}</span>
					{#if h}
						<label class="flex items-center gap-1.5 text-muted">
							<input
								type="checkbox"
								checked={!h.is_closed}
								disabled={!canManageOps}
								onchange={() => (h.is_closed = !h.is_closed)}
								class="size-4 accent-[var(--neon)]"
							/>
							{$t('team.open')}
						</label>
						{#if !h.is_closed}
							<input
								type="time"
								value={h.open_time ?? '09:00'}
								disabled={!canManageOps}
								onchange={(e) => (h.open_time = (e.target as HTMLInputElement).value)}
								class="rounded-md border border-line bg-surface px-2 py-1 text-xs"
							/>
							<span class="text-faint">–</span>
							<input
								type="time"
								value={h.close_time ?? '17:00'}
								disabled={!canManageOps}
								onchange={(e) => (h.close_time = (e.target as HTMLInputElement).value)}
								class="rounded-md border border-line bg-surface px-2 py-1 text-xs"
							/>
						{/if}
					{:else}
						<span class="text-faint">{$t('team.notSetup')}</span>
					{/if}
				</div>
			{/each}
			{#if canManageOps}
				<div class="flex justify-end pt-1">
					<Button size="sm" onclick={saveHours} disabled={hoursSaving}>
						{hoursSaving ? $t('common.saving') : $t('team.saveHours')}
					</Button>
				</div>
			{/if}
		</div>
	</Card>

	{#if canSeeActivity}
		<Card title={$t('team.activityTitle')} description={$t('team.activityDesc')}>
			<div class="max-h-96 space-y-1 overflow-y-auto">
				{#each activity.slice(0, 100) as a (a.id)}
					<div class="flex flex-wrap items-center gap-2 rounded-md bg-raised px-3 py-1.5 text-[11px]">
						<Badge variant={a.status_code >= 400 ? 'danger' : 'neutral'}>{a.method} {a.status_code}</Badge>
						<span class="font-medium">{a.user_name ?? a.user_id ?? '—'}</span>
						<Badge variant="neutral">{a.role_name ?? ''}</Badge>
						<span class="font-mono text-muted">{a.path}</span>
						<span class="ml-auto text-faint">{new Date(a.created_at).toLocaleString()}</span>
					</div>
				{:else}
					<p class="py-4 text-center text-xs text-muted">{$t('team.noActivity')}</p>
				{/each}
			</div>
		</Card>
	{/if}

	{#if canManageOps}
		<Card title={$t('team.botTitle')} description={$t('team.botDesc')}>
			<div class="space-y-2">
				<Input bind:value={botForm.keywords} placeholder={$t('team.keywordsPh')} />
				<Input bind:value={botForm.question} placeholder={$t('team.questionPh')} />
				<textarea
					bind:value={botForm.answer}
					placeholder={$t('team.answerPh')}
					rows="2"
					class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
				></textarea>
				<label class="flex items-center gap-2 text-xs text-muted">
					<input type="checkbox" bind:checked={botForm.escalate} class="size-4 accent-[var(--neon)]" />
					{$t('team.escalate')}
				</label>
				<Button size="sm" onclick={addBotQA} disabled={!botForm.answer.trim()}>{$t('team.addQA')}</Button>
			</div>
			<div class="mt-3 space-y-1.5">
				{#each topBotQA as b (b.id)}
					{@render qaRow(b, false)}
					{@const kids = botChildren(b.id)}
					{#if kids.length > 0}
						<div class="ml-4 space-y-1.5 border-l-2 border-neon/30 pl-2">
							{#each kids as k (k.id)}
								{@render qaRow(k, true)}
							{/each}
						</div>
					{/if}
					{#if subFor === b.id}
						<div class="ml-4 space-y-2 rounded-lg border border-dashed border-line p-2.5">
							<p class="text-[11px] font-semibold text-neon-text">{$t('team.subFor')} “{b.question || b.keywords}”</p>
							<Input bind:value={subForm.keywords} placeholder={$t('team.keywordsPh')} />
							<Input bind:value={subForm.question} placeholder={$t('team.questionPh')} />
							<textarea
								bind:value={subForm.answer}
								placeholder={$t('team.answerPh')}
								rows="2"
								class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
							></textarea>
							<label class="flex items-center gap-2 text-xs text-muted">
								<input type="checkbox" bind:checked={subForm.escalate} class="size-4 accent-[var(--neon)]" />
								{$t('team.escalate')}
							</label>
							<div class="flex gap-1.5">
								<Button size="sm" onclick={() => addSubQA(b.id)} disabled={!subForm.answer.trim()}>{$t('team.addSub')}</Button>
								<Button size="sm" variant="ghost" onclick={() => (subFor = null)}>{$t('common.cancel')}</Button>
							</div>
						</div>
					{/if}
				{:else}
					<p class="py-2 text-center text-[11px] text-muted">{$t('team.noQA')}</p>
				{/each}
			</div>
		</Card>
	{/if}

	{#snippet qaRow(b: BotQA, isChild: boolean)}
		<div class="rounded-lg border border-line p-2.5 text-xs">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<p class="font-medium">{isChild ? '↳ ' : ''}{b.question || $t('team.noLabel')}</p>
					<p class="mt-0.5 text-[11px] text-muted">🔑 {b.keywords || '—'}{b.escalate ? ' • eskalasi ke agent' : ''}{b.children > 0 ? ` • ${b.children} sub` : ''}</p>
					<p class="mt-1 rounded bg-raised p-1.5 text-[11px]">🤖 {b.answer}</p>
				</div>
				<div class="flex shrink-0 flex-wrap justify-end gap-1">
					{#if !isChild}
						<button
							type="button"
							onclick={() => (subFor = subFor === b.id ? null : b.id)}
							class="rounded-md border border-line px-2 py-1 text-[11px] text-neon-text hover:border-neon"
						>
							{$t('team.addSub')}
						</button>
					{/if}
					<button
						type="button"
						onclick={() => toggleBotActive(b)}
						class="rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:text-ink"
					>
						{b.active ? $t('team.deactivate') : $t('team.activate')}
					</button>
					<button
						type="button"
						onclick={() => removeBotQA(b.id, b.children)}
						class="rounded-md border border-line px-2 py-1 text-[11px] text-danger hover:bg-danger-soft"
					>
						{$t('common.delete')}
					</button>
				</div>
			</div>
		</div>
	{/snippet}

	<Card title={$t('team.menuAccessTitle')} description={$t('team.menuAccessDesc')}>
		<div class="space-y-3">
			<!-- Tab role -->
			<div class="grid grid-cols-2 gap-0.5 rounded-lg border border-line bg-surface p-0.5" role="group" aria-label={$t('team.menuAccessTitle')}>
				{#each menuRoles as r (r)}
					<button
						type="button"
						onclick={() => (menuRole = r)}
						class={cn(
							'rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize',
							menuRole === r ? 'bg-neon-soft text-neon-text' : 'text-muted hover:text-ink'
						)}
					>
						{r === 'agent' ? 'Agent' : 'SPV'}
						<span class="ml-1 font-normal text-faint">({(roleMenus[r] ?? []).length})</span>
					</button>
				{/each}
			</div>
			<div class="grid grid-cols-2 gap-2">
				{#each navItems as item (item.key)}
					<label class={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:border-line-strong', (roleMenus[menuRole] ?? []).includes(item.key) ? 'border-neon/50 bg-neon-soft/40' : 'border-line')}>
						<input
							type="checkbox"
							checked={(roleMenus[menuRole] ?? []).includes(item.key)}
							onchange={() => toggleRoleMenu(item.key)}
							class="size-4 accent-[var(--neon)]"
						/>
						<span class="font-medium">{$t(item.label)}</span>
					</label>
				{/each}
			</div>
			<div class="flex items-center justify-end gap-2">
				{#if saved && !roleMenusSaving}
					<span class="text-[11px] text-neon-text">{$t('common.saveAccessDone')}</span>
				{/if}
				<Button size="sm" onclick={saveRoleMenus} disabled={roleMenusSaving}>
					{roleMenusSaving ? $t('common.saving') : $t('team.saveAccess')}
				</Button>
			</div>
			<!-- Atasan langsung tetap per agent -->
			<div>
				<p class="mb-1.5 text-[11px] font-medium text-muted">{$t('team.supervisorLabel')}</p>
				<Select
					value={selectedUserId}
					placeholder={$t('team.selectAgent')}
					aria-label={$t('team.selectAgent')}
					options={teamUsers.map((u) => ({ value: u.id, label: `${u.full_name} (${u.email})` }))}
					onchange={(v) => loadGrants(v)}
				/>
			</div>
			{#if menusLoading}
				<p class="text-xs text-muted">{$t('common.loading')}</p>
			{:else if selectedUserId}
				<div>
					<Select
						value={supervisorId}
						placeholder={$t('team.noSupervisor')}
						aria-label={$t('team.supervisorLabel')}
						options={[
							{ value: '__none', label: $t('team.noSupervisor') },
							...teamUsers
								.filter((u) => u.id !== selectedUserId)
								.map((u) => ({ value: u.id, label: `${u.full_name} (${u.email})` }))
						]}
						onchange={(v) => (supervisorId = v === '__none' ? '' : v)}
					/>
					<div class="mt-2 flex justify-end">
						<Button size="sm" variant="outline" onclick={saveSupervisor} disabled={supervisorSaving}>
							{supervisorSaving ? $t('common.saving') : $t('common.save')}
						</Button>
					</div>
				</div>
			{:else}
				<p class="text-xs text-muted">{$t('team.selectUserHint')}</p>
			{/if}
		</div>
	</Card>
</div>
