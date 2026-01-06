<script lang="ts">
	import { cleanupTags } from '$lib';
	import { onMount, type Snippet } from 'svelte';
	import { db, type Project } from '$lib/db';
	import type { Observable } from 'dexie';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let {
		projects = $bindable(),
		shouldPermanentlyDeleteHighlightedItemsOnEscape:
			shouldPermanentlyDeleteHighlightedItems = false,
		customKeydownBehavior,
		contextMenu
	}: {
		projects: Observable<Project[]>;
		shouldPermanentlyDeleteHighlightedItemsOnEscape?: boolean;
		customKeydownBehavior?: (
			event: KeyboardEvent,
			highlightedItems: SvelteSet<number>,
			openedItem: Project | null,
			closeOpenedItem: () => void,
			clearHighlightsForAllItems: () => void,
			shouldPermanentlyDeleteHighlightedItems: boolean,
			permanentlyDeleteHighlightedItems: () => void,
			deleteHighlightedItems: () => void
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
	} = $props();

	onMount(() => {
		cleanupTags();

		// Check if URL has an item parameter and open that item
		const itemIdParam = page.url.searchParams.get('item');
		if (itemIdParam) {
			const itemId = parseInt(itemIdParam, 10);
			if (!isNaN(itemId)) {
				// Wait for items to be loaded, then open the item
				const subscription = projects.subscribe((projectsList) => {
					if (projectsList && projectsList.length > 0) {
						const itemToOpen = projectsList.find((item: Project) => item.id === itemId);
						if (itemToOpen) {
							openedItem = itemToOpen;
						}
						subscription.unsubscribe();
					}
				});
			}
		}
	});

	let highlightedItems = new SvelteSet<number>();

	function alsoToggleHighlightForAllPreviousItems(itemId: number) {
		const projectsArray = $projects;
		for (const item of projectsArray) {
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

	function clearHighlightsForAllItems() {
		$projects.forEach((item: Project) => {
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
			await db.projects.delete(itemId);
		});
		clearHighlightsForAllItems();
	}

	let openedItem: Project | null = $state(null);

	function closeOpenedItem() {
		openedItem = null;

		// Remove item parameter from URL
		const url = new URL(window.location.href);
		url.searchParams.delete('item');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url.pathname + url.search, { replaceState: true, noScroll: true });
	}

	let draggingItemId: number | null = $state(null);
	let dragInsertIndex: number | null = $state(null);

	function handleDragStart(event: DragEvent, itemId: number) {
		draggingItemId = itemId;
		// Set a specific type to identify todo items
		if (event.dataTransfer) {
			event.dataTransfer.setData('application/x-project-in-index-item', String(itemId));
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(event: DragEvent, targetItemId?: number) {
		// Only handle if dragging a todo item
		if (!event.dataTransfer?.types.includes('application/x-project-in-index-item')) {
			dragInsertIndex = null;
			return;
		}

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

		const idx = $projects.findIndex((i: Project) => i.id === targetId);
		if (idx === -1) {
			dragInsertIndex = null;
			return;
		}

		dragInsertIndex = idx + (dropAfter ? 1 : 0);
	}

	async function handleDrop(event: DragEvent, targetItemId: number) {
		// Only handle if dragging a todo item
		if (!event.dataTransfer?.types.includes('application/x-project-in-index-item')) {
			resetDragState();
			return;
		}

		event.preventDefault();

		const sourceId =
			draggingItemId ??
			parseInt(event.dataTransfer?.getData('application/x-project-in-index-item') || '', 10);
		if (!sourceId) {
			resetDragState();
			return;
		}

		// Determine if we are moving a group: move all highlighted items together
		const isGroupMove = highlightedItems.size > 0 && highlightedItems.has(sourceId);
		const groupIds: number[] = isGroupMove
			? $projects.filter((i) => i.id != null && highlightedItems.has(i.id!)).map((i) => i.id!)
			: [sourceId];

		// No-op if target is inside the group being moved
		if (groupIds.includes(targetItemId)) {
			resetDragState();
			return;
		}

		const currentItems = [...$projects];

		// Remove all items being moved, preserving their original relative order
		const movedItems: Project[] = [];
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
				return db.projects.update(item.id, {
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
			await db.projects.update(itemId, { deleted_at: new SvelteDate() });
		});
		clearHighlightsForAllItems();
	}

	// MARK: Keydown Handling

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = $projects.filter(
				(item: Project) => item.id != null && highlightedItems.has(item.id)
			);
			if (selectedItems.length > 0 && navigator.clipboard?.writeText) {
				const markdown = selectedItems.map((item) => `- ${item.title}`).join('\n');
				navigator.clipboard.writeText(markdown);
			}
			return;
		}

		if (event.key === 'Escape' && highlightedItems.size > 0) {
			clearHighlightsForAllItems();
			return;
		}

		if (event.key === 'Backspace' && highlightedItems.size > 0 && !openedItem) {
			if (shouldPermanentlyDeleteHighlightedItems) {
				permanentlyDeleteHighlightedItems();
			} else {
				deleteHighlightedItems();
			}
			return;
		}
	}

	let showMenu = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);

	function handleContextMenu(event: MouseEvent, highlightedItems: SvelteSet<number>) {
		// Only show custom menu if it is over a todo item
		const path = event.composedPath() as HTMLElement[];
		const isOverProjectItem = path.some(
			(el) => el.classList && el.classList.contains('project-in-index-item')
		);

		console.log(
			'isOverProjectItem',
			isOverProjectItem,
			'highlightedItems.size',
			highlightedItems.size
		);

		if (!isOverProjectItem || highlightedItems.size === 0) {
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
				closeOpenedItem,
				clearHighlightsForAllItems,
				shouldPermanentlyDeleteHighlightedItems,
				permanentlyDeleteHighlightedItems,
				deleteHighlightedItems
			);
		} else {
			processKeydownEvent(event);
		}
	}}
	oncontextmenu={(event) => handleContextMenu(event, highlightedItems)}
/>

<!-- MARK: List of Projects -->
{#if $projects?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each $projects as item, index (item.id)}
			<li data-id={item.id} class="todo-item relative">
				{#if dragInsertIndex === index}
					<div
						class="absolute -top-1 right-0 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
				{#if dragInsertIndex === $projects.length && index === $projects.length - 1}
					<div
						class="absolute right-0 -bottom-1 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
				<!-- MARK: Individual Project -->

				<div class="project-in-index-item">
					<button
						data-id={item.id}
						data-testid="project-item-button"
						class="w-full rounded-md p-3 text-left transition-colors duration-150 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-gray-800"
						onclick={highlightItem}
						draggable="true"
						ondragstart={(event: DragEvent) => handleDragStart(event, item.id)}
						ondragover={(event: DragEvent) => handleDragOver(event, item.id)}
						ondrop={(event: DragEvent) => handleDrop(event, item.id)}
						ondragend={handleDragEnd}
					>
						<div class="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<!-- MARK: Context Menu -->
{#if contextMenu}
	{@render contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
{/if}
