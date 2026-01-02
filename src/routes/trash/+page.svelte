<script lang="ts">
	import TodosList from '$lib/components/TodoList.component.svelte';
	import { db } from '$lib/db';
	import { getTrashedTodos } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/ClearSelected.button.component.svelte';
	import RestoreSelected from '$lib/components/RestoreSelected.button.component.svelte';
	import PermanentlyDeletedSelected from '$lib/components/PermanentlyDeleteSelected.button.component.svelte';

	let todos = liveQuery(() => getTrashedTodos());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Trash | Things.do</title>
</svelte:head>

{#if $todos?.length > 0}
	<button
		class="mt-4 cursor-pointer rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
		onclick={() => {
			if (
				!confirm(
					'Are you sure you want to permanently delete all items in the trash? This action cannot be undone.'
				)
			) {
				return;
			}

			$todos.forEach(async (todo) => {
				await db.todos.delete(todo.id!);
			});
		}}>Empty Trash</button
	>
{/if}

<TodosList {todos} {tags}>
	{#snippet multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
		<RestoreSelected {highlightedItems} {clearHighlightsForAllItems} />

		<PermanentlyDeletedSelected {highlightedItems} {clearHighlightsForAllItems} />

		<ClearSelected {clearHighlightsForAllItems} />
	{/snippet}
</TodosList>
