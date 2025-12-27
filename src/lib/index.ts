// place files you want to import through the `$lib` alias in this folder.

import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { db, type Item } from './db';

export function clickOutside(node: HTMLElement) {
	// the node has been mounted in the DOM

	window.addEventListener('click', handleClick);

	function handleClick(e: MouseEvent) {
		if (!node.contains(e.target as Node)) {
			node.dispatchEvent(new CustomEvent('outsideclick'));
		}
	}

	return {
		destroy() {
			// the node has been removed from the DOM
			window.removeEventListener('click', handleClick);
		}
	};
}

export async function getFocusingItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			return true;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getLaterItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			if (item.later) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getBlockedItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			if (item.blocked_by && item.blocked_by.length > 0) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTrashedItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.deleted_at && item.deleted_at !== null) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTags() {
	return await db.tags.toArray();
}

export function highlightItemUtil(event: MouseEvent, highlightedItems: SvelteSet<number>): SvelteSet<number> {
	const button = event.currentTarget as HTMLButtonElement;
	const itemId = parseInt(button.getAttribute('data-id') || '', 10);
	const newHighlightedItems = new SvelteSet(highlightedItems);

	if (newHighlightedItems.has(itemId)) {
		newHighlightedItems.delete(itemId);
		button.classList.add('bg-white');
		button.classList.add('hover:bg-gray-50');
		button.classList.remove('bg-blue-200');
		button.classList.remove('hover:bg-blue-300');
	} else {
		newHighlightedItems.add(itemId);
		button.classList.remove('bg-white');
		button.classList.remove('hover:bg-gray-50');
		button.classList.add('bg-blue-200');
		button.classList.add('hover:bg-blue-300');
	}

	return newHighlightedItems;
}

export function clearHighlightsForAllItemsUtil(
	items: Item[],
	highlightedItems: SvelteSet<number>
) {
	items.forEach((item: Item) => {
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
	return highlightedItems;
}

export function processKeydownEventUtil(
	event: KeyboardEvent,
	options: {
		addingNewItem?: boolean,
		openedItem: Item | null,
		addItem?: (event: KeyboardEvent) => void,
		closeOpenedItem: () => void,
		highlightedItems: SvelteSet<number>,
		clearHighlightsForAllItems: () => void,
		deleteHighlightedItems: () => void,
	}
) {
	const { addingNewItem, openedItem, addItem, closeOpenedItem, highlightedItems, clearHighlightsForAllItems, deleteHighlightedItems } = options;

	if (event.code === 'Enter' && addingNewItem) {
		addItem?.(event);
		return;
	}

	if (event.code === 'Space' && !openedItem && !addingNewItem) {
		const input = document.querySelector('input#new-item-input') as HTMLInputElement;
		if (input) {
			event.preventDefault();
			input.focus();
		}
		return;
	}

	if (event.key === 'Escape' && openedItem) {
		closeOpenedItem();
		return;
	}

	if (event.key === 'Escape' && highlightedItems.size > 0) {
		clearHighlightsForAllItems();
		return;
	}

	if (event.key === 'Backspace' && highlightedItems.size > 0 && !addingNewItem && !openedItem) {
		deleteHighlightedItems();
		return;
	}
}

export async function handleDropUtil(
	event: DragEvent,
	targetItemId: number,
	highlightedItems: SvelteSet<number>,
	$items: Item[],
	draggingItemId: number | null,
	resetDragState: () => void
) {
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

export function handleDragOverUtil(
	event: DragEvent,
	highlightedItems: SvelteSet<number>,
	items: Item[],
	draggingItemId: number | null,
	dragInsertIndex: number | null
) {
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

	const idx = items.findIndex((i: Item) => i.id === targetId);
	if (idx === -1) {
		dragInsertIndex = null;
		return;
	}

	dragInsertIndex = idx + (dropAfter ? 1 : 0);

	return {
		draggingItemId,
		dragInsertIndex
	}
}

export function deleteHighlightedItemsUtil(
	highlightedItems: SvelteSet<number>,
	clearHighlightsForAllItems: () => void
) {
	highlightedItems.forEach(async (itemId) => {
		await db.items.update(itemId, { deleted_at: new SvelteDate() });
	});
	clearHighlightsForAllItems();
}

export function openItemUtil(
	event: MouseEvent,
	items: Item[],
	clearHighlightsForAllItems: () => void
) {
	clearHighlightsForAllItems();

	const li = event.currentTarget as HTMLLIElement;

	return items.filter(
		(item: Item) => item.id === parseInt(li.getAttribute('data-id') || '', 10)
	)[0] || null;
}