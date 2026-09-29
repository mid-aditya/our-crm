<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { type DateValue } from '@internationalized/date';
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
		getMyTimesheets,
		createTimesheet,
		getTeamTimesheets,
		decideTimesheet,
		type AttendanceRow,
		type LeaveRequest,
		type LeaveType,
		type Timesheet
	} from '$lib/team/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { askConfirm } from '$lib/components/ui/confirm-dialog.svelte';
	import { cn } from '$lib/utils';

	const role = $derived((getUser()?.role ?? '').toLowerCase());
	const canSupervise = $derived(role === 'developer' || role === 'admin' || role === 'spv' || role === 'owner');

	let tab = $state<'attendance' | 'leave' | 'timesheet'>('attendance');
	let mine = $state<AttendanceRow[]>([]);
	let team = $state<AttendanceRow[]>([]);
	let teamDate = $state(new Date().toISOString().slice(0, 10));
	let myLeaves = $state<LeaveRequest[]>([]);
	let allLeaves = $state<LeaveRequest[]>([]);
	let leaveTypes = $state<LeaveType[]>([]);
	let leaveForm = $state({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
	let newTypeName = $state('');
	let busy = $state(false);

	// ---- Timesheet & lembur ----
	const thisMonth = new Date().toISOString().slice(0, 7);
	let tsMonth = $state(thisMonth);
	let myTS = $state<Timesheet[]>([]);
	let teamTS = $state<Timesheet[]>([]);
	let tsForm = $state({ date: new Date().toISOString().slice(0, 10), project: '', hours: '', overtime: '', description: '' });

	const myHours = $derived(myTS.filter((x) => x.status === 'approved').reduce((a, x) => a + (x.hours ?? 0), 0));
	const myOvertime = $derived(myTS.filter((x) => x.status === 'approved').reduce((a, x) => a + (x.overtime_hours ?? 0), 0));

	async function loadTS() {
		try {
			myTS = await getMyTimesheets(tsMonth);
		} catch { myTS = []; }
		if (canSupervise) {
			try {
				teamTS = await getTeamTimesheets(tsMonth);
			} catch { teamTS = []; }
		}
	}

	async function submitTS() {
		if (!tsForm.date || !tsForm.project.trim()) return;
		busy = true;
		try {
			await createTimesheet({
				date: tsForm.date,
				project: tsForm.project.trim(),
				hours: Number(tsForm.hours) || 0,
				overtime_hours: Number(tsForm.overtime) || 0,
				description: tsForm.description.trim()
			});
			tsForm = { date: new Date().toISOString().slice(0, 10), project: '', hours: '', overtime: '', description: '' };
			await loadTS();
		} finally { busy = false; }
	}

	async function decideTS(id: string, approve: boolean) {
		try {
			await decideTimesheet(id, approve);
			await loadTS();
		} catch { /* abaikan */ }
	}

	// DatePicker (bits-ui, styled) <-> string ISO untuk API.
	let startDV = $state<DateValue | undefined>(undefined);
	let endDV = $state<DateValue | undefined>(undefined);
	let teamDV = $state<DateValue | undefined>(undefined);

	function dvToISO(v: DateValue | undefined): string {
		return v ? v.toString().slice(0, 10) : '';
	}

	$effect(() => {
		leaveForm.start_date = dvToISO(startDV);
	});
	$effect(() => {
		leaveForm.end_date = dvToISO(endDV);
	});
	$effect(() => {
		const iso = dvToISO(teamDV);
		if (iso && iso !== teamDate) {
			teamDate = iso;
			void loadTeam();
		}
	});

	const today = $derived(new Date().toISOString().slice(0, 10));
	const todayRow = $derived(mine.find((r) => r.date === today));

	onMount(async () => {
		await Promise.all([loadMine(), loadTypes(), loadMyLeaves(), loadTS()]);
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
			startDV = undefined;
			endDV = undefined;
			await loadMyLeaves();
		} finally { busy = false; }
	}
	async function decide(id: string, status: 'approved' | 'rejected') {
		try {
			await approveLeave(id, status);
			await loadAllLeaves();
		} catch { /* abaikan */ }
	}
	// Aksi cepat: ajukan Sakit/Izin untuk hari ini sekali klik.
	async function quickLeave(kind: 'sakit' | 'izin') {
		const found = leaveTypes.find((t) => t.name.toLowerCase().includes(kind));
		if (!found) return;
		const ok = await askConfirm({ title: $t('attendance.quickConfirm', { values: { kind: found.name } }) });
		if (!ok) return;
		busy = true;
		try {
			await requestLeave({ leave_type_id: found.id, start_date: today, end_date: today, reason: '' });
			await loadMyLeaves();
		} finally { busy = false; }
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
	<div class="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-1">
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
		<button
			type="button"
			onclick={() => (tab = 'timesheet')}
			class={cn('rounded-md px-3 py-1.5 text-xs font-medium', tab === 'timesheet' ? 'bg-neon-soft text-neon-text' : 'text-muted')}
		>
			{$t('attendance.tabTimesheet')}
		</button>
	</div>
</div>

{#if tab === 'attendance'}
	<div class="grid gap-3 lg:grid-cols-2">
		<Card title={$t('attendance.today')}>
			<div class="flex flex-wrap items-center gap-2">
				<Button size="sm" onclick={doCheckIn} disabled={busy || !!todayRow?.check_in}>{$t('attendance.checkIn')} {todayRow?.check_in ? fmtTime(todayRow.check_in) : ''}</Button>
				<Button size="sm" variant="outline" onclick={doCheckOut} disabled={busy || !todayRow?.check_in || !!todayRow?.check_out}>{$t('attendance.checkOut')} {todayRow?.check_out ? fmtTime(todayRow.check_out) : ''}</Button>
				<span class="mx-1 h-4 w-px bg-line"></span>
				<Button size="sm" variant="outline" onclick={() => quickLeave('sakit')} disabled={busy}>{$t('attendance.sickToday')}</Button>
				<Button size="sm" variant="outline" onclick={() => quickLeave('izin')} disabled={busy}>{$t('attendance.permitToday')}</Button>
			</div>
			<div class="mt-4 space-y-1">
				{#each mine.slice(0, 10) as r (r.date)}
					<div class="flex items-center justify-between rounded-md bg-raised px-3 py-1.5 text-xs">
						<span class="font-medium">{r.date}</span>
						<span class="text-muted">{fmtTime(r.check_in)} → {fmtTime(r.check_out)}</span>
						<Badge variant={r.status === 'present' ? 'success' : 'warn'}>{r.status}</Badge>
					</div>
				{:else}
					<p class="py-4 text-center text-xs text-muted">{$t('attendance.noAttendance')}</p>
				{/each}
			</div>
		</Card>
		{#if canSupervise}
			<Card title={$t('attendance.team')}>
				{#snippet actions()}
					<DatePicker bind:value={teamDV} placeholder={teamDate} class="w-44" />
					<Button size="sm" variant="outline" onclick={loadTeam}>{$t('attendance.view')}</Button>
				{/snippet}
				<div class="space-y-1">
					{#each team as r (r.user_id + r.date)}
						<div class="flex items-center justify-between rounded-md bg-raised px-3 py-1.5 text-xs">
							<span class="font-medium">{r.full_name}</span>
							<span class="text-muted">{r.date} • {fmtTime(r.check_in)} → {fmtTime(r.check_out)}</span>
							<Badge variant={r.status === 'present' ? 'success' : 'warn'}>{r.status}</Badge>
						</div>
					{:else}
						<p class="py-4 text-center text-xs text-muted">{$t('attendance.noData')}</p>
					{/each}
				</div>
			</Card>
		{/if}
	</div>
{:else if tab === 'leave'}
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
					<DatePicker bind:value={startDV} placeholder={$t('attendance.startDate')} />
					<DatePicker bind:value={endDV} placeholder={$t('attendance.endDate')} />
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
{:else}
	<!-- Timesheet per project + lembur -->
	<div class="grid gap-3 lg:grid-cols-2">
		<Card title={$t('attendance.tsTitle')}>
			<div class="space-y-2">
				<div class="rounded-lg bg-raised px-3 py-2 text-xs text-muted">
					{$t('attendance.tsSummary', { values: { hours: myHours, ot: myOvertime } })}
				</div>
				<div class="grid grid-cols-2 gap-2">
					<Input bind:value={tsForm.date} type="date" aria-label={$t('attendance.tsDate')} />
					<Input bind:value={tsForm.project} placeholder={$t('attendance.tsProject')} aria-label={$t('attendance.tsProject')} />
				</div>
				<div class="grid grid-cols-2 gap-2">
					<Input bind:value={tsForm.hours} type="number" placeholder={$t('attendance.tsHours')} aria-label={$t('attendance.tsHours')} />
					<Input bind:value={tsForm.overtime} type="number" placeholder={$t('attendance.tsOvertime')} aria-label={$t('attendance.tsOvertime')} />
				</div>
				<textarea
					bind:value={tsForm.description}
					placeholder={$t('attendance.tsDescPh')}
					rows="2"
					class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs placeholder:text-faint focus:border-neon focus:outline-none"
				></textarea>
				<Button size="sm" onclick={submitTS} disabled={busy || !tsForm.date || !tsForm.project.trim()}>{$t('attendance.tsSubmit')}</Button>
			</div>
			<div class="mt-4 space-y-1">
				<div class="flex items-center justify-between">
					<p class="text-[11px] font-medium text-muted">{$t('attendance.tsMine')}</p>
					<Input bind:value={tsMonth} type="month" aria-label={$t('attendance.tsMonth')} class="w-36" onchange={loadTS} />
				</div>
				{#each myTS as x (x.id)}
					<div class="flex items-center justify-between gap-2 rounded-md bg-raised px-3 py-1.5 text-xs">
						<span class="min-w-0">
							<span class="block truncate font-medium">{x.date} • {x.project}</span>
							<span class="block text-[10px] text-muted">{$t('attendance.tsHoursShort')}: {x.hours} • lembur: {x.overtime_hours}{x.description ? ` • ${x.description}` : ''}</span>
						</span>
						<Badge variant={x.status === 'approved' ? 'success' : x.status === 'rejected' ? 'danger' : 'warn'}>{x.status}</Badge>
					</div>
				{:else}
					<p class="text-[11px] text-faint">{$t('attendance.tsEmpty')}</p>
				{/each}
			</div>
		</Card>
		{#if canSupervise}
			<Card title={$t('attendance.tsApproval')}>
				<div class="space-y-1">
					{#each teamTS.filter((x) => x.status === 'pending') as x (x.id)}
						<div class="rounded-md bg-raised px-3 py-2 text-xs">
							<p class="font-medium">{x.user_name} — {x.date} • {x.project}</p>
							<p class="text-muted">{$t('attendance.tsHoursShort')}: {x.hours} • lembur: {x.overtime_hours}{x.description ? ` • ${x.description}` : ''}</p>
							<div class="mt-1.5 flex gap-1.5">
								<Button size="sm" onclick={() => decideTS(x.id, true)}>{$t('attendance.approve')}</Button>
								<Button size="sm" variant="outline" onclick={() => decideTS(x.id, false)}>{$t('attendance.reject')}</Button>
							</div>
						</div>
					{:else}
						<p class="py-4 text-center text-xs text-muted">{$t('attendance.noPending')}</p>
					{/each}
				</div>
			</Card>
		{/if}
	</div>
{/if}
