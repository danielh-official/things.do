<script lang="ts">
	import { getBlockedTodos } from '$lib';
	import { liveQuery } from 'dexie';

	let blockedTodos = liveQuery(() => getBlockedTodos());
</script>

<svelte:head>
	<title>Blocked | Things.do</title>
</svelte:head>

{#if $blockedTodos?.length}
	<p class="p-4 text-sm text-gray-600 dark:text-gray-300">
		Blocked to-dos: {$blockedTodos.length}
	</p>
{:else}
	<p class="p-4 text-sm text-gray-500 dark:text-gray-400">No blocked to-dos right now.</p>
{/if}
