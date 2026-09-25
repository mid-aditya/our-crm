<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { getUser } from '$lib/api';
	import {
		getMyAttendance,
		getTeamAttendance,
		getMyLeaves,
		getAllLeaves,
		getLeaveTypes,
		addLeaveType,
		requestLeave,
		approveLeave,
		checkIn,
		checkOut,
		type AttendanceRow,
		type LeaveRequest,
		type LeaveType
	} from '$lib/team/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { cn } from '$lib/utils';

	const role = $derived((getUser()?.role ?? '').toLowerCase());
	const canSupervise = $derived(role === 'developer' || role === 'admin' || role === 'spv' || role === 'owner');

	let tab = $state<'attendance' | 'leave'>('attendance');
	let mine = $state<AttendanceRow[]>([]);
	let team = $state<AttendanceRow[]>([]);
	let teamDate = $state(new Date().toISOString().slice(0, 10));
	let myLeaves = $state<LeaveRequest[]>([]);
	let allLeaves = $state<LeaveRequest[]>([]);
	let leaveTypes = $state<LeaveType[]>([]);
	let leaveForm = $state({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
	let newTypeName = $state('');
	let busy = $state(false);

	const today = $derived(new Date().toISOString().slice(0, 10));
	const todayRow = $derived(mine.find((r) => r.date === today));

	onMount(async () => {
		await Promise.all([loadMine(), loadTypes(), loadMyLeaves()]);
		if (canSupervise) await Promise.all([loadTeam(), loadAllLeaves()]);
	});

	async function loadMine() {
		try {
			mine = await getMyAttendance();
		} catch { mine = []; }
	}
	async function loadTeam() {
		try {
			team = await getTeamAttendance(teamDate || undefined);
		} catch { team = []; }
	}
	async function loadTypes() {
		try {
			leaveTypes = await getLeaveTypes();
		} catch { leaveTypes = []; }
	}
	async function loadMyLeaves() {
		try {
			myLeaves = await getMyLeaves();
		} catch { myLeaves = []; }
	}
	async function loadAllLeaves() {
		try {
			allLeaves = await getAllLeaves();
		} catch { allLeaves = []; }
	}

	async function doCheckIn() {
		busy = true;
		try {
			await checkIn();
			await loadMine();
		} finally { busy = false; }
	}
	async function doCheckOut() {
		busy = true;
		try {
			await checkOut();
			await loadMine();
		} finally { busy = false; }
	}
	async function submitLeave() {
		if (!leaveForm.leave_type_id || !leaveForm.start_date || !leaveForm.end_date) return;
		busy = true;
		try {
			await requestLeave(leaveForm);
			leaveForm = { leave_type_id: '', start_date: '', end_date: '', reason: '' };
			await loadMyLeaves();
		} finally { busy = false; }
	}
	async function decide(id: string, status: 'approved' | 'rejected') {
		try {
			await approveLeave(id, status);
			await loadAllLeaves();
		} catch { /* abaikan */ }
	}
	async function addType() {
		if (!newTypeName.trim()) return;
		try {
			await addLeaveType(newTypeName.trim());
			newTypeName = '';
			await loadTypes();
		} catch { /* abaikan */ }
	}

	function fmtTime(iso: string | null) {
		if (!iso) return '—';
		return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="font-display text-xl font-semibold">{$t('attendance.title')}</h1>
		<p class="mt-0.5 text-xs text-muted">{$t('attendance.subtitle')}</p>
	</div>
	<div class="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
		<button
			type="button"
			onclick={() => (tab = 'attendance')}
			class={cn('rounded-md px-3 py-1.5 text-xs font-medium', tab === 'attendance' ? 'bg-neon-soft text-neon-text' : 'text-muted')}
		>
			{$t('attendance.tabAttendance')}
		</button>
		<button
			type="button"
			onclick={() => (tab = 'leave')}
			class={cn('rounded-md px-3 py-1.5 text-xs font-medium', tab === 'leave' ? 'bg-neon-soft text-neon-text' : 'text-muted')}
		>
			{$t('attendance.tabLeave')}
		</button>
	</div>
</div>

{#if tab === 'attendance'}
	<div class="grid gap-3 lg:grid-cols-2">
		<Card title={$t('attendance.today')}>
			<div class="flex items-center gap-2">
				<Button size="sm" onclick={doCheckIn} disabled={busy || !!todayRow?.check_in}>{$t('attendance.checkIn')} {todayRow?.check_in ? fmtTime(todayRow.check_in) : ''}</Button>
				<Button size="sm" variant="outline" onclick={doCheckOut} disabled={busy || !todayRow?.check_in || !!todayRow?.check_out}>{$t('attendance.checkOut')} {todayRow?.check_out ? fmtTime(todayRow.check_out) : ''}</Button>
			</div>
			<div class="mt-4 space-y-1">
				{#each mine.slice(0, 10) as r (r.date)}
					<div class="flex items-center justify-between rounded-md bg-raised px-3 py-1.5 text-xs">
						<span class="font-medium">{r.date}</span>
						<span class="text-muted">{fmtTime(r.check_in)} → {fmtTime(r.check_out)}</span>
						<Badge variant="neutral">{r.status}</Badge>
					</div>
				{:else}
					<p class="py-4 text-center text-xs text-muted">{$t('attendance.noAttendance')}</p>
				{/each}
			</div>
		</Card>
		{#if canSupervise}
			<Card title={$t('attendance.team')}>
				{#snippet actions()}
					<Input type="date" bind:value={teamDate} class="w-40" />
					<Button size="sm" variant="outline" onclick={loadTeam}>{$t('attendance.view')}</Button>
				{/snippet}
				<div class="space-y-1">
					{#each team as r (r.user_id + r.date)}
						<div class="flex items-center justify-between rounded-md bg-raised px-3 py-1.5 text-xs">
							<span class="font-medium">{r.full_name}</span>
							<span class="text-muted">{r.date} • {fmtTime(r.check_in)} → {fmtTime(r.check_out)}</span>
							<Badge variant="neutral">{r.status}</Badge>
						</div>
					{:else}
						<p class="py-4 text-center text-xs text-muted">{$t('attendance.noData')}</p>
					{/each}
				</div>
			</Card>
		{/if}
	</div>
{:else}
	<div class="grid gap-3 lg:grid-cols-2">
		<Card title={$t('attendance.requestTitle')}>
			<div class="space-y-2">
				<Select
					bind:value={leaveForm.leave_type_id}
					placeholder={$t('attendance.leaveTypePh')}
					aria-label={$t('attendance.requestTitle')}
					options={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
				/>
				<div class="grid grid-cols-2 gap-2">
					<Input type="date" bind:value={leaveForm.start_date} aria-label={$t('attendance.view')} />
					<Input type="date" bind:value={leaveForm.end_date} aria-label={$t('attendance.view')} />
				</div>
				<textarea
					bind:value={leaveForm.reason}
					placeholder={$t('attendance.reasonPh')}
					rows="3"
					class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
				></textarea>
				<Button size="sm" onclick={submitLeave} disabled={busy}>{$t('attendance.submit')}</Button>
			</div>
			<div class="mt-4 space-y-1">
				<p class="text-[11px] font-medium text-muted">{$t('attendance.myRequests')}</p>
				{#each myLeaves as l (l.id)}
					<div class="flex items-center justify-between rounded-md bg-raised px-3 py-1.5 text-xs">
						<span>{l.leave_type ?? ''} • {l.start_date} → {l.end_date}</span>
						<Badge variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warn'}>{l.status}</Badge>
					</div>
				{:else}
					<p class="text-[11px] text-faint">{$t('attendance.noRequests')}</p>
				{/each}
			</div>
		</Card>
		{#if canSupervise}
			<Card title={$t('attendance.approval')}>
				<div class="space-y-1">
					{#each allLeaves.filter((l) => l.status === 'pending') as l (l.id)}
						<div class="rounded-md bg-raised px-3 py-2 text-xs">
							<p class="font-medium">{l.full_name} — {l.leave_type ?? ''}</p>
							<p class="text-muted">{l.start_date} → {l.end_date}{l.reason ? ` • ${l.reason}` : ''}</p>
							<div class="mt-1.5 flex gap-1.5">
								<Button size="sm" onclick={() => decide(l.id, 'approved')}>{$t('attendance.approve')}</Button>
								<Button size="sm" variant="outline" onclick={() => decide(l.id, 'rejected')}>{$t('attendance.reject')}</Button>
							</div>
						</div>
					{:else}
						<p class="py-4 text-center text-xs text-muted">{$t('attendance.noPending')}</p>
					{/each}
				</div>
				{#if role === 'developer' || role === 'admin' || role === 'owner'}
					<div class="mt-3 border-t border-line pt-3">
						<p class="mb-1.5 text-[11px] font-medium text-muted">{$t('attendance.customLabel')}</p>
						<div class="flex gap-1.5">
							<Input bind:value={newTypeName} placeholder={$t('attendance.customLabelPh')} />
							<Button size="sm" variant="outline" onclick={addType}>{$t('attendance.addType')}</Button>
						</div>
						<div class="mt-1.5 flex flex-wrap gap-1">
							{#each leaveTypes as t (t.id)}
								<Badge variant="neutral">{t.name}</Badge>
							{/each}
						</div>
					</div>
				{/if}
			</Card>
		{/if}
	</div>
{/if}
