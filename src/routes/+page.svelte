<script lang="ts">
	import { db } from '$lib/db';
	import { getFocusingItems } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsListComponent from '$lib/components/ItemsList.component.svelte';
	import DeleteSelectedItemsButtonComponent from '$lib/components/DeleteSelectedItems.button.component.svelte';
	import SetAsideForLaterButtonComponent from '$lib/components/SetAsideForLater.button.component.svelte';
	import ClearSelectedItemsButtonComponent from '$lib/components/ClearSelectedItems.button.component.svelte';

	let items = liveQuery(() => getFocusingItems());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Focusing | Things.do</title>
</svelte:head>

<ItemsListComponent
	{items}
	{tags}
	defaultItemAdditionParams={{
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
		later: false,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
		<DeleteSelectedItemsButtonComponent {highlightedItems} {clearHighlightsForAllItems} />

		<SetAsideForLaterButtonComponent {highlightedItems} {clearHighlightsForAllItems} />

		<ClearSelectedItemsButtonComponent {clearHighlightsForAllItems} />
	{/snippet}
</ItemsListComponent>
