<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t, locale as currentLocale } from 'svelte-i18n';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Check,
		Languages,
		LogOut,
		Menu,
		Monitor,
		Moon,
		Settings,
		Sun,
		UserRound
	} from '@lucide/svelte';
	import { navItems } from '$lib/navigation';
	import { clearSession, userStore } from '$lib/api';
	import { getMyPresence, setMyPresence } from '$lib/team/api';
	import { setLocale, locales, localeNames, type AppLocale } from '$lib/i18n';
	import { setTheme, theme, resolveTheme, type Theme } from '$lib/theme.svelte';
	import { cn, initials } from '$lib/utils';
	import { onMount } from 'svelte';

	let { onMenu }: { onMenu: () => void } = $props();

	// Status aux global (header) — untuk agent & spv di semua halaman.
	let presence = $state('offline');
	const showPresence = $derived(['agent', 'spv'].includes(($userStore?.role ?? '').toLowerCase()));

	onMount(async () => {
		if (!showPresence) return;
		try {
			presence = (await getMyPresence()).status;
		} catch { /* abaikan */ }
	});

	async function changePresence(status: string) {
		presence = status;
		try {
			await setMyPresence(status);
		} catch { /* abaikan */ }
	}

	const presenceDot = $derived(
		presence === 'online' ? 'bg-neon dot-pulse' : presence === 'offline' ? 'bg-faint' : 'bg-warn'
	);

	const current = $derived(
		navItems.find((n) =>
			n.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(n.href)
		)
	);
	const resolved = $derived(resolveTheme(theme.value));

	const iconBtn =
		'flex size-9 items-center justify-center rounded-xl border border-transparent text-muted transition-all hover:border-line hover:bg-raised hover:text-ink focus:outline-none';
	const menuItem =
		'group flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted outline-none transition-colors data-[highlighted]:bg-neon-soft data-[highlighted]:text-ink';
	const contentCls =
		'z-50 min-w-48 origin-top-right rounded-xl border border-line bg-surface/95 p-1.5 shadow-xl shadow-black/10 outline-none backdrop-blur-md dark:shadow-black/60 dark:shadow-[0_8px_32px_rgb(0_0_0/0.5),0_0_0_1px_var(--neon-glow)] dropdown-in';
	const sectionLabel =
		'px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint';
	const separatorCls = 'mx-2 my-1 h-px bg-line';
	const tile =
		'flex size-7 shrink-0 items-center justify-center rounded-lg bg-raised text-muted transition-colors group-data-[highlighted]:bg-neon-soft group-data-[highlighted]:text-neon-text';

	const themeOptions: Array<{ value: Theme; key: string }> = [
		{ value: 'light', key: 'theme.light' },
		{ value: 'dark', key: 'theme.dark' },
		{ value: 'system', key: 'theme.system' }
	];

	function logout() {
		clearSession();
		goto('/');
	}
</script>

<header
	class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur md:px-6"
