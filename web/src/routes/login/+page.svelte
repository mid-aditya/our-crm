<script lang="ts">
	import { goto } from '$app/navigation';
	import { setToken } from '$lib/api';
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

		<div class="mt-8 space-y-3">
			<button
				onclick={() => {
					setToken('demo-agent-token');
					goto('/dashboard');
				}}
				class="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90"
			>
				Masuk sebagai Agent
			</button>
			<button
				onclick={() => {
					setToken('demo-admin-token');
					goto('/dashboard');
				}}
				class="w-full rounded-xl border border-line bg-surface-secondary px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
			>
				Masuk sebagai Admin
			</button>
		</div>

		<p class="mt-6 text-xs text-muted">(Demo mode — no real auth)</p>
	</div>
</div>
