<script lang="ts">
	import { db } from '$lib/db';
	import { getFocusingTodos } from '$lib';
	import { liveQuery } from 'dexie';
	import TodoList from '$lib/components/List.Todo.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Todo/DeleteSelected.todo.button.component.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import SendToThings3 from '$lib/components/Buttons/Todo/SendToThings3.todo.button.component.svelte';
	import UnattachFromThings3 from '$lib/components/Buttons/Todo/UnattachFromThings3.todo.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import SetAsideForLater from '$lib/components/Buttons/Todo/SetAsideForLater.todo.button.component.svelte';

	let todos = liveQuery(() => getFocusingTodos());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Focusing | Things.do</title>
</svelte:head>

<TodoList
	{todos}
	{tags}
	defaultTodoAdditionParams={{
		notes: '',
		start_date: null,
		deadline: null,
		start: null,
		tag_ids: [],
		blocked_by: [],
		evening: false,
		checklist: [],
		logged_at: null,
		logged_status: null,
		deleted_at: null,
		later: false,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			{#snippet children()}
				<SetAsideForLater {highlightedItems} {clearHighlightsForAllItems} />

				<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

				<ClearSelected {clearHighlightsForAllItems} />

				<SendToThings3 {highlightedItems} />

				<UnattachFromThings3 {highlightedItems} />
			{/snippet}
		</ContextMenu>
	{/snippet}
</TodoList>
