<script lang="ts">
	import { page } from '$app/state';
	import { t } from 'svelte-i18n';
	import { Activity, X } from '@lucide/svelte';
	import { navItems } from '$lib/navigation';
	import { mockChannels } from '$lib/mock';
	import { cn } from '$lib/utils';

	type Props = { open?: boolean };

	let { open = $bindable(false) }: Props = $props();

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
		aria-label={$t('topbar.menu')}
		onclick={() => (open = false)}
	></button>
{/if}

<aside
	class={cn(
		'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-surface transition-transform duration-200',
		'md:sticky md:top-0 md:h-svh md:translate-x-0',
		open ? 'translate-x-0' : '-translate-x-full'
	)}
>
	<div class="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
		<div
			class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neon text-on-neon shadow-[0_0_16px_var(--neon-glow)]"
		>
			<Activity size={18} />
		</div>
		<span class="font-display text-[15px] font-semibold tracking-tight">our-crm</span>
		<button
			class="ml-auto flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink md:hidden"
			aria-label={$t('common.close')}
			onclick={() => (open = false)}
		>
			<X size={18} />
		</button>
	</div>

	<nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
		{#each navItems as item (item.href)}
			{@const Icon = item.icon}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				onclick={() => (open = false)}
				aria-current={active ? 'page' : undefined}
				class={cn(
					'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
					active ? 'bg-neon-soft text-ink' : 'text-muted hover:bg-raised hover:text-ink'
				)}
			>
				<span
					class={cn(
						'absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full transition-all',
						active ? 'bg-neon shadow-[0_0_8px_var(--neon-glow)]' : 'bg-transparent'
					)}
				></span>
				<Icon size={18} class={active ? 'text-neon-text' : ''} />
				{$t(item.key)}
			</a>
		{/each}
	</nav>

	<div class="shrink-0 border-t border-line px-4 py-3">
		<p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
			{$t('sidebar.channels')}
		</p>
		<ul class="mt-2 space-y-2">
			{#each mockChannels as channel (channel.id)}
				<li class="flex items-center gap-2.5">
					<span
						class={cn(
							'size-2 shrink-0 rounded-full',
							channel.status === 'connected' ? 'bg-neon dot-pulse' : 'bg-warn'
						)}
					></span>
					<span class="min-w-0 flex-1 truncate text-xs text-muted">
						{$t(`dashboard.channel.${channel.id}`)}
					</span>
					<span
						class={cn(
							'text-[11px] font-medium',
							channel.status === 'connected' ? 'text-neon-text' : 'text-warn'
						)}
					>
						{$t(`dashboard.status.${channel.status}`)}
					</span>
				</li>
			{/each}
		</ul>
	</div>
</aside>
