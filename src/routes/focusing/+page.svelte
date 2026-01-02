<script lang="ts">
	import { db } from '$lib/db';
	import { getFocusingTodos } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsList from '$lib/components/TodoList.component.svelte';
	import DeleteSelected from '$lib/components/DeleteSelected.button.component.svelte';
	import ClearSelected from '$lib/components/ClearSelected.button.component.svelte';
	import SendToThings3 from '$lib/components/SendToThings3.button.component.svelte';
	import UnattachFromThings3 from '$lib/components/UnattachFromThings3.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import SetAsideForLater from '$lib/components/SetAsideForLater.button.component.svelte';

	let todos = liveQuery(() => getFocusingTodos());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Focusing | Things.do</title>
</svelte:head>

<ItemsList
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
</ItemsList>
