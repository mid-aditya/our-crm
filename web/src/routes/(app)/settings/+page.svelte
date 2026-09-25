<script lang="ts">
	import { t, locale as currentLocale } from 'svelte-i18n';
	import { Check, Languages, Monitor, Moon, Sun } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { channelDefs } from '$lib/channels/definitions';
	import { channelStore } from '$lib/channels/store';
	import ChannelCard from '$lib/components/ui/ChannelCard.svelte';
	import { theme, setTheme, type Theme } from '$lib/theme.svelte';
	import { setLocale, locales, localeNames, type AppLocale } from '$lib/i18n';
	import { cn } from '$lib/utils';

	let company = $state('PT Maju Jaya');
	let timezone = $state('Asia/Jakarta');
	let saved = $state(false);
	let savedTimeout: ReturnType<typeof setTimeout>;

	const tzOptions = [
		{ value: 'Asia/Jakarta', label: 'Asia/Jakarta (GMT+7)' },
		{ value: 'Asia/Makassar', label: 'Asia/Makassar (GMT+8)' },
		{ value: 'Asia/Jayapura', label: 'Asia/Jayapura (GMT+9)' }
	];

	const themeOptions: Array<{ value: Theme; key: string }> = [
		{ value: 'light', key: 'theme.light' },
		{ value: 'dark', key: 'theme.dark' },
		{ value: 'system', key: 'theme.system' }
	];

	function segmented(selected: boolean) {
		return cn(
			'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
			selected
				? 'border-neon bg-neon-soft text-ink'
				: 'border-line text-muted hover:border-line-strong hover:text-ink'
		);
	}

	function save(e: SubmitEvent) {
		e.preventDefault();
		saved = true;
		clearTimeout(savedTimeout);
		savedTimeout = setTimeout(() => (saved = false), 2000);
	}
</script>

<p class="mb-4 text-sm text-muted">{$t('settings.subtitle')}</p>

<div class="mx-auto max-w-2xl space-y-5">
	<Card title={$t('settings.appearance')}>
		<div class="space-y-5">
			<div>
				<p class="text-sm font-medium">{$t('settings.theme')}</p>
				<p class="mt-0.5 text-xs text-muted">{$t('settings.themeDesc')}</p>
				<div class="mt-3 grid max-w-sm grid-cols-3 gap-2" role="group" aria-label={$t('settings.theme')}>
					{#each themeOptions as opt (opt.value)}
						<button
							class={segmented(theme.value === opt.value)}
							aria-pressed={theme.value === opt.value}
							onclick={() => setTheme(opt.value)}
						>
							{#if opt.value === 'light'}
								<Sun size={15} />
							{:else if opt.value === 'dark'}
								<Moon size={15} />
							{:else}
								<Monitor size={15} />
							{/if}
							{$t(opt.key)}
						</button>
					{/each}
				</div>
			</div>
			<div>
				<p class="text-sm font-medium">{$t('settings.language')}</p>
				<p class="mt-0.5 text-xs text-muted">{$t('settings.languageDesc')}</p>
				<div class="mt-3 grid max-w-sm grid-cols-2 gap-2" role="group" aria-label={$t('settings.language')}>
					{#each locales as l (l)}
						{@const label = localeNames[l as AppLocale]}
						<button
							class={segmented(($currentLocale as AppLocale) === l)}
							aria-pressed={($currentLocale as AppLocale) === l}
							onclick={() => setLocale(l as AppLocale)}
						>
							<Languages size={15} />
							{label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</Card>

	<Card title={$t('settings.workspace')}>
		<form class="space-y-3" onsubmit={save}>
			<Field label={$t('settings.company')}>
				<Input bind:value={company} />
			</Field>
			<Field label={$t('settings.timezone')}>
				<Select options={tzOptions} bind:value={timezone} />
			</Field>
			<div class="flex justify-end">
				<Button type="submit">
					{#if saved}
						<Check size={15} />
						{$t('settings.saved')}
					{:else}
						{$t('settings.save')}
					{/if}
				</Button>
			</div>
		</form>
	</Card>

	<Card title={$t('settings.channels')} description={$t('settings.channelsDesc')}>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each channelDefs as def (def.id)}
				<ChannelCard {def} />
			{/each}
		</div>
	</Card>
</div>
