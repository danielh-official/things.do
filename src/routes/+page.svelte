<script lang="ts">
	import { db, type Item } from '$lib/db';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBoxComponent.svelte';
	import ItemInputBox from '$lib/components/ItemInputBoxComponent.svelte';
	import {
		getFocusingItems,
		highlightItemUtil,
		clearHighlightsForAllItemsUtil,
		processKeydownEventUtil,
		handleDropUtil,
		handleDragOverUtil,
		deleteHighlightedItemsUtil,
		openItemUtil
	} from '$lib';
	import { liveQuery } from 'dexie';

	let items = liveQuery(() => getFocusingItems());

	let tags = liveQuery(() => db.tags.toArray());

	async function addItem(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item) {
			db.items.add({
				things_id: null,
				title: item,
				notes: '',
				start_date: null,
				deadline: null,
				start: null,
				tag_ids: [],
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				blocked_by: [],
				evening: false,
				checklist: [],
				logged_at: null,
				logged_status: null,
				order: $items.length > 0 ? Math.max(...$items.map((t) => t.order)) + 1 : 1,
				deleted_at: null,
				type: 'task',
				later: false,
				parent_id: null,
				parent_things_id: null
			});

			input.value = '';
		}
	}

	let openedItem: Item | null = $state(null);

	function openItem(event: MouseEvent) {
		openedItem = openItemUtil(event, $items, clearHighlightsForAllItems);
	}

	function closeOpenedItem() {
		openedItem = null;
	}

	let addingNewItem = $state(false);

	async function deleteHighlightedItems() {
		deleteHighlightedItemsUtil(highlightedItems, clearHighlightsForAllItems);
	}

	let highlightedItems = $state<SvelteSet<number>>(new SvelteSet());
	let draggingItemId = $state<number | null>(null);
	let dragInsertIndex = $state<number | null>(null);

	function highlightItem(event: MouseEvent) {
		highlightedItems = highlightItemUtil(event, highlightedItems);
	}

	function handleDragStart(event: DragEvent, itemId: number) {
		draggingItemId = itemId;
		// Keep the source id in dataTransfer for fallback cases
		event.dataTransfer?.setData('text/plain', String(itemId));
	}

	function handleDragOver(event: DragEvent) {
		let draggables = handleDragOverUtil(
			event,
			highlightedItems,
			$items,
			draggingItemId,
			dragInsertIndex
		);

		draggingItemId = draggables?.draggingItemId ?? null;
		dragInsertIndex = draggables?.dragInsertIndex ?? null;
	}

	async function handleDrop(event: DragEvent, targetItemId: number) {
		await handleDropUtil(
			event,
			targetItemId,
			highlightedItems,
			$items,
			draggingItemId,
			resetDragState
		);
	}

	function handleDragEnd() {
		resetDragState();
	}

	function resetDragState() {
		draggingItemId = null;
		dragInsertIndex = null;
	}

	function clearHighlightsForAllItems() {
		highlightedItems = clearHighlightsForAllItemsUtil($items, highlightedItems);
	}

	function processKeydownEvent(event: KeyboardEvent) {
		processKeydownEventUtil(event, {
			addingNewItem,
			openedItem,
			addItem,
			closeOpenedItem,
			highlightedItems,
			clearHighlightsForAllItems,
			deleteHighlightedItems
		});
	}
</script>

<svelte:head>
	<title>Focus | Things.do</title>
</svelte:head>

<svelte:window onkeydown={processKeydownEvent} />

<ItemInputBox bind:addingNewItem />
{#if $items?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each $items as item, index (item.id)}
			<li
				data-id={item.id}
				class={dragInsertIndex === index
					? 'relative -my-2 border-t-2 border-blue-400'
					: dragInsertIndex === $items.length && index === $items.length - 1
						? 'relative -my-2 border-b-2 border-blue-400'
						: ''}
			>
				<ItemComponent
					{item}
					bind:openedItem
					{openItem}
					{highlightItem}
					handleDragStart={(event: DragEvent) => handleDragStart(event, item.id!)}
					handleDragOver={(event: DragEvent) => handleDragOver(event)}
					handleDrop={(event: DragEvent) => handleDrop(event, item.id!)}
					{handleDragEnd}
					tags={$tags}
				/>
			</li>
		{/each}
	</ul>
{/if}
<MultiselectOptionBoxComponent
	{highlightedItems}
	{deleteHighlightedItems}
	{clearHighlightsForAllItems}
/>
