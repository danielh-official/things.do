<script lang="ts">
	import { db } from '$lib/db';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import ItemInputBox from '$lib/components/ItemInputBoxComponent.svelte';
	import { cleanupTags, getFocusingItems } from '$lib';
	import { liveQuery } from 'dexie';
	import useDragAndDrop from '$lib/item.dragndrop.svelte';
	import useItemOpening from '$lib/item.opening.svelte';
	import useItemHighlighting from '$lib/item.highlighting.svelte';
	import useItemAdding from '$lib/item.adding.svelte';
	import useKeydownHandling from '$lib/keydown.svelte';
	import DeleteSelectedItemsButtonComponent from '$lib/components/DeleteSelectedItemsButtonComponent.svelte';
	import ClearSelectedItemsButtonComponent from '$lib/components/ClearSelectedItemsButtonComponent.svelte';
	import SetAsideForLaterButtonComponent from '$lib/components/SetAsideForLaterButtonComponent.svelte';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBoxComponent.svelte';
	import { onMount } from 'svelte';

	let items = liveQuery(() => getFocusingItems());

	let tags = liveQuery(() => db.tags.toArray());

	onMount(() => {
		cleanupTags();
	});

	let itemAddingUtility = useItemAdding(items, {
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
	});

	let itemHighlightingUtility = useItemHighlighting(items);

	let itemOpeningUtility = useItemOpening(
		items,
		itemHighlightingUtility.clearHighlightsForAllItems
	);

	const keydownHandling = useKeydownHandling(
		itemAddingUtility,
		itemOpeningUtility,
		itemHighlightingUtility
	);

	let dragndropUtility = useDragAndDrop(items, itemHighlightingUtility.highlightedItems);
</script>

<svelte:head>
	<title>Focus | Things.do</title>
</svelte:head>

<svelte:window onkeydown={keydownHandling.processKeydownEvent} />

<ItemInputBox bind:addingNewItem={itemAddingUtility.addingNewItem} />
{#if $items?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each $items as item, index (item.id)}
			<li
				data-id={item.id}
				class={dragndropUtility.dragInsertIndex === index
					? 'relative -my-2 border-t-2 border-blue-400'
					: dragndropUtility.dragInsertIndex === $items.length && index === $items.length - 1
						? 'relative -my-2 border-b-2 border-blue-400'
						: ''}
			>
				<ItemComponent
					{item}
					bind:openedItem={itemOpeningUtility.openedItem}
					openItem={itemOpeningUtility.openItem}
					highlightItem={itemHighlightingUtility.highlightItem}
					handleDragStart={(event: DragEvent) => dragndropUtility.handleDragStart(event, item.id!)}
					handleDragOver={(event: DragEvent) => dragndropUtility.handleDragOver(event, item.id!)}
					handleDrop={(event: DragEvent) => dragndropUtility.handleDrop(event, item.id!)}
					handleDragEnd={dragndropUtility.handleDragEnd}
					tags={$tags}
				/>
			</li>
		{/each}
	</ul>
{/if}

<MultiselectOptionBoxComponent highlightedItems={itemHighlightingUtility.highlightedItems}>
	<DeleteSelectedItemsButtonComponent
		deleteHighlightedItems={itemHighlightingUtility.deleteHighlightedItems}
	/>

	<SetAsideForLaterButtonComponent
		highlightedItems={itemHighlightingUtility.highlightedItems}
		clearHighlightsForAllItems={itemHighlightingUtility.clearHighlightsForAllItems}
	/>
	<ClearSelectedItemsButtonComponent
		clearHighlightsForAllItems={itemHighlightingUtility.clearHighlightsForAllItems}
	/>
</MultiselectOptionBoxComponent>
