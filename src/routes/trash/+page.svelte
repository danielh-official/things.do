<script lang="ts">
	import { db, type Item } from '$lib/db';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBoxComponent.svelte';
	import {
		getTrashedItems,
		highlightItemUtil,
		clearHighlightsForAllItemsUtil,
		processKeydownEventUtil,
		handleDropUtil,
		handleDragOverUtil,
		openItemUtil
	} from '$lib';
	import { liveQuery } from 'dexie';

	let items = liveQuery(() => getTrashedItems());

	let tags = liveQuery(() => db.tags.toArray());

	let openedItem: Item | null = $state(null);

	function openItem(event: MouseEvent) {
		openedItem = openItemUtil(event, $items, clearHighlightsForAllItems);
	}

	function closeOpenedItem() {
		openedItem = null;
	}

	async function deleteHighlightedItems() {
		if (!confirm('Are you sure you want to permanently delete the selected items?')) {
			return;
		}
		highlightedItems.forEach(async (itemId) => {
			await db.items.delete(itemId);
		});
		clearHighlightsForAllItems();
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
			openedItem,
			closeOpenedItem,
			highlightedItems,
			clearHighlightsForAllItems,
			deleteHighlightedItems
		});
	}

	async function restoreHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.items.update(itemId, { deleted_at: null });
		});
		clearHighlightsForAllItems();
	}
</script>

<svelte:head>
	<title>Trash | Things.do</title>
</svelte:head>

<svelte:window onkeydown={processKeydownEvent} />

{#if $items?.length > 0}
	<button
		class="mt-4 cursor-pointer rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
		onclick={async () => {
			if (!confirm('Are you sure you want to permanently empty the trash?')) {
				return;
			}
			$items?.forEach(async (item) => {
				await db.items.delete(item.id!);
			});
		}}>Empty Trash</button
	>

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
	{restoreHighlightedItems}
/>
