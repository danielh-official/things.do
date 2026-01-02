<script lang="ts">
	import { db } from '$lib/db';
	import { getLaterTodos } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsList from '$lib/components/TodoList.component.svelte';
	import DeleteSelectedItemsButton from '$lib/components/DeleteSelected.button.component.svelte';
	import ClearSelectedItemsButton from '$lib/components/ClearSelected.button.component.svelte';
	import FocusOnNowButton from '$lib/components/FocusOnNow.button.component.svelte';
	import SendToThings3Button from '$lib/components/SendToThings3.button.component.svelte';
	import UnattachFromThings3Button from '$lib/components/UnattachFromThings3.button.component.svelte';

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
		type: 'task',
		later: true,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
		<FocusOnNowButton {highlightedItems} {clearHighlightsForAllItems} />

		<div class="flex gap-2">
			<SendToThings3Button {highlightedItems} />

			<UnattachFromThings3Button {highlightedItems} />
		</div>

		<DeleteSelectedItemsButton {highlightedItems} {clearHighlightsForAllItems} />

		<ClearSelectedItemsButton {clearHighlightsForAllItems} />
	{/snippet}
</ItemsList>
