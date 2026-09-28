<script lang="ts">
	import { Calendar as CalendarPrimitive, Popover } from 'bits-ui';
	import {
		DateFormatter,
		getLocalTimeZone,
		today,
		CalendarDate,
		type DateValue
	} from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from '@lucide/svelte';
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
	const tz = getLocalTimeZone();

	let monthAnchor = $state<DateValue | undefined>(undefined);
	const shown = $derived(monthAnchor ?? value ?? today(tz));
	const months = $derived(
		Array.from({ length: 12 }, (_, i) => ({
			value: i + 1,
			label: new Intl.DateTimeFormat(bcp($i18nLocale), { month: 'short' }).format(
				new Date(2026, i, 1)
			)
		}))
	);
	const years = $derived(Array.from({ length: 19 }, (_, i) => shown.year - 9 + i));

	function setMonth(m: number) {
		const base = shown instanceof CalendarDate ? shown : new CalendarDate(shown.year, shown.month, 1);
		monthAnchor = base.set({ month: m, day: 1 });
	}

	function setYear(y: number) {
		const base = shown instanceof CalendarDate ? shown : new CalendarDate(shown.year, shown.month, 1);
		monthAnchor = base.set({ year: y, day: 1 });
	}

	const navBtn =
		'flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink focus:outline-none';
	const miniSelect =
		'cursor-pointer appearance-none rounded-md bg-transparent py-1 pl-1 pr-5 text-sm font-semibold text-ink transition-colors hover:bg-raised focus:outline-none';
	const dayBtn =
		'flex h-9 w-full cursor-pointer items-center justify-center rounded-lg text-[13px] text-muted transition-colors hover:bg-raised hover:text-ink focus:outline-none data-[selected]:bg-ink data-[selected]:font-semibold data-[selected]:text-bg data-[today]:font-bold data-[today]:text-neon-text data-[today]:data-[selected]:text-bg data-[disabled]:pointer-events-none data-[disabled]:opacity-30';
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
			class="z-50 rounded-xl border border-line bg-surface p-3 shadow-2xl shadow-black/20 outline-none dropdown-in dark:shadow-black/60"
		>
			<CalendarPrimitive.Root
				type="single"
				bind:value
				bind:placeholder={monthAnchor}
				class="w-64"
				locale={bcp($i18nLocale)}
				weekStartsOn={0}
				weekdayFormat="short"
				fixedWeeks
			>
				{#snippet children({ months: _m, weekdays })}
					<CalendarPrimitive.Header class="mb-1 flex items-center justify-between">
						<CalendarPrimitive.PrevButton class={navBtn} aria-label={$t('common.prevMonth')}>
							<ChevronLeft size={16} />
						</CalendarPrimitive.PrevButton>
						<div class="flex items-center">
							<div class="relative">
								<select
									value={shown.month}
									onchange={(e) => setMonth(Number((e.target as HTMLSelectElement).value))}
									class={miniSelect}
									aria-label="Month"
								>
									{#each months as m (m.value)}
										<option value={m.value}>{m.label}</option>
									{/each}
								</select>
								<ChevronDown size={12} class="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-faint" />
							</div>
							<div class="relative">
								<select
									value={shown.year}
									onchange={(e) => setYear(Number((e.target as HTMLSelectElement).value))}
									class={miniSelect}
									aria-label="Year"
								>
									{#each years as y (y)}
										<option value={y}>{y}</option>
									{/each}
								</select>
								<ChevronDown size={12} class="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-faint" />
							</div>
						</div>
						<CalendarPrimitive.NextButton class={navBtn} aria-label={$t('common.nextMonth')}>
							<ChevronRight size={16} />
						</CalendarPrimitive.NextButton>
					</CalendarPrimitive.Header>
					<CalendarPrimitive.Grid>
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as wd, i (i)}
									<CalendarPrimitive.HeadCell
										class="w-9 pb-1 text-center text-[11px] font-medium text-faint"
									>
										{wd}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each _m as month, mi (mi)}
								{#each month.weeks as week, wi (wi)}
									<CalendarPrimitive.GridRow class="flex w-full">
										{#each week as date, di (di)}
											<CalendarPrimitive.Cell {date} month={month.value} class="w-9 p-0 data-[outside-month]:opacity-35">
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
