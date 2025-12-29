<!-- <script lang="ts">
	import { db, type Item } from '$lib/db';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
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
		event.preventDefault();

		const el = event.currentTarget as HTMLElement;
		const idAttr = el.getAttribute('data-id');
		if (!idAttr) {
			dragInsertIndex = null;
			return;
		}

		const targetId = parseInt(idAttr, 10);
		// If dragging a highlighted group and hovering over one of the group items, hide indicator
		const isGroupMove =
			draggingItemId != null && highlightedItems.size > 0 && highlightedItems.has(draggingItemId);
		if (isGroupMove && highlightedItems.has(targetId)) {
			dragInsertIndex = null;
			return;
		}

		const rect = el.getBoundingClientRect();
		const dropAfter = event.clientY > rect.top + rect.height / 2;

		const idx = $items.findIndex((i: Item) => i.id === targetId);
		if (idx === -1) {
			dragInsertIndex = null;
			return;
		}

		dragInsertIndex = idx + (dropAfter ? 1 : 0);
	}

	async function handleDrop(event: DragEvent, targetItemId: number) {
		event.preventDefault();

		const sourceId =
			draggingItemId ?? parseInt(event.dataTransfer?.getData('text/plain') || '', 10);
		if (!sourceId) {
			resetDragState();
			return;
		}

		// Determine if we are moving a group: move all highlighted items together
		const isGroupMove = highlightedItems.size > 0 && highlightedItems.has(sourceId);
		const groupIds: number[] = isGroupMove
			? $items.filter((i) => i.id != null && highlightedItems.has(i.id!)).map((i) => i.id!)
			: [sourceId];

		// No-op if target is inside the group being moved
		if (groupIds.includes(targetItemId)) {
			resetDragState();
			return;
		}

		const currentItems = [...$items];

		// Remove all items being moved, preserving their original relative order
		const movedItems: Item[] = [];
		for (const id of groupIds) {
			const idx = currentItems.findIndex((item) => item.id === id);
			if (idx !== -1) {
				const [mi] = currentItems.splice(idx, 1);
				movedItems.push(mi);
			}
		}

		// Determine insertion position (before/after) based on cursor position
		const el = event.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const dropAfter = event.clientY > rect.top + rect.height / 2;

		let insertionIndex = currentItems.findIndex((item) => item.id === targetItemId);
		if (insertionIndex === -1) {
			resetDragState();
			return;
		}
		if (dropAfter) insertionIndex += 1;

		// Insert the moved items as a contiguous block
		currentItems.splice(insertionIndex, 0, ...movedItems);

		await Promise.all(
			currentItems.map((item, index) => {
				if (item.id == null) return Promise.resolve();
				return db.items.update(item.id, {
					order: index + 1,
					updated_at: new SvelteDate()
				});
			})
		);

		resetDragState();
	}

	function handleDragEnd() {
		resetDragState();
	}

	function resetDragState() {
		draggingItemId = null;
		dragInsertIndex = null;
	}

	function clearHighlightsForAllItems() {
		$items.forEach((item: Item) => {
			const itemId = item.id;

			const button = document.querySelector(`button[data-id='${itemId}']`) as HTMLButtonElement;
			if (button) {
				button.classList.add('bg-white');
				button.classList.add('hover:bg-gray-50');
				button.classList.remove('bg-blue-200');
				button.classList.remove('hover:bg-blue-300');
			}
		});
		highlightedItems.clear();
	}

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.key === 'Escape' && openedItem) {
			closeOpenedItem();
			return;
		}

		if (event.key === 'Escape' && highlightedItems.size > 0) {
			clearHighlightsForAllItems();
			return;
		}

		if (event.key === 'Backspace' && highlightedItems.size > 0 && !openedItem) {
			deleteHighlightedItems();
			return;
		}
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
/> -->
