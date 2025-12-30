<script lang="ts">
	import { db } from '$lib/db';
	import { getLaterItems } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsList from '$lib/components/ItemsList.component.svelte';
	import DeleteSelectedItemsButton from '$lib/components/DeleteSelectedItems.button.component.svelte';
	import ClearSelectedItemsButton from '$lib/components/ClearSelectedItems.button.component.svelte';
	import FocusOnNowButton from '$lib/components/FocusOnNow.button.component.svelte';

	let items = liveQuery(() => getLaterItems());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Later | Things.do</title>
</svelte:head>

<ItemsList
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
		<DeleteSelectedItemsButton {highlightedItems} {clearHighlightsForAllItems} />

		<FocusOnNowButton {highlightedItems} {clearHighlightsForAllItems} />

		<ClearSelectedItemsButton {clearHighlightsForAllItems} />
	{/snippet}
</ItemsList>
