<script lang="ts">
	import { Calendar as CalendarPrimitive, Popover } from 'bits-ui';
	import { DateFormatter, getLocalTimeZone, type DateValue } from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { locale as i18nLocale, t } from 'svelte-i18n';
	import { bcp } from '$lib/i18n';
	import { cn } from '$lib/utils';

	type Props = {
		value?: DateValue | undefined;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		value = $bindable(undefined as DateValue | undefined),
		placeholder = '',
		disabled = false,
		class: cls = ''
	}: Props = $props();

	const fmt = $derived(new DateFormatter(bcp($i18nLocale), { dateStyle: 'medium' }));

	const navBtn =
		'flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink focus:outline-none';
	const dayBtn =
		'flex h-8 w-full cursor-pointer items-center justify-center rounded-md text-sm text-muted transition-colors hover:bg-raised hover:text-ink focus:outline-none data-[selected]:bg-neon data-[selected]:font-semibold data-[selected]:text-on-neon data-[today]:font-semibold data-[today]:text-neon-text data-[today]:hover:text-neon-text data-[disabled]:pointer-events-none data-[disabled]:opacity-30';
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			'flex h-9.5 w-full items-center gap-2 rounded-lg border bg-surface px-3 text-left text-sm transition-colors',
			'hover:border-line-strong focus:border-neon focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
			value ? 'text-ink' : 'text-faint',
			cls
		)}
		{disabled}
	>
		<CalendarDays size={16} class="shrink-0 text-faint" />
		<span class="flex-1 truncate">
			{value ? fmt.format(value.toDate(getLocalTimeZone())) : placeholder}
		</span>
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			align="start"
			class="z-50 rounded-xl border border-line bg-surface p-3 shadow-xl shadow-black/10 outline-none dark:shadow-black/50"
		>
			<CalendarPrimitive.Root
				type="single"
				bind:value
				class="w-64"
				locale={bcp($i18nLocale)}
				weekStartsOn={1}
				weekdayFormat="short"
			>
				{#snippet children({ months, weekdays })}
					<CalendarPrimitive.Header class="mb-2 flex items-center justify-between px-1">
						<CalendarPrimitive.PrevButton class={navBtn} aria-label={$t('common.prevMonth')}>
							<ChevronLeft size={16} />
						</CalendarPrimitive.PrevButton>
						<CalendarPrimitive.Heading class="font-display text-sm font-semibold" />
						<CalendarPrimitive.NextButton class={navBtn} aria-label={$t('common.nextMonth')}>
							<ChevronRight size={16} />
						</CalendarPrimitive.NextButton>
					</CalendarPrimitive.Header>
					<CalendarPrimitive.Grid>
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow>
								{#each weekdays as wd, i (i)}
									<CalendarPrimitive.HeadCell
										class="pb-1 text-center text-[11px] font-medium text-faint"
									>
										{wd}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each months as month, mi (mi)}
								{#each month.weeks as week, wi (wi)}
									<CalendarPrimitive.GridRow>
										{#each week as date, di (di)}
											<CalendarPrimitive.Cell {date} month={month.value} class="p-0">
												<CalendarPrimitive.Day class={dayBtn} />
											</CalendarPrimitive.Cell>
										{/each}
									</CalendarPrimitive.GridRow>
								{/each}
							{/each}
						</CalendarPrimitive.GridBody>
					</CalendarPrimitive.Grid>
				{/snippet}
			</CalendarPrimitive.Root>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
