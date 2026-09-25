<script lang="ts">
	import { t } from 'svelte-i18n';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type Option = { value: string; label: string };

	type Props = {
		value?: string;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		/** kembali ke placeholder setelah memilih (untuk menu aksi) */
		resetAfterSelect?: boolean;
		onchange?: (value: string) => void;
		'aria-label'?: string;
	};

	let {
		value = $bindable(''),
		options,
		placeholder = '',
		disabled = false,
		class: klass = '',
		resetAfterSelect = false,
		onchange,
		...rest
	}: Props = $props();

	const label = $derived(placeholder || $t('common.select'));

	function handleChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		onchange?.(val);
		if (resetAfterSelect) value = '';
	}
</script>

<div class={cn('relative', klass)}>
	<select
		bind:value
		{disabled}
		aria-label={rest['aria-label'] ?? label}
		onchange={handleChange}
		class={cn(
			'w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2 pr-9 text-sm text-ink',
			'transition-colors hover:border-line-strong focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/20',
			'disabled:cursor-not-allowed disabled:opacity-50',
			!value && 'text-faint'
		)}
	>
		<option value="" disabled>{label}</option>
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<ChevronDown
		size={15}
		class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
	/>
</div>

<style>
	/* Dropdown popup mengikuti tema (popup native mengikuti color-scheme) */
	select option {
		background-color: var(--surface);
		color: var(--ink);
	}
</style>
