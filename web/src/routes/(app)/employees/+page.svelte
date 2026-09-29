<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Pencil } from '@lucide/svelte';
	import {
		getEmployees,
		updateEmployee,
		getDepartments,
		type Employee,
		type Department
	} from '$lib/team/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { cn } from '$lib/utils';

	let employees = $state<Employee[]>([]);
	let departments = $state<Department[]>([]);
	let editing = $state<Employee | null>(null);
	let form = $state({ nik: '', position: '', department_id: '', join_date: '', phone: '', supervisor_id: '' });

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

	function startEdit(e: Employee) {
		editing = e;
		form = {
			nik: e.nik ?? '',
			position: e.position ?? '',
			department_id: e.department_id ?? '',
			join_date: e.join_date ?? '',
			phone: e.phone ?? '',
			supervisor_id: e.supervisor_id ?? ''
		};
	}

	async function saveEdit() {
		if (!editing) return;
		try {
			await updateEmployee(editing.id, {
				nik: form.nik.trim(),
				position: form.position.trim(),
				department_id: form.department_id || null,
				join_date: form.join_date || null,
				phone: form.phone.trim(),
				supervisor_id: form.supervisor_id || null
			});
			editing = null;
			await reload();
		} catch { /* abaikan */ }
	}
</script>

<div class="mb-4">
	<h1 class="font-display text-xl font-semibold">{$t('employees.title')}</h1>
	<p class="mt-0.5 text-xs text-muted">{$t('employees.subtitle')}</p>
</div>

<Card>
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-line text-left text-[11px] font-medium text-muted">
					<th class="px-3 py-2 font-medium">{$t('employees.colName')}</th>
					<th class="px-3 py-2 font-medium">NIK</th>
					<th class="px-3 py-2 font-medium">{$t('employees.colPosition')}</th>
					<th class="px-3 py-2 font-medium">{$t('employees.colDept')}</th>
					<th class="px-3 py-2 font-medium">{$t('employees.colSupervisor')}</th>
					<th class="px-3 py-2 font-medium">{$t('employees.colJoin')}</th>
					<th class="px-3 py-2 text-right font-medium"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each employees as e (e.id)}
					<tr class="hover:bg-raised/50">
						<td class="px-3 py-2">
							<p class="text-xs font-medium">{e.full_name}</p>
							<p class="text-[10px] text-faint">{e.email} • {e.role || '—'}</p>
						</td>
						<td class="px-3 py-2 font-mono text-xs">{e.nik || '—'}</td>
						<td class="px-3 py-2 text-xs">{e.position || '—'}</td>
						<td class="px-3 py-2 text-xs">
							{#if e.department_name}
								<Badge variant="neutral">{e.department_name}</Badge>
							{:else}—{/if}
						</td>
						<td class="px-3 py-2 text-xs text-muted">{e.supervisor_name ?? '—'}</td>
						<td class="px-3 py-2 text-xs text-muted">{e.join_date ?? '—'}</td>
						<td class="px-3 py-2 text-right">
							<button
								type="button"
								onclick={() => startEdit(e)}
								class="rounded p-1.5 text-faint hover:text-ink"
								aria-label={$t('common.edit')}
							>
								<Pencil size={14} />
							</button>
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="px-3 py-8 text-center text-xs text-muted">{$t('common.empty')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>

{#if editing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) editing = null; }} role="presentation">
		<div class="w-full max-w-md rounded-2xl border border-line bg-surface shadow-xl">
			<div class="border-b border-line p-4">
				<h2 class="font-semibold">{editing.full_name}</h2>
				<p class="text-xs text-muted">{editing.email}</p>
			</div>
			<div class="space-y-2 p-4">
				<div class="grid grid-cols-2 gap-2">
					<Input bind:value={form.nik} placeholder="NIK" aria-label="NIK" />
					<Input bind:value={form.phone} placeholder={$t('conversation.phonePh')} aria-label={$t('conversation.phonePh')} />
				</div>
				<Input bind:value={form.position} placeholder={$t('employees.positionPh')} aria-label={$t('employees.positionPh')} />
				<div class="grid grid-cols-2 gap-2">
					<Select
						value={form.department_id}
						placeholder={$t('employees.deptPh')}
						aria-label={$t('employees.deptPh')}
						options={[
							{ value: '__none', label: '—' },
							...departments.map((d) => ({ value: d.id, label: d.name }))
						]}
						onchange={(v) => (form.department_id = v === '__none' ? '' : v)}
					/>
					<Input bind:value={form.join_date} type="date" aria-label={$t('employees.joinPh')} />
				</div>
				<Select
					value={form.supervisor_id}
					placeholder={$t('team.supervisorLabel')}
					aria-label={$t('team.supervisorLabel')}
					options={[
						{ value: '__none', label: $t('team.noSupervisor') },
						...employees.filter((x) => x.id !== editing?.id).map((x) => ({ value: x.id, label: `${x.full_name} (${x.role || '—'})` }))
					]}
					onchange={(v) => (form.supervisor_id = v === '__none' ? '' : v)}
				/>
				<div class="flex justify-end gap-2 pt-1">
					<Button size="sm" variant="ghost" onclick={() => (editing = null)}>{$t('common.cancel')}</Button>
					<Button size="sm" onclick={saveEdit}>{$t('common.save')}</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
