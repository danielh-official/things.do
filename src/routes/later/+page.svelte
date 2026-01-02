<script lang="ts">
	import { db } from '$lib/db';
	import { getLaterTodos } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsList from '$lib/components/List.Todo.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/DeleteSelected.button.component.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import FocusOnNowButton from '$lib/components/Buttons/FocusOnNow.button.component.svelte';
	import SendToThings3 from '$lib/components/Buttons/SendToThings3.button.component.svelte';
	import UnattachFromThings3 from '$lib/components/Buttons/UnattachFromThings3.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';

	let todos = liveQuery(() => getLaterTodos());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Later | Things.do</title>
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
		later: true,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			{#snippet children()}
				<FocusOnNowButton {highlightedItems} {clearHighlightsForAllItems} />

				<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

				<ClearSelected {clearHighlightsForAllItems} />

				<SendToThings3 {highlightedItems} />

				<UnattachFromThings3 {highlightedItems} />
			{/snippet}
		</ContextMenu>
	{/snippet}
</ItemsList>
