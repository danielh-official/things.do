<script lang="ts">
	import Todo from '$lib/components/Todo.component.svelte';
	import TodoInputBox from '$lib/components/InputBox.Todo.component.svelte';
	import { cleanupTags } from '$lib';
	import { onMount, type Snippet } from 'svelte';
	import { db, type Item, type Tag } from '$lib/db';
	import type { Observable } from 'dexie';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let {
		todos = $bindable(),
		tags = $bindable(),
		defaultTodoAdditionParams = $bindable(),
		shouldPermanentlyDeleteHighlightedItemsOnEscape:
			shouldPermanentlyDeleteHighlightedItems = false,
		customKeydownBehavior,
		contextMenu,
		hideParentForTodosInList = false
	}: {
		todos: Observable<Item[]>;
		tags: Observable<Tag[]>;
		defaultTodoAdditionParams?: Omit<
			Item,
			'id' | 'order' | 'title' | 'created_at' | 'updated_at' | 'things_id'
		>;
		shouldPermanentlyDeleteHighlightedItemsOnEscape?: boolean;
		customKeydownBehavior?: (
			event: KeyboardEvent,
			highlightedItems: SvelteSet<number>,
			openedItem: Item | null,
			addingNewItem: boolean,
			defaultTodoAdditionParams:
				| Omit<Item, 'id' | 'order' | 'title' | 'created_at' | 'updated_at' | 'things_id'>
				| undefined,
			closeOpenedItem: () => void,
			clearHighlightsForAllItems: () => void,
			shouldPermanentlyDeleteHighlightedItems: boolean,
			permanentlyDeleteHighlightedItems: () => void,
			deleteHighlightedItems: () => void,
			addItem: ((event: KeyboardEvent) => void) | null
		) => void;
		contextMenu?: Snippet<
			[
				highlightedItems: SvelteSet<number>,
				clearHighlightsForAllItems: () => void,
				show: boolean,
				x: number,
				y: number
			]
		>;
		hideParentForTodosInList?: boolean;
	} = $props();

	onMount(() => {
		cleanupTags();

		// Check if URL has an item parameter and open that item
		const itemIdParam = page.url.searchParams.get('item');
		if (itemIdParam) {
			const itemId = parseInt(itemIdParam, 10);
			if (!isNaN(itemId)) {
				// Wait for items to be loaded, then open the item
				const subscription = todos.subscribe((todosList) => {
					if (todosList && todosList.length > 0) {
						const itemToOpen = todosList.find((item: Item) => item.id === itemId);
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
		const todo = input.value.trim();
		if (todo && defaultTodoAdditionParams) {
			db.todos.add({
				...defaultTodoAdditionParams,
				title: todo,
				order: $todos.length > 0 ? Math.max(...$todos.map((t) => t.order)) + 1 : 1,
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				things_id: null
			});

			input.value = '';
		}
	}

	let highlightedItems = $state(new SvelteSet<number>());

	function alsoToggleHighlightForAllPreviousItems(itemId: number) {
		const todosArray = $todos;
		for (const item of todosArray) {
			// If not highlighted yet, highlight it
			if (item.id != null && !highlightedItems.has(item.id)) {
				highlightedItems.add(item.id);
				const button = document.querySelector(`button[data-id='${item.id}']`) as HTMLButtonElement;
				if (button) {
					button.classList.add('highlighted');
				}
			}

			if (item.id === itemId) {
				break;
			}
		}
	}

	function highlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemId = parseInt(button.getAttribute('data-id') || '', 10);

		if (event.shiftKey) {
			alsoToggleHighlightForAllPreviousItems(itemId);
			return;
		}

		if (highlightedItems.has(itemId)) {
			highlightedItems.delete(itemId);
			button.classList.remove('highlighted');
		} else {
			highlightedItems.add(itemId);
			button.classList.add('highlighted');
		}
	}

	function oneWayHighlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemId = parseInt(button.getAttribute('data-id') || '', 10);

		if (!highlightedItems.has(itemId)) {
			highlightedItems.add(itemId);
			button.classList.add('highlighted');
		}
	}

	function clearHighlightsForAllItems() {
		$todos.forEach((item: Item) => {
			const itemId = item.id;

			const button = document.querySelector(`button[data-id='${itemId}']`) as HTMLButtonElement;
			if (button) {
				button.classList.remove('highlighted');
			}
		});
		highlightedItems.clear();
	}

	async function permanentlyDeleteHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.todos.delete(itemId);
		});
		clearHighlightsForAllItems();
	}

	let openedItem: Item | null = $state(null);

	function openItem(event: MouseEvent) {
		clearHighlightsForAllItems();

		const li = event.currentTarget as HTMLLIElement;

		const item =
			$todos.filter(
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

		const idx = $todos.findIndex((i: Item) => i.id === targetId);
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
			? $todos.filter((i) => i.id != null && highlightedItems.has(i.id!)).map((i) => i.id!)
			: [sourceId];

		// No-op if target is inside the group being moved
		if (groupIds.includes(targetItemId)) {
			resetDragState();
			return;
		}

		const currentItems = [...$todos];

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
				return db.todos.update(item.id, {
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
			await db.todos.update(itemId, { deleted_at: new SvelteDate() });
		});
		clearHighlightsForAllItems();
	}

	// MARK: Keydown Handling

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = $todos.filter(
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

		if (event.code === 'Space' && !openedItem && !addingNewItem && defaultTodoAdditionParams) {
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

		if (event.key === 'f' && highlightedItems.size > 0) {
			event.preventDefault();
			// Get highlighted items and set all 'later' to false
			highlightedItems.forEach(async (itemId) => {
				await db.todos.update(itemId, { later: false, updated_at: new SvelteDate() });
			});
			clearHighlightsForAllItems();
			return;
		}

		if (event.key === 'l' && highlightedItems.size > 0) {
			event.preventDefault();
			// Get highlighted items and set all 'later' to true
			highlightedItems.forEach(async (itemId) => {
				await db.todos.update(itemId, { later: true, updated_at: new SvelteDate() });
			});
			clearHighlightsForAllItems();
			return;
		}
	}

	let showMenu = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);

	function handleContextMenu(event: MouseEvent, highlightedItems: SvelteSet<number>) {
		// Only show custom menu if it is over a todo item
		const path = event.composedPath() as HTMLElement[];
		const isOverTodoItem = path.some((el) => el.classList && el.classList.contains('todo-item'));

		if (!isOverTodoItem || highlightedItems.size === 0) {
			// Allow default browser context menu for non-todo areas
			return;
		}

		event.preventDefault(); // Prevent the default browser context menu only for todo items

		showMenu = false; // Hide briefly to re-render and ensure correct positioning

		// Position the custom menu at the cursor's location
		menuX = event.clientX;
		menuY = event.clientY - 150;

		showMenu = true;
	}
</script>

<!-- MARK: On Keydown -->

<svelte:window
	onkeydown={(event: KeyboardEvent) => {
		if (customKeydownBehavior) {
			customKeydownBehavior(
				event,
				highlightedItems,
				openedItem,
				addingNewItem,
				defaultTodoAdditionParams,
				closeOpenedItem,
				clearHighlightsForAllItems,
				shouldPermanentlyDeleteHighlightedItems,
				permanentlyDeleteHighlightedItems,
				deleteHighlightedItems,
				addItem
			);
		} else {
			processKeydownEvent(event);
		}
	}}
	oncontextmenu={(event) => handleContextMenu(event, highlightedItems)}
/>

<!-- MARK: Todo Input Box -->
{#if defaultTodoAdditionParams}
	<TodoInputBox bind:addingNewItem />
{/if}

<!-- MARK: List of Todos -->
{#if $todos?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each $todos as item, index (item.id)}
			<li data-id={item.id} class="todo-item relative">
				{#if dragInsertIndex === index}
					<div
						class="absolute -top-1 right-0 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
				{#if dragInsertIndex === $todos.length && index === $todos.length - 1}
					<div
						class="absolute right-0 -bottom-1 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
				<!-- MARK: Individual Todo -->
				<Todo
					{item}
					bind:openedItem
					{openItem}
					{highlightItem}
					handleDragStart={(event: DragEvent) => handleDragStart(event, item.id!)}
					handleDragOver={(event: DragEvent) => handleDragOver(event, item.id!)}
					handleDrop={(event: DragEvent) => handleDrop(event, item.id!)}
					{handleDragEnd}
					tags={$tags}
					{oneWayHighlightItem}
					hideParent={hideParentForTodosInList}
				/>
			</li>
		{/each}
	</ul>
{/if}

<!-- MARK: Context Menu -->
{#if contextMenu}
	{@render contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
{/if}
