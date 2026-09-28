<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn, initials } from '$lib/utils';

	type Props = {
		/** 'incoming' = kiri (lawan bicara), 'outgoing' = kanan (milik sendiri) */
		variant?: 'incoming' | 'outgoing';
		name?: string | null;
		avatar?: string | null;
		time?: string | null;
		class?: string;
		children: Snippet;
	};

	let { variant = 'incoming', name = null, avatar = null, time = null, class: klass = '', children }: Props =
		$props();

	const outgoing = $derived(variant === 'outgoing');
</script>

<div class={cn('flex', outgoing ? 'justify-end' : 'justify-start', klass)}>
	<div class={cn('max-w-[75%]', !outgoing && avatar !== undefined && 'flex gap-1.5')}>
		{#if !outgoing && avatar !== undefined}
			<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted">
				{avatar || initials(name ?? '?')}
			</span>
		{/if}
		<div class="min-w-0">
			{#if !outgoing && name}
				<p class="mb-0.5 px-1 text-[10px] font-medium text-neon-text">{name}</p>
			{/if}
			<div
				class={cn(
					'rounded-2xl px-3 py-2 text-sm whitespace-pre-line',
					outgoing ? 'rounded-br-sm bg-neon text-on-neon' : 'rounded-bl-sm bg-raised text-ink'
				)}
			>
				{@render children()}
			</div>
			{#if time}
				<p class={cn('mt-0.5 px-1 text-[10px] text-faint', outgoing && 'text-right')}>{time}</p>
			{/if}
		</div>
	</div>
</div>
