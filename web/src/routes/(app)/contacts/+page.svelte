<script lang="ts">
	import { t, locale as i18nLocale } from 'svelte-i18n';
	import { Dialog, DropdownMenu } from 'bits-ui';
	import {
		Eye,
		MessageCircle,
		MoreHorizontal,
		Plus,
		Search,
		Trash2,
		X
	} from '@lucide/svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { mockContacts, type Contact, type ContactGroup } from '$lib/mock';
	import { bcp } from '$lib/i18n';
	import { cn, initials } from '$lib/utils';

	let contacts = $state<Contact[]>([...mockContacts]);
	let search = $state('');
	let groupFilter = $state('all');
	let dialogOpen = $state(false);

	let form = $state({ name: '', phone: '', email: '', group: 'customer' });
	let errors = $state<{ name?: string; phone?: string }>({});

	const menuItem =
		'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted outline-none data-[highlighted]:bg-raised data-[highlighted]:text-ink';

	const groupOptions = $derived([
		{ value: 'all', label: $t('contacts.group.all') },
		{ value: 'customer', label: $t('contacts.group.customer') },
		{ value: 'prospect', label: $t('contacts.group.prospect') },
		{ value: 'vip', label: $t('contacts.group.vip') }
	]);

	const formGroupOptions = $derived(groupOptions.filter((o) => o.value !== 'all'));

	const filtered = $derived(
		contacts.filter((c) => {
			const okGroup = groupFilter === 'all' || c.group === groupFilter;
			const q = search.trim().toLowerCase();
			const okSearch =
				!q ||
				c.name.toLowerCase().includes(q) ||
				c.phone.toLowerCase().includes(q) ||
				c.email.toLowerCase().includes(q);
			return okGroup && okSearch;
		})
	);

	const dateFmt = $derived(
		new Intl.DateTimeFormat(bcp($i18nLocale), { day: 'numeric', month: 'short', year: 'numeric' })
	);

	const groupBadge: Record<ContactGroup, 'success' | 'neon' | 'warn'> = {
		customer: 'success',
		prospect: 'neon',
		vip: 'warn'
	};

	function submit(e: SubmitEvent) {
		e.preventDefault();
		errors = {};
		if (!form.name.trim()) errors.name = $t('contacts.form.errName');
		if (!form.phone.trim()) errors.phone = $t('contacts.form.errPhone');
		if (errors.name || errors.phone) return;

		contacts.unshift({
			id: crypto.randomUUID(),
			name: form.name.trim(),
			phone: form.phone.trim(),
			email: form.email.trim(),
			group: form.group as ContactGroup,
			lastChat: null
		});
		dialogOpen = false;
		form = { name: '', phone: '', email: '', group: 'customer' };
	}

	function remove(id: string) {
		contacts = contacts.filter((c) => c.id !== id);
	}
</script>

<p class="mb-4 text-sm text-muted">{$t('contacts.subtitle')}</p>

<div class="mb-4 flex flex-wrap items-center gap-2">
	<div class="relative min-w-56 flex-1">
		<Search
			size={15}
			class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
		/>
		<Input
			type="search"
			placeholder={$t('contacts.search')}
			bind:value={search}
			aria-label={$t('contacts.search')}
			class="pl-9"
		/>
	</div>
	<Select
		options={groupOptions}
		bind:value={groupFilter}
		ariaLabel={$t('contacts.table.group')}
		class="w-44"
	/>
	<Button onclick={() => (dialogOpen = true)}>
		<Plus size={16} />
		{$t('contacts.add')}
	</Button>
</div>

<div class="overflow-hidden rounded-xl border border-line bg-surface">
	<div class="overflow-x-auto">
		<table class="w-full min-w-160 text-sm">
			<thead>
				<tr class="border-b border-line text-left text-xs font-medium text-faint">
					<th class="px-4 py-3 font-medium">{$t('contacts.table.contact')}</th>
					<th class="px-4 py-3 font-medium">{$t('contacts.table.phone')}</th>
					<th class="px-4 py-3 font-medium">{$t('contacts.table.group')}</th>
					<th class="px-4 py-3 font-medium">{$t('contacts.table.lastChat')}</th>
					<th class="px-4 py-3 text-right font-medium">{$t('contacts.table.actions')}</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each filtered as contact (contact.id)}
					<tr class="transition-colors hover:bg-raised/60">
						<td class="px-4 py-3">
							<div class="flex items-center gap-3">
								<span
									class="flex size-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-muted"
								>
									{initials(contact.name)}
								</span>
								<div class="min-w-0">
									<p class="truncate font-medium">{contact.name}</p>
									<p class="truncate text-xs text-faint">{contact.email}</p>
								</div>
							</div>
						</td>
						<td class="px-4 py-3 font-mono text-[13px] text-muted">{contact.phone}</td>
						<td class="px-4 py-3">
							<Badge variant={groupBadge[contact.group]}>
								{$t(`contacts.group.${contact.group}`)}
							</Badge>
						</td>
						<td class="px-4 py-3 text-muted">
							{contact.lastChat ? dateFmt.format(new Date(contact.lastChat)) : '—'}
						</td>
						<td class="px-4 py-3 text-right">
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
											{$t('contacts.menu.detail')}
										</DropdownMenu.Item>
										<DropdownMenu.Item class={menuItem}>
											<MessageCircle size={15} />
											{$t('contacts.menu.message')}
										</DropdownMenu.Item>
										<DropdownMenu.Separator class="my-1 h-px bg-line" />
										<DropdownMenu.Item
											class={cn(
												menuItem,
												'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger'
											)}
											onSelect={() => remove(contact.id)}
										>
											<Trash2 size={15} />
											{$t('contacts.menu.delete')}
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-12 text-center text-sm text-muted">
							{$t('contacts.empty')}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="border-t border-line px-4 py-3">
		<p class="text-xs text-faint">{$t('contacts.showing', { values: { count: filtered.length } })}</p>
	</div>
</div>

	<Dialog.Root open={dialogOpen} onOpenChange={(v) => (dialogOpen = v ?? false)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl outline-none"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<Dialog.Title class="font-display text-base font-semibold">
						{$t('contacts.form.title')}
					</Dialog.Title>
					<Dialog.Description class="mt-1 text-xs text-muted">
						{$t('contacts.form.description')}
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
				<Field label={$t('contacts.form.name')}>
					<Input bind:value={form.name} placeholder={$t('contacts.form.namePh')} error={errors.name} />
				</Field>
				<Field label={$t('contacts.form.phone')}>
					<Input
						bind:value={form.phone}
						mono
						inputmode="tel"
						placeholder={$t('contacts.form.phonePh')}
						error={errors.phone}
					/>
				</Field>
				<Field label={$t('contacts.form.email')}>
					<Input type="email" bind:value={form.email} placeholder={$t('contacts.form.emailPh')} />
				</Field>
				<Field label={$t('contacts.form.group')}>
					<Select options={formGroupOptions} bind:value={form.group} />
				</Field>
				<div class="flex justify-end gap-2 pt-2">
					<Button variant="ghost" onclick={() => (dialogOpen = false)}>
						{$t('common.cancel')}
					</Button>
					<Button type="submit">{$t('contacts.form.save')}</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
