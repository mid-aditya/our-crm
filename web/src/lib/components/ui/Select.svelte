<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { t } from 'svelte-i18n';
	import { Check, ChevronDown } from '@lucide/svelte';
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
	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

	function handleChange(v: string) {
		onchange?.(v);
		if (resetAfterSelect) value = '';
	}
</script>

<SelectPrimitive.Root type="single" bind:value {disabled} onValueChange={handleChange}>
	<SelectPrimitive.Trigger
		aria-label={rest['aria-label'] ?? label}
		class={cn(
			'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm',
			'transition-all hover:border-line-strong hover:shadow focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/25 focus:shadow-[0_0_12px_var(--neon-glow)]',
			'disabled:cursor-not-allowed disabled:opacity-50',
			!value && 'text-faint',
			klass
		)}
	>
		<span class="truncate">{selectedLabel || label}</span>
		<span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-raised text-muted">
			<ChevronDown size={14} />
		</span>
	</SelectPrimitive.Trigger>
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			sideOffset={6}
			class="dropdown-in z-50 max-h-72 w-[var(--bits-floating-anchor-width)] min-w-40 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-ink shadow-2xl"
		>
			{#each options as opt (opt.value)}
				<SelectPrimitive.Item
					value={opt.value}
					label={opt.label}
					class="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-2.5 pr-8 text-xs font-medium outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-neon-soft"
				>
					{#snippet children({ selected }: { selected: boolean })}
						<span class="truncate">{opt.label}</span>
						{#if selected}
							<span class="absolute right-2 text-neon-text"><Check size={13} /></span>
						{/if}
					{/snippet}
				</SelectPrimitive.Item>
			{/each}
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
</SelectPrimitive.Root>
