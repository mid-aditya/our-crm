<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { Plus, Building2, Users, Search, Trash2, ExternalLink, RefreshCw } from '@lucide/svelte';
	import { getCompanies, createCompany, deleteCompany, type AdminCompany } from '$lib/api-channels';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let companies = $state<AdminCompany[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let showCreate = $state(false);
	let newName = $state('');
	let newSlug = $state('');
	let creating = $state(false);
	let total = $state(0);

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await getCompanies({ search: search || undefined });
			companies = res.data;
			total = res.meta.total;
		} catch (e: any) {
			error = e.message || 'Gagal memuat companies';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void search;
		load();
	});

	async function handleCreate() {
		if (!newName.trim() || !newSlug.trim()) return;
		creating = true;
		try {
			await createCompany(newName.trim(), newSlug.trim().toLowerCase().replace(/\s+/g, '-'));
			newName = '';
			newSlug = '';
			showCreate = false;
			load();
		} catch (e: any) {
			error = e.message;
		} finally {
			creating = false;
		}
	}

	async function handleDelete(id: string, name: string) {
		if (!confirm(`Hapus company "${name}"?`)) return;
		try {
			await deleteCompany(id);
			load();
		} catch (e: any) {
			error = e.message;
		}
	}

	const statusVariant = (s: string) =>
		s === 'active' ? 'success' : s === 'provisioning' ? 'warn' : 'error';

	function formatDate(iso: string) {
		return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso));
	}
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="font-display text-2xl font-bold">Companies</h1>
		<p class="mt-1 text-sm text-muted">{total} company{total !== 1 ? 'ies' : ''} total</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="outline" onclick={load} size="sm">
			<RefreshCw size={14} />
		</Button>
		<Button onclick={() => (showCreate = true)} size="sm">
			<Plus size={14} />
			Tambah Company
		</Button>
	</div>
</div>

{#if showCreate}
	<Card title="Tambah Company Baru" class="mb-4">
		<div class="grid gap-3 sm:grid-cols-3">
			<div>
				<label class="mb-1 block text-xs font-medium text-muted" for="co-name">Nama Company</label>
				<Input
					id="co-name"
					bind:value={newName}
					placeholder="PT Maju Bersama"
					onkeydown={(e) => e.key === 'Enter' && handleCreate()}
				/>
			</div>
			<div>
				<label class="mb-1 block text-xs font-medium text-muted" for="co-slug">Slug (URL)</label>
				<Input
					id="co-slug"
					bind:value={newSlug}
					placeholder="maju-bersama"
					onkeydown={(e) => e.key === 'Enter' && handleCreate()}
				/>
			</div>
			<div class="flex items-end">
				<Button onclick={handleCreate} disabled={creating || !newName.trim() || !newSlug.trim()}>
					{creating ? 'Membuat...' : 'Buat'}
				</Button>
			</div>
		</div>
		{#snippet actions()}
			<button onclick={() => (showCreate = false)} class="text-xs text-muted hover:text-foreground">Batal</button>
		{/snippet}
	</Card>
{/if}

{#if error}
	<div class="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">{error}</div>
{/if}

<Card>
	<div class="mb-4 flex items-center gap-2">
		<Search size={16} class="shrink-0 text-muted" />
		<input
			bind:value={search}
			placeholder="Cari company..."
			class="min-w-0 flex-1 rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
		/>
	</div>

	{#if loading}
		<div class="py-8 text-center text-sm text-muted">Memuat...</div>
	{:else if companies.length === 0}
		<div class="py-8 text-center text-sm text-muted">Tidak ada company ditemukan.</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-line text-left text-xs font-medium text-muted">
						<th class="pb-3 pr-4 font-medium">Nama</th>
						<th class="pb-3 pr-4 font-medium">Slug</th>
						<th class="pb-3 pr-4 font-medium">Status</th>
						<th class="pb-3 pr-4 font-medium">Users</th>
						<th class="pb-3 pr-4 font-medium">Dibuat</th>
						<th class="pb-3 font-medium"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each companies as company (company.id)}
						<tr class="group hover:bg-raised/50">
							<td class="py-3 pr-4">
								<div class="flex items-center gap-2">
									<span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised">
										<Building2 size={14} class="text-muted" />
									</span>
									<span class="font-medium">{company.name}</span>
								</div>
							</td>
							<td class="py-3 pr-4 font-mono text-xs text-muted">/{company.slug}</td>
							<td class="py-3 pr-4">
								<Badge variant={statusVariant(company.status)} dot>{company.status}</Badge>
							</td>
							<td class="py-3 pr-4">
								<span class="inline-flex items-center gap-1 text-muted">
									<Users size={12} />
									{company.user_count}
								</span>
							</td>
							<td class="py-3 pr-4 text-muted">{formatDate(company.created_at)}</td>
							<td class="py-3">
								<div class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => goto(`/companies/${company.id}`)}
									>
										<ExternalLink size={14} />
										Channels
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleDelete(company.id, company.name)}
										class="text-warn hover:bg-warn/10"
									>
										<Trash2 size={14} />
									</Button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>