>
	<button class={cn(iconBtn, 'md:hidden')} aria-label={$t('topbar.menu')} onclick={onMenu}>
		<Menu size={18} />
	</button>

	<h1 class="truncate font-display text-sm font-semibold tracking-tight">
		{current ? $t(current.label) : $t('nav.dashboard')}
	</h1>

	<div class="ml-auto flex items-center gap-1">
		<!-- Aux global -->
		{#if showPresence}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 transition-all hover:border-neon hover:shadow-[0_0_12px_var(--neon-glow)] focus:outline-none"
					aria-label={$t('team.presenceTitle')}
					title={$t('team.presenceTitle')}
				>
					<span class={cn('size-2.5 rounded-full', presenceDot)}></span>
					<span class="hidden text-xs font-semibold capitalize sm:block">
						{$t(`team.presence.${presence}`)}
					</span>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content class={contentCls} sideOffset={8} align="end">
						<p class={sectionLabel}>{$t('team.presenceTitle')}</p>
						{#each ['online', 'aux', 'break', 'offline'] as st (st)}
							<DropdownMenu.Item class={menuItem} onSelect={() => changePresence(st)}>
								<span class={tile}>
									<span class={cn('size-2 rounded-full', st === 'online' ? 'bg-neon dot-pulse' : st === 'offline' ? 'bg-faint' : 'bg-warn')}></span>
								</span>
								{$t(`team.presence.${st}`)}
								{#if presence === st}
									<Check size={14} class="ml-auto text-neon-text" />
								{/if}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		{/if}
		<!-- Bahasa -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={iconBtn}
				aria-label={$t('topbar.language')}
				title={$t('topbar.language')}
			>
				<Languages size={18} />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class={contentCls} sideOffset={6} align="end">
					{#each locales as l (l)}
						{@const label = localeNames[l as AppLocale]}
						<DropdownMenu.Item class={menuItem} onSelect={() => setLocale(l as AppLocale)}>
							{label}
							{#if ($currentLocale as AppLocale) === l}
								<Check size={14} class="text-neon-text" />
							{/if}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>

		<!-- Tema -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={iconBtn}
				aria-label={$t('topbar.theme')}
				title={$t('topbar.theme')}
			>
				{#if theme.value === 'system'}
					<Monitor size={18} />
				{:else if resolved === 'dark'}
					<Moon size={18} />
				{:else}
					<Sun size={18} />
				{/if}
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class={contentCls} sideOffset={6} align="end">
					{#each themeOptions as opt (opt.value)}
						<DropdownMenu.Item class={menuItem} onSelect={() => setTheme(opt.value)}>
							{$t(opt.key)}
							{#if theme.value === opt.value}
								<Check size={14} class="text-neon-text" />
							{/if}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>

		<!-- Pengguna -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="ml-1 flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-raised focus:outline-none"
			>
				<span
					class="flex size-7 items-center justify-center rounded-md bg-neon font-mono text-[11px] font-bold text-on-neon"
				>
					{initials($userStore?.name ?? '?')}
				</span>
				<span class="hidden text-left sm:block">
					<span class="block text-xs font-semibold leading-tight">{$userStore?.name ?? '—'}</span>
					<span class="block text-[10px] leading-tight text-faint capitalize">{$userStore?.role ?? ''}</span>
				</span>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class={contentCls} sideOffset={6} align="end">
					{#if showPresence}
						<p class={sectionLabel}>
							{$t('team.presenceTitle')}
						</p>
						{#each ['online', 'aux', 'break', 'offline'] as st (st)}
							<DropdownMenu.Item class={menuItem} onSelect={() => changePresence(st)}>
								<span class={tile}>
									<span class={cn('size-2 rounded-full', st === 'online' ? 'bg-neon dot-pulse' : st === 'offline' ? 'bg-faint' : 'bg-warn')}></span>
								</span>
								{$t(`team.presence.${st}`)}
								{#if presence === st}
									<Check size={14} class="ml-auto text-neon-text" />
								{/if}
							</DropdownMenu.Item>
						{/each}
						<DropdownMenu.Separator class={separatorCls} />
					{/if}
					<DropdownMenu.Item class={menuItem} onSelect={() => goto('/settings')}>
						<span class={tile}><UserRound size={15} /></span>
						{$t('topbar.profile')}
					</DropdownMenu.Item>
					<DropdownMenu.Item class={menuItem} onSelect={() => goto('/settings')}>
						<span class={tile}><Settings size={15} /></span>
						{$t('nav.settings')}
					</DropdownMenu.Item>
					<DropdownMenu.Separator class={separatorCls} />
					<DropdownMenu.Item
						class={cn(menuItem, 'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger')}
						onSelect={logout}
					>
						<span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger"><LogOut size={15} /></span>
						{$t('topbar.logout')}
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	</div>
</header>
