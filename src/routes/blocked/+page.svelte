<script lang="ts">
	import { db } from '$lib/db';
	import { getBlockedTodos } from '$lib';
	import { liveQuery } from 'dexie';

	let blockedTodos = liveQuery(() => getBlockedTodos());
</script>

<svelte:head>
	<title>Blocked | Things.do</title>
</svelte:head>