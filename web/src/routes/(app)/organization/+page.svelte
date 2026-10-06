<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Plus, Trash2 } from '@lucide/svelte';
	import {
		getOrgUnits,
		createOrgUnit,
		deleteOrgUnit,
		getTeamMembers,
		type OrgUnit,
		type RosterMember
	} from '$lib/team/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { cn } from '$lib/utils';

	let units = $state<OrgUnit[]>([]);
	let members = $state<RosterMember[]>([]);
	let newName = $state('');
	let newType = $state('branch');
	let newParent = $state('');

	type Node = OrgUnit & { children: Node[]; staff: RosterMember[] };

	// Pohon: regional → cabang → kios; anggota menempel di unitnya.
	const tree = $derived.by(() => {
		const byId = new Map<string, Node>();
		for (const u of units) byId.set(u.id, { ...u, children: [], staff: [] });
		const roots: Node[] = [];
		for (const n of byId.values()) {
			const parent = n.parent_id ? byId.get(n.parent_id) : undefined;
			if (parent && parent.id !== n.id) parent.children.push(n);
			else roots.push(n);
		}
		for (const m of members) {
			if (m.org_unit_id && byId.has(m.org_unit_id)) byId.get(m.org_unit_id)!.staff.push(m);
		}
		const order = { regional: 0, branch: 1, kiosk: 2 } as Record<string, number>;
		const sort = (ns: Node[]) => {
			ns.sort((a, b) => (order[a.unit_type] ?? 9) - (order[b.unit_type] ?? 9) || a.name.localeCompare(b.name));
			ns.forEach((n) => sort(n.children));
		};
		sort(roots);
		return roots;
	});

	const unassigned = $derived(members.filter((m) => !m.org_unit_id));

	onMount(async () => {
		await reload();
	});

	async function reload() {
		try {
			[units, members] = await Promise.all([getOrgUnits(), getTeamMembers()]);
		} catch {
			units = [];
			members = [];
		}
	}

	async function addUnit() {
		if (!newName.trim()) return;
		try {
			await createOrgUnit({ name: newName.trim(), unit_type: newType, parent_id: newParent || undefined });
			newName = '';
			newParent = '';
			await reload();
		} catch { /* abaikan */ }
	}

	async function removeUnit(id: string) {
		const ok = await askConfirm({ title: $t('organization.confirmDeleteUnit'), danger: true });
		if (!ok) return;
		try {
			await deleteOrgUnit(id);
			await reload();
		} catch { /* abaikan */ }
	}
</script>

{#snippet node(n: Node, depth: number)}
	<div class={cn(depth > 0 && 'ml-5 border-l-2 border-neon/25 pl-2')}>
		<div class="rounded-lg border border-line bg-surface px-3 py-2">
			<div class="flex items-center gap-2">
				<span class="min-w-0 flex-1">
					<span class="block truncate text-xs font-medium">{n.name}</span>
					<span class="block text-[10px] text-faint">
						{$t(`organization.type.${n.unit_type}`)}{n.parent_name ? ` • ${n.parent_name}` : ''}{n.head_name ? ` • ${n.head_name}` : ''}
					</span>
				</span>
				<Badge variant="neutral">{n.members}</Badge>
				<button type="button" onclick={() => removeUnit(n.id)} class="rounded p-1.5 text-faint hover:text-danger" aria-label={$t('common.delete')}>
					<Trash2 size={13} />
				</button>
			</div>
			{#if n.staff.length > 0}
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each n.staff as s (s.id)}
						<span class="rounded bg-raised px-1.5 py-px text-[10px] text-muted" title={s.email}>
							{s.full_name}
						</span>
					{/each}
				</div>
			{/if}
		</div>
		{#if n.children.length > 0}
			<div class="mt-1.5 space-y-1.5">
				{#each n.children as c (c.id)}
					{@render node(c, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="mb-4">
	<h1 class="font-display text-xl font-semibold">{$t('organization.title')}</h1>
	<p class="mt-0.5 text-xs text-muted">{$t('organization.subtitle')}</p>
</div>

<Card>
	<div class="grid gap-1.5 sm:grid-cols-[1fr_140px_1fr_auto]">
		<Input bind:value={newName} placeholder={$t('organization.unitPh')} aria-label={$t('organization.unitPh')} />
		<Select
			value={newType}
			aria-label={$t('organization.unitType')}
			options={[
				{ value: 'regional', label: $t('organization.type.regional') },
				{ value: 'branch', label: $t('organization.type.branch') },
				{ value: 'kiosk', label: $t('organization.type.kiosk') }
			]}
			onchange={(v) => (newType = v)}
		/>
		<Select
			value={newParent}
			placeholder={$t('organization.parentPh')}
			aria-label={$t('organization.parentPh')}
			options={[
				{ value: '__none', label: '—' },
				...units.map((u) => ({ value: u.id, label: `${u.name} (${u.unit_type})` }))
			]}
			onchange={(v) => (newParent = v === '__none' ? '' : v)}
		/>
		<Button size="sm" onclick={addUnit} disabled={!newName.trim()}><Plus size={13} /> {$t('common.add')}</Button>
	</div>
</Card>

<div class="mt-3 grid items-start gap-3 lg:grid-cols-[1fr_280px]">
	<Card title={$t('organization.chart')}>
		<div class="space-y-1.5">
			{#each tree as n (n.id)}
				{@render node(n, 0)}
			{:else}
				<p class="py-6 text-center text-xs text-muted">{$t('organization.emptyHint')}</p>
			{/each}
		</div>
	</Card>
	<Card title={$t('organization.unassigned')}>
		<div class="flex flex-wrap gap-1">
			{#each unassigned as m (m.id)}
				<span class="rounded bg-raised px-1.5 py-1 text-[10px] text-muted" title={m.email}>{m.full_name}</span>
			{:else}
				<p class="py-2 text-[11px] text-muted">{$t('organization.allAssigned')}</p>
			{/each}
		</div>
		<p class="mt-2 text-[10px] text-faint">{$t('organization.assignHint')}</p>
	</Card>
</div>
