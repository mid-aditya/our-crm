<script lang="ts">
	import { t, locale as i18nLocale } from 'svelte-i18n';
	import { Dialog, DropdownMenu, Switch } from 'bits-ui';
	import type { DateValue } from '@internationalized/date';
	import { Copy, Eye, Megaphone, MoreHorizontal, Plus, Trash2, X } from '@lucide/svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { mockCampaigns, type Campaign, type CampaignStatus } from '$lib/mock';
	import { bcp } from '$lib/i18n';
	import { cn } from '$lib/utils';

	let campaigns = $state<Campaign[]>([...mockCampaigns]);
	let dialogOpen = $state(false);

	let form = $state({
		name: '',
		channel: 'official',
		audience: 'all',
		template: '',
		now: true,
		date: undefined as DateValue | undefined,
		time: '09:00'
	});
	let errors = $state<{ name?: string; template?: string; date?: string }>({});

	const menuItem =
		'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted outline-none data-[highlighted]:bg-raised data-[highlighted]:text-ink';

	const channelOptions = $derived([
		{ value: 'official', label: $t('dashboard.channel.official') },
		{ value: 'gateway', label: $t('dashboard.channel.gateway') }
	]);

	const audienceOptions = $derived([
		{ value: 'all', label: $t('campaigns.audience.all') },
		{ value: 'customers', label: $t('campaigns.audience.customers') },
		{ value: 'prospects', label: $t('campaigns.audience.prospects') }
	]);

	const statusVariant: Record<CampaignStatus, 'success' | 'neon' | 'neutral' | 'warn'> = {
		sent: 'success',
		scheduled: 'neon',
		draft: 'neutral',
		running: 'warn'
	};

	const dateFmt = $derived(
		new Intl.DateTimeFormat(bcp($i18nLocale), { day: 'numeric', month: 'short', year: 'numeric' })
	);

	function submit(e: SubmitEvent) {
		e.preventDefault();
		errors = {};
		if (!form.name.trim()) errors.name = $t('campaigns.form.errName');
		if (!form.template.trim()) errors.template = $t('campaigns.form.errTemplate');
		if (!form.now && !form.date) errors.date = $t('campaigns.form.errDate');
		if (errors.name || errors.template || errors.date) return;

		let schedule: string | null = null;
		if (!form.now && form.date) {
			schedule = dateFmt.format(form.date.toDate(new Date())) + (form.time ? `, ${form.time}` : '');
		}

		campaigns.unshift({
			id: crypto.randomUUID(),
			name: form.name.trim(),
			status: form.now ? 'running' : 'scheduled',
			audience: form.audience as Campaign['audience'],
			channel: form.channel as Campaign['channel'],
			schedule,
			progress: 0
		});
		dialogOpen = false;
		form = { name: '', channel: 'official', audience: 'all', template: '', now: true, date: undefined, time: '09:00' };
	}

	function duplicate(c: Campaign) {
		campaigns.unshift({ ...c, id: crypto.randomUUID(), name: `${c.name} (2)`, status: 'draft', progress: 0, schedule: null });
	}

	function remove(id: string) {
		campaigns = campaigns.filter((c) => c.id !== id);
	}
</script>

<p class="mb-4 text-sm text-muted">{$t('campaigns.subtitle')}</p>

<div class="mb-4 flex justify-end">
	<Button onclick={() => (dialogOpen = true)}>
		<Plus size={16} />
		{$t('campaigns.new')}
	</Button>
</div>

