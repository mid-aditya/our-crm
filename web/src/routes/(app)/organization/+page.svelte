<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Plus, Trash2 } from '@lucide/svelte';
	import {
		getEmployees,
		getDepartments,
		createDepartment,
		deleteDepartment,
		type Employee,
		type Department
	} from '$lib/team/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { cn } from '$lib/utils';

	let employees = $state<Employee[]>([]);
	let departments = $state<Department[]>([]);
	let newDept = $state('');

	type Node = Employee & { children: Node[] };

	// Pohon hierarki dari supervisor_id.
	const tree = $derived.by(() => {
		const byId = new Map<string, Node>();
		for (const e of employees) byId.set(e.id, { ...e, children: [] });
		const roots: Node[] = [];
		for (const n of byId.values()) {
			const parent = n.supervisor_id ? byId.get(n.supervisor_id) : undefined;
			if (parent && parent.id !== n.id) parent.children.push(n);
			else roots.push(n);
		}
		return roots;
	});

	onMount(async () => {
		await reload();
	});

	async function reload() {
		try {
			[employees, departments] = await Promise.all([getEmployees(), getDepartments()]);
		} catch {
			employees = [];
			departments = [];
		}
	}

	async function addDept() {
		if (!newDept.trim()) return;
		try {
			await createDepartment(newDept.trim());
			newDept = '';
			await reload();
		} catch { /* abaikan */ }
	}

	async function removeDept(id: string) {
		const ok = await askConfirm({ title: $t('organization.confirmDeleteDept'), danger: true });
		if (!ok) return;
		try {
			await deleteDepartment(id);
			await reload();
		} catch { /* abaikan */ }
	}
</script>

{#snippet node(n: Node, depth: number)}
	<div class={cn(depth > 0 && 'ml-5 border-l-2 border-neon/25 pl-2')}>
		<div class="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5">
			<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted">
				{(n.full_name.slice(0, 2) || '?').toUpperCase()}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-xs font-medium">{n.full_name}</span>
				<span class="block truncate text-[10px] text-faint">
					{[n.position, n.role].filter(Boolean).join(' • ') || '—'}
				</span>
			</span>
			{#if n.department_name}
				<Badge variant="neutral">{n.department_name}</Badge>
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

<div class="grid items-start gap-3 lg:grid-cols-[1fr_320px]">
	<Card title={$t('organization.chart')}>
		<div class="space-y-1.5">
			{#each tree as n (n.id)}
				{@render node(n, 0)}
			{:else}
				<p class="py-6 text-center text-xs text-muted">{$t('common.empty')}</p>
			{/each}
		</div>
	</Card>
	<Card title={$t('organization.departments')}>
		<div class="space-y-2">
			<div class="flex gap-1.5">
				<Input bind:value={newDept} placeholder={$t('organization.deptPh')} aria-label={$t('organization.deptPh')} />
				<Button size="sm" onclick={addDept} disabled={!newDept.trim()}><Plus size={13} /></Button>
			</div>
			<div class="space-y-1.5">
				{#each departments as d (d.id)}
					<div class="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs">
						<span class="min-w-0 flex-1">
							<span class="block truncate font-medium">{d.name}</span>
							<span class="block truncate text-[10px] text-faint">
								{d.head_name ? `${$t('organization.head')}: ${d.head_name}` : ''} • {d.members} {$t('organization.members')}
							</span>
						</span>
						<button type="button" onclick={() => removeDept(d.id)} class="rounded p-1.5 text-faint hover:text-danger" aria-label={$t('common.delete')}>
							<Trash2 size={14} />
						</button>
					</div>
				{:else}
					<p class="py-4 text-center text-[11px] text-muted">{$t('common.empty')}</p>
				{/each}
			</div>
		</div>
	</Card>
</div>
