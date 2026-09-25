<script lang="ts">
	// Menu livechat dilebur ke Percakapan — redirect permanen.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';

	onMount(() => {
		goto('/conversations', { replaceState: true });
	});
</script>

<p class="py-8 text-center text-sm text-muted">{$t('common.loading')}</p>
