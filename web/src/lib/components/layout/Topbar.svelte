<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t, locale as currentLocale } from 'svelte-i18n';
	import { DropdownMenu } from 'bits-ui';
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
	import { currentUser } from '$lib/mock';
	import { setToken, setCompanyId } from '$lib/api';
	import { setLocale, locales, localeNames, type AppLocale } from '$lib/i18n';
	import { setTheme, theme, resolveTheme, type Theme } from '$lib/theme.svelte';
	import { cn, initials } from '$lib/utils';

	let { onMenu }: { onMenu: () => void } = $props();

	const current = $derived(
		navItems.find((n) =>
			n.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(n.href)
		)
	);
	const resolved = $derived(resolveTheme(theme.value));

	const iconBtn =
		'flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink focus:outline-none';
	const menuItem =
		'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted outline-none data-[highlighted]:bg-raised data-[highlighted]:text-ink';
	const contentCls =
		'z-50 min-w-40 rounded-lg border border-line bg-surface p-1 shadow-lg shadow-black/10 outline-none dark:shadow-black/50';

	const themeOptions: Array<{ value: Theme; key: string }> = [
		{ value: 'light', key: 'theme.light' },
		{ value: 'dark', key: 'theme.dark' },
		{ value: 'system', key: 'theme.system' }
	];

	function logout() {
		setToken(null);
		setCompanyId(null);
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
		{current ? $t(current.key) : $t('nav.dashboard')}
	</h1>

	<div class="ml-auto flex items-center gap-1">
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
					{initials(currentUser.name)}
				</span>
				<span class="hidden text-left sm:block">
					<span class="block text-xs font-semibold leading-tight">{currentUser.name}</span>
					<span class="block text-[10px] leading-tight text-faint">{currentUser.role}</span>
				</span>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content class={contentCls} sideOffset={6} align="end">
					<DropdownMenu.Item class={menuItem} onSelect={() => goto('/settings')}>
						<UserRound size={15} />
						{$t('topbar.profile')}
					</DropdownMenu.Item>
					<DropdownMenu.Item class={menuItem} onSelect={() => goto('/settings')}>
						<Settings size={15} />
						{$t('nav.settings')}
					</DropdownMenu.Item>
					<DropdownMenu.Separator class="my-1 h-px bg-line" />
					<DropdownMenu.Item
						class={cn(menuItem, 'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger')}
						onSelect={logout}
					>
						<LogOut size={15} />
						{$t('topbar.logout')}
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	</div>
</header>
