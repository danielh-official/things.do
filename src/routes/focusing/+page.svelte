<script lang="ts">
	import { db } from '$lib/db';
	import { getFocusingItems } from '$lib';
	import { liveQuery } from 'dexie';
	import ItemsList from '$lib/components/ItemsList.component.svelte';
	import DeleteSelectedItemsButton from '$lib/components/DeleteSelectedItems.button.component.svelte';
	import SetAsideForLaterButton from '$lib/components/SetAsideForLater.button.component.svelte';
	import ClearSelectedItemsButton from '$lib/components/ClearSelectedItems.button.component.svelte';
	import SendToThings3Button from '$lib/components/SendToThings3.button.component.svelte';
	import UnattachFromThings3Button from '$lib/components/UnattachFromThings3.button.component.svelte';

	let items = liveQuery(() => getFocusingItems());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Focusing | Things.do</title>
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
		later: false,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
		<SetAsideForLaterButton {highlightedItems} {clearHighlightsForAllItems} />

		<div class="flex gap-2">
			<SendToThings3Button {highlightedItems} />

			<UnattachFromThings3Button {highlightedItems} />
		</div>

		<DeleteSelectedItemsButton {highlightedItems} {clearHighlightsForAllItems} />

		<ClearSelectedItemsButton {clearHighlightsForAllItems} />
	{/snippet}
</ItemsList>
