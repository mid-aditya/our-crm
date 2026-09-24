<script lang="ts">
	import { goto } from '$app/navigation';
	import { setToken, setCompanyId } from '$lib/api';

	let loading = $state(false);
	let error = $state('');

	async function demoLogin(role: 'agent' | 'admin') {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/v1/auth/demo-login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error?.message || 'Login failed');
			setToken(data.access_token);
			setCompanyId(data.company_id);
			goto('/dashboard');
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-svh items-center justify-center bg-gradient-to-br from-background to-muted/30">
	<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-lg">
		<div class="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
			<svg class="h-7 w-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
			</svg>
		</div>
		<h1 class="font-display text-2xl font-bold text-foreground">OurCRM</h1>
		<p class="mt-2 text-sm text-muted">Login to access your dashboard.</p>

		{#if error}
			<div class="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
				{error}
			</div>
		{/if}

		<div class="mt-8 space-y-3">
			<button
				onclick={() => demoLogin('agent')}
				disabled={loading}
				class="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading ? 'Memuat...' : 'Masuk sebagai Agent'}
			</button>
			<button
				onclick={() => demoLogin('admin')}
				disabled={loading}
				class="w-full rounded-xl border border-line bg-surface-secondary px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
			>
				{loading ? 'Memuat...' : 'Masuk sebagai Admin'}
			</button>
		</div>

		<p class="mt-6 text-xs text-muted">(Demo mode — connects to Go backend)</p>
	</div>
</div>
