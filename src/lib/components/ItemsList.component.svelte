<script lang="ts">
	import ItemComponent from '$lib/components/Item.component.svelte';
	import ItemInputBox from '$lib/components/ItemInputBox.component.svelte';
	import { cleanupTags } from '$lib';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBox.component.svelte';
	import { onMount, type Snippet } from 'svelte';
	import { db, type Item, type Tag } from '$lib/db';
	import type { Observable } from 'dexie';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

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

		// Check if URL has an item parameter and open that item
		const itemIdParam = page.url.searchParams.get('item');
		if (itemIdParam) {
			const itemId = parseInt(itemIdParam, 10);
			if (!isNaN(itemId)) {
				// Wait for items to be loaded, then open the item
				const subscription = items.subscribe((itemsList) => {
					if (itemsList && itemsList.length > 0) {
						const itemToOpen = itemsList.find((item: Item) => item.id === itemId);
						if (itemToOpen) {
							openedItem = itemToOpen;
						}
						subscription.unsubscribe();
					}
				});
			}
		}
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

		const item =
			$items.filter(
				(item: Item) => item.id === parseInt(li.getAttribute('data-id') || '', 10)
			)[0] || null;

		openedItem = item;

		// Update URL with item parameter
		if (item) {
			const url = new URL(window.location.href);
			url.searchParams.set('item', String(item.id));
			goto(url.pathname + url.search, { replaceState: true, noScroll: true });
		}
	}

	function closeOpenedItem() {
		openedItem = null;

		// Remove item parameter from URL
		const url = new URL(window.location.href);
		url.searchParams.delete('item');
		goto(url.pathname + url.search, { replaceState: true, noScroll: true });
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
		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = $items.filter(
				(item: Item) => item.id != null && highlightedItems.has(item.id)
			);
			if (selectedItems.length > 0 && navigator.clipboard?.writeText) {
				const markdown = selectedItems.map((item) => `- ${item.title}`).join('\n');
				navigator.clipboard.writeText(markdown);
			}
			return;
		}

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
			<li data-id={item.id} class="relative">
				{#if dragInsertIndex === index}
					<div
						class="absolute -top-1 right-0 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
				{#if dragInsertIndex === $items.length && index === $items.length - 1}
					<div
						class="absolute right-0 -bottom-1 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
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
