<script lang="ts">
	import { Select } from 'bits-ui';
	import { Check, ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type Option = { value: string; label: string };

	type Props = {
		options: Option[];
		value?: string;
		placeholder?: string;
		ariaLabel?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
	};

	let {
		options,
		value = $bindable(''),
		placeholder = '',
		ariaLabel,
		disabled = false,
		id,
		class: cls = ''
	}: Props = $props();

	const selected = $derived(options.find((o) => o.value === value));
</script>

	<Select.Root type="single" value={value} onValueChange={(v) => (value = v ?? '')} {disabled}>
	<Select.Trigger
		{id}
		aria-label={ariaLabel}
		class={cn(
			'flex h-9.5 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left text-sm transition-colors',
			'hover:border-line-strong focus:border-neon focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
			selected ? 'text-ink' : 'text-faint',
			cls
		)}
	>
		<span class="truncate">{selected?.label ?? placeholder}</span>
		<ChevronDown size={16} class="shrink-0 text-faint" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			sideOffset={4}
			class="z-50 max-h-72 w-[var(--bits-select-anchor-width)] min-w-[10rem] overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-1 shadow-lg shadow-black/10 outline-none dark:shadow-black/50"
		>
			<Select.Viewport>
				{#each options as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						class="flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-muted outline-none data-[highlighted]:bg-raised data-[highlighted]:text-ink data-[selected]:text-neon-text data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
					>
						{option.label}
						{#if value === option.value}
							<Check size={14} class="text-neon-text" />
						{/if}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
