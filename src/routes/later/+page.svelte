<script lang="ts">
	import { db } from '$lib/db';
	import { getLaterItems } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsListComponent from '$lib/components/ItemsList.component.svelte';
	import DeleteSelectedItemsButtonComponent from '$lib/components/DeleteSelectedItemsButtonComponent.svelte';
	import ClearSelectedItemsButtonComponent from '$lib/components/ClearSelectedItemsButtonComponent.svelte';
	import FocusOnNowButtonComponent from '$lib/components/FocusOnNowButtonComponent.svelte';

	let items = liveQuery(() => getLaterItems());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Later | Things.do</title>
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
		later: true,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
		<DeleteSelectedItemsButtonComponent {highlightedItems} {clearHighlightsForAllItems} />

		<FocusOnNowButtonComponent {highlightedItems} {clearHighlightsForAllItems} />

		<ClearSelectedItemsButtonComponent {clearHighlightsForAllItems} />
	{/snippet}
</ItemsListComponent>
