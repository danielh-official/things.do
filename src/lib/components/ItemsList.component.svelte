<script lang="ts">
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import ItemInputBox from '$lib/components/ItemInputBoxComponent.svelte';
	import { cleanupTags } from '$lib';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBoxComponent.svelte';
	import { onMount, type Snippet } from 'svelte';
	import { db, type Item, type Tag } from '$lib/db';
	import type { Observable } from 'dexie';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';

	let {
		items = $bindable(),
		tags = $bindable(),
		defaultItemAdditionParams = $bindable(),
		multiselectButtons = $bindable(),
		shouldPermanentlyDeleteHighlightedItemsOnEscape: shouldPermanentlyDeleteHighlightedItems = false
	}: {
		items: Observable<Item[]>;
		tags: Observable<Tag[]>;
		defaultItemAdditionParams?: Omit<
			Item,
			'id' | 'order' | 'title' | 'created_at' | 'updated_at' | 'things_id'
		>;
		multiselectButtons: Snippet<
			[highlightedItems: SvelteSet<number>, clearHighlightsForAllItems: () => void]
		>;
		shouldPermanentlyDeleteHighlightedItemsOnEscape?: boolean;
	} = $props();

	onMount(() => {
		cleanupTags();
	});

	let addingNewItem = $state(false);

	async function addItem(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item && defaultItemAdditionParams) {
			db.items.add({
				...defaultItemAdditionParams,
				title: item,
				order: $items.length > 0 ? Math.max(...$items.map((t) => t.order)) + 1 : 1,
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				things_id: null
			});

			input.value = '';
		}
	}

	let highlightedItems = $state(new SvelteSet<number>());

	function highlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemId = parseInt(button.getAttribute('data-id') || '', 10);

		if (highlightedItems.has(itemId)) {
			highlightedItems.delete(itemId);
			button.classList.add('bg-white');
			button.classList.add('hover:bg-gray-50');
			button.classList.remove('bg-blue-200');
			button.classList.remove('hover:bg-blue-300');
		} else {
			highlightedItems.add(itemId);
			button.classList.remove('bg-white');
			button.classList.remove('hover:bg-gray-50');
			button.classList.add('bg-blue-200');
			button.classList.add('hover:bg-blue-300');
		}
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

	async function permanentlyDeleteHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.items.delete(itemId);
		});
		clearHighlightsForAllItems();
	}

	let openedItem: Item | null = $state(null);

	function openItem(event: MouseEvent) {
		clearHighlightsForAllItems();

		const li = event.currentTarget as HTMLLIElement;

		openedItem =
			$items.filter(
				(item: Item) => item.id === parseInt(li.getAttribute('data-id') || '', 10)
			)[0] || null;
	}

	function closeOpenedItem() {
		openedItem = null;
	}

	let draggingItemId: number | null = $state(null);
	let dragInsertIndex: number | null = $state(null);

	function handleDragStart(event: DragEvent, itemId: number) {
		draggingItemId = itemId;
		// Keep the source id in dataTransfer for fallback cases
		event.dataTransfer?.setData('text/plain', String(itemId));
	}

	function handleDragOver(event: DragEvent, targetItemId?: number) {
		event.preventDefault();
		const el = event.currentTarget as HTMLElement;
		let targetId = targetItemId;
		if (targetId == null) {
			const idAttr = el.getAttribute('data-id');
			if (!idAttr) {
				dragInsertIndex = null;
				return;
			}
			targetId = parseInt(idAttr, 10);
		}
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

	async function deleteHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.items.update(itemId, { deleted_at: new SvelteDate() });
		});
		clearHighlightsForAllItems();
	}

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.code === 'Enter' && addingNewItem) {
			addItem?.(event);
			return;
		}

		if (event.code === 'Space' && !openedItem && !addingNewItem && defaultItemAdditionParams) {
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
			shouldPermanentlyDeleteHighlightedItems
				? permanentlyDeleteHighlightedItems()
				: deleteHighlightedItems();
			return;
		}
	}
</script>

<svelte:window onkeydown={processKeydownEvent} />

{#if defaultItemAdditionParams}
	<ItemInputBox bind:addingNewItem />
{/if}
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
					handleDragOver={(event: DragEvent) => handleDragOver(event, item.id!)}
					handleDrop={(event: DragEvent) => handleDrop(event, item.id!)}
					{handleDragEnd}
					tags={$tags}
				/>
			</li>
		{/each}
	</ul>
{/if}

<MultiselectOptionBoxComponent {highlightedItems}>
	{@render multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
</MultiselectOptionBoxComponent>