<ul class="space-y-3">
	{#each campaigns as campaign (campaign.id)}
		<li class="rounded-xl border border-line bg-surface p-4">
			<div class="flex flex-wrap items-center gap-3">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h3 class="truncate font-display text-sm font-semibold">{campaign.name}</h3>
						<Badge variant={statusVariant[campaign.status]} dot>
							{$t(`campaigns.status.${campaign.status}`)}
						</Badge>
					</div>
					<p class="mt-1 text-xs text-muted">
						{$t(`campaigns.audience.${campaign.audience}`)}
						·
						{$t(`dashboard.channel.${campaign.channel}`)}
						{#if campaign.schedule}
							· {campaign.schedule}
						{/if}
					</p>
				</div>
				<div class="w-full max-w-48">
					<div class="mb-1 flex justify-between text-[11px] text-faint">
						<span>{$t('campaigns.table.progress')}</span>
						<span class="font-mono">{campaign.progress}%</span>
					</div>
					<div class="h-1.5 overflow-hidden rounded-full bg-raised">
						<div
							class="h-full rounded-full bg-neon transition-[width]"
							style="width: {campaign.progress}%"
						></div>
					</div>
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="inline-flex size-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus:outline-none"
						aria-label={$t('contacts.table.actions')}
					>
						<MoreHorizontal size={16} />
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							sideOffset={4}
							align="end"
							class="z-50 min-w-40 rounded-lg border border-line bg-surface p-1 shadow-lg shadow-black/10 outline-none dark:shadow-black/50"
						>
							<DropdownMenu.Item class={menuItem}>
								<Eye size={15} />
								{$t('campaigns.menu.preview')}
							</DropdownMenu.Item>
							<DropdownMenu.Item class={menuItem} onSelect={() => duplicate(campaign)}>
								<Copy size={15} />
								{$t('campaigns.menu.duplicate')}
							</DropdownMenu.Item>
							<DropdownMenu.Separator class="my-1 h-px bg-line" />
							<DropdownMenu.Item
								class={cn(
									menuItem,
									'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger'
								)}
								onSelect={() => remove(campaign.id)}
							>
								<Trash2 size={15} />
								{$t('campaigns.menu.delete')}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>
		</li>
	{/each}
</ul>

	<Dialog.Root open={dialogOpen} onOpenChange={(v) => (dialogOpen = v ?? false)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl outline-none"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<Dialog.Title class="font-display text-base font-semibold">
						{$t('campaigns.form.title')}
					</Dialog.Title>
					<Dialog.Description class="mt-1 text-xs text-muted">
						{$t('campaigns.form.description')}
					</Dialog.Description>
				</div>
				<Dialog.Close
					class="flex size-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-ink"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>
			<form class="space-y-3" onsubmit={submit}>
				<Field label={$t('campaigns.form.name')}>
					<Input bind:value={form.name} placeholder={$t('campaigns.form.namePh')} error={errors.name} />
				</Field>
				<div class="grid gap-3 sm:grid-cols-2">
					<Field label={$t('campaigns.form.channel')}>
						<Select options={channelOptions} bind:value={form.channel} />
					</Field>
					<Field label={$t('campaigns.form.audience')}>
						<Select options={audienceOptions} bind:value={form.audience} />
					</Field>
				</div>
				<Field label={$t('campaigns.form.template')}>
					{#snippet hint()}
						{$t('campaigns.form.templateHint')}
						<code class="rounded bg-raised px-1 font-mono text-[11px] text-neon-text">
							{'{{nama}}'}
						</code>
					{/snippet}
					<Textarea
						bind:value={form.template}
						rows={4}
						placeholder="Halo {'{{nama}}'}, ada promo spesial untuk kamu…"
						error={errors.template}
					/>
				</Field>
				<div
					class="flex items-center justify-between rounded-lg border border-line px-3 py-2.5"
				>
					<label for="send-now" class="text-sm font-medium">
						{form.now ? $t('campaigns.form.now') : $t('campaigns.form.schedule')}
					</label>
					<Switch.Root
						id="send-now"
						checked={form.now}
						onCheckedChange={(v) => (form.now = v ?? false)}
						class="relative h-5 w-9 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon data-[checked]:bg-neon data-[unchecked]:bg-line-strong"
					>
						<Switch.Thumb
							class="block size-4 translate-x-0.5 rounded-full bg-surface shadow transition-transform data-[checked]:translate-x-[18px]"
						/>
					</Switch.Root>
				</div>
				{#if !form.now}
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<Field label={$t('campaigns.form.date')}>
								<DatePicker bind:value={form.date} placeholder={$t('common.noDate')} />
							</Field>
							{#if errors.date}
								<p class="mt-1.5 text-xs text-danger">{errors.date}</p>
							{/if}
						</div>
						<Field label={$t('campaigns.form.time')}>
							<Input type="time" bind:value={form.time} class="font-mono" />
						</Field>
					</div>
				{/if}
				<div class="flex justify-end gap-2 pt-2">
					<Button variant="ghost" onclick={() => (dialogOpen = false)}>
						{$t('common.cancel')}
					</Button>
					<Button type="submit">{$t('campaigns.form.submit')}</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
