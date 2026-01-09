<script lang="ts">
	import { db, type Item, type Project } from '$lib/db';
	import { getTrashedTodos, getTrashedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import RestoreSelected from '$lib/components/Buttons/Mixed/RestoreSelected.mixed.button.component.svelte';
	import PermanentlyDeleteSelected from '$lib/components/Buttons/Mixed/PermanentlyDeleteSelected.mixed.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';

	let allTodos = liveQuery(() => getTrashedTodos());
	let allProjects = liveQuery(() => getTrashedProjects());
	let tags = liveQuery(() => db.tags.toArray());

	let selectedTagIds = $state<number[]>([]);

	// Collect tags used by current items
	let availableTags = $derived.by(() => {
		if (!$allTodos || !$allProjects || !$tags) return [];
		
		const usedTagIds = new Set<number>();
		for (const todo of $allTodos) {
			if (todo.tag_ids) {
				for (const tagId of todo.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}
		for (const project of $allProjects) {
			if (project.tag_ids) {
				for (const tagId of project.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}
		
		return $tags.filter(tag => usedTagIds.has(tag.id)).sort((a, b) => a.name.localeCompare(b.name));
	});

	// Filter items based on selected tags - using $effect to create filtered liveQuery
	let todos = $state(allTodos);
	let projects = $state(allProjects);
	
	$effect(() => {
		if (selectedTagIds.length === 0) {
			todos = allTodos;
		} else {
			// Create a new liveQuery that depends on the current filter
			const filterIds = [...selectedTagIds];
			todos = liveQuery(async () => {
				const items = await getTrashedTodos();
				return items.filter((todo: Item) => 
					todo.tag_ids && filterIds.some(tagId => todo.tag_ids.includes(tagId))
				);
			});
		}
	});
	
	$effect(() => {
		if (selectedTagIds.length === 0) {
			projects = allProjects;
		} else {
			// Create a new liveQuery that depends on the current filter
			const filterIds = [...selectedTagIds];
			projects = liveQuery(async () => {
				const items = await getTrashedProjects();
				return items.filter((project: Project) => 
					project.tag_ids && filterIds.some(tagId => project.tag_ids.includes(tagId))
				);
			});
		}
	});

	// Type for unified items with their source table
	type UnifiedItem = (Item | Project) & { itemType: 'todo' | 'project' };

	// State for managing cross-table order
	let trashOrder = $state<{ id: number; type: 'todo' | 'project'; order: number }[]>([]);

	// Helper function to save trash order to localStorage
	function saveTrashOrder() {
		if (browser) {
			localStorage.setItem('trashOrder', JSON.stringify(trashOrder));
		}
	}

	// Load or initialize trash order from localStorage
	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('trashOrder');
			if (stored) {
				trashOrder = JSON.parse(stored);
			}
		}
	});

	// Update trashOrder when items change
	$effect(() => {
		const todoItems: UnifiedItem[] = ($todos || []).map((t) => ({
			...t,
			itemType: 'todo' as const
		}));
		const projectItems: UnifiedItem[] = ($projects || []).map((p) => ({
			...p,
			itemType: 'project' as const
		}));

		const allItems = [...todoItems, ...projectItems];

		// If no custom order exists, initialize it with current items
		if (trashOrder.length === 0 && allItems.length > 0) {
			trashOrder = allItems.map((item, idx) => ({
				id: item.id!,
				type: item.itemType,
				order: idx
			}));
			saveTrashOrder();
			return;
		}

		// Remove items from trashOrder that no longer exist
		const existingIds = new Set(allItems.map((item) => `${item.itemType}-${item.id}`));
		const filteredOrder = trashOrder.filter((orderItem) =>
			existingIds.has(`${orderItem.type}-${orderItem.id}`)
		);

		// Add new items to trashOrder
		const orderedIds = new Set(filteredOrder.map((o) => `${o.type}-${o.id}`));
		const newItems: typeof trashOrder = [];
		allItems.forEach((item) => {
			const key = `${item.itemType}-${item.id}`;
			if (!orderedIds.has(key)) {
				newItems.push({
					id: item.id!,
					type: item.itemType,
					order: filteredOrder.length + newItems.length
				});
			}
		});

		if (filteredOrder.length !== trashOrder.length || newItems.length > 0) {
			trashOrder = [...filteredOrder, ...newItems];
			saveTrashOrder();
		}
	});

	// Merge and sort items based on cross-table order
	let mergedItems = $derived.by(() => {
		const todoItems: UnifiedItem[] = ($todos || []).map((t) => ({
			...t,
			itemType: 'todo' as const
		}));
		const projectItems: UnifiedItem[] = ($projects || []).map((p) => ({
			...p,
			itemType: 'project' as const
		}));

		const allItems = [...todoItems, ...projectItems];

		// Sort items based on trashOrder
		const orderMap = new Map(trashOrder.map((o) => [`${o.type}-${o.id}`, o.order]));
		return allItems.sort((a, b) => {
			const aOrder = orderMap.get(`${a.itemType}-${a.id}`) ?? Infinity;
			const bOrder = orderMap.get(`${b.itemType}-${b.id}`) ?? Infinity;
			return aOrder - bOrder;
		});
	});

	let highlightedItems = new SvelteSet<string>(); // Use 'type-id' as key

	function highlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemKey = button.getAttribute('data-key') || '';

		if (event.shiftKey) {
			alsoToggleHighlightForAllPreviousItems(itemKey);
			return;
		}

		if (highlightedItems.has(itemKey)) {
			highlightedItems.delete(itemKey);
			button.classList.remove('highlighted');
		} else {
			highlightedItems.add(itemKey);
			button.classList.add('highlighted');
		}
	}

	function alsoToggleHighlightForAllPreviousItems(itemKey: string) {
		for (const item of mergedItems) {
			const key = `${item.itemType}-${item.id}`;
			if (!highlightedItems.has(key)) {
				highlightedItems.add(key);
				const button = document.querySelector(`button[data-key='${key}']`) as HTMLButtonElement;
				if (button) {
					button.classList.add('highlighted');
				}
			}

			if (key === itemKey) {
				break;
			}
		}
	}

	function clearHighlightsForAllItems() {
		mergedItems.forEach((item) => {
			const key = `${item.itemType}-${item.id}`;
			const button = document.querySelector(`button[data-key='${key}']`) as HTMLButtonElement;
			if (button) {
				button.classList.remove('highlighted');
			}
		});
		highlightedItems.clear();
	}

	// Helper functions for keyboard shortcuts
	async function permanentlyDeleteHighlightedItems() {
		if (
			!confirm(
				'Are you sure you want to permanently delete the selected items? This action cannot be undone.'
			)
		) {
			return;
		}

		for (const itemKey of highlightedItems) {
			const [type, idStr] = itemKey.split('-');
			const id = parseInt(idStr, 10);
			if (type === 'todo') {
				await db.todos.delete(id);
			} else if (type === 'project') {
				await db.projects.delete(id);
			}
		}
		clearHighlightsForAllItems();
	}

	let draggingItemKey: string | null = $state(null);
	let dragInsertIndex: number | null = $state(null);

	function handleDragStart(event: DragEvent, itemKey: string) {
		draggingItemKey = itemKey;
		if (event.dataTransfer) {
			event.dataTransfer.setData('application/x-trash-item', itemKey);
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(event: DragEvent, targetItemKey?: string) {
		if (!event.dataTransfer?.types.includes('application/x-trash-item')) {
			dragInsertIndex = null;
			return;
		}

		event.preventDefault();
		const el = event.currentTarget as HTMLElement;
		let targetKey = targetItemKey;
		if (targetKey == null) {
			const keyAttr = el.getAttribute('data-key');
			if (!keyAttr) {
				dragInsertIndex = null;
				return;
			}
			targetKey = keyAttr;
		}

		const isGroupMove =
			draggingItemKey != null && highlightedItems.size > 0 && highlightedItems.has(draggingItemKey);
		if (isGroupMove && highlightedItems.has(targetKey)) {
			dragInsertIndex = null;
			return;
		}

		const rect = el.getBoundingClientRect();
		const dropAfter = event.clientY > rect.top + rect.height / 2;

		const idx = mergedItems.findIndex((i) => `${i.itemType}-${i.id}` === targetKey);
		if (idx === -1) {
			dragInsertIndex = null;
			return;
		}

		dragInsertIndex = idx + (dropAfter ? 1 : 0);
	}

	async function handleDrop(event: DragEvent, targetItemKey: string) {
		if (!event.dataTransfer?.types.includes('application/x-trash-item')) {
			resetDragState();
			return;
		}

		event.preventDefault();

		const sourceKey =
			draggingItemKey ?? (event.dataTransfer?.getData('application/x-trash-item') || '');
		if (!sourceKey) {
			resetDragState();
			return;
		}

		const isGroupMove = highlightedItems.size > 0 && highlightedItems.has(sourceKey);
		const groupKeys: string[] = isGroupMove
			? mergedItems
					.filter((i) => highlightedItems.has(`${i.itemType}-${i.id}`))
					.map((i) => `${i.itemType}-${i.id}`)
			: [sourceKey];

		if (groupKeys.includes(targetItemKey)) {
			resetDragState();
			return;
		}

		const currentOrder = [...trashOrder];

		// Remove items being moved
		const movedItems: typeof trashOrder = [];
		for (const key of groupKeys) {
			const idx = currentOrder.findIndex((item) => `${item.type}-${item.id}` === key);
			if (idx !== -1) {
				const [mi] = currentOrder.splice(idx, 1);
				movedItems.push(mi);
			}
		}

		// Determine insertion position
		const el = event.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const dropAfter = event.clientY > rect.top + rect.height / 2;

		let insertionIndex = currentOrder.findIndex(
			(item) => `${item.type}-${item.id}` === targetItemKey
		);
		if (insertionIndex === -1) {
			resetDragState();
			return;
		}
		if (dropAfter) insertionIndex += 1;

		currentOrder.splice(insertionIndex, 0, ...movedItems);

		// Update order values
		currentOrder.forEach((item, idx) => {
			item.order = idx;
		});

		trashOrder = currentOrder;
		saveTrashOrder();

		resetDragState();
	}

	function handleDragEnd() {
		resetDragState();
	}

	function resetDragState() {
		draggingItemKey = null;
		dragInsertIndex = null;
	}

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = mergedItems.filter((item) =>
				highlightedItems.has(`${item.itemType}-${item.id}`)
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

		if (event.key === 'Backspace' && highlightedItems.size > 0) {
			permanentlyDeleteHighlightedItems();
			return;
		}
	}

	let showMenu = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);

	function handleContextMenu(event: MouseEvent) {
		const path = event.composedPath() as HTMLElement[];
		const isOverItem = path.some(
			(el) =>
				el.classList &&
				(el.classList.contains('trash-item-button') || el.classList.contains('trash-item'))
		);

		if (!isOverItem || highlightedItems.size === 0) {
			return;
		}

		event.preventDefault();

		showMenu = false;

		menuX = event.clientX;
		menuY = event.clientY - 150;

		showMenu = true;
	}
</script>

<svelte:window onkeydown={processKeydownEvent} oncontextmenu={handleContextMenu} />

<svelte:head>
	<title>Trash | Things.do</title>
</svelte:head>

<TagFilter bind:availableTags bind:selectedTagIds />

{#if mergedItems.length > 0}
	<button
		class="mt-4 cursor-pointer rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
		onclick={() => {
			if (
				!confirm(
					'Are you sure you want to permanently delete all items in the trash? This action cannot be undone.'
				)
			) {
				return;
			}

			mergedItems.forEach(async (item) => {
				if (item.itemType === 'todo') {
					await db.todos.delete(item.id!);
				} else {
					await db.projects.delete(item.id!);
				}
			});

			// Clear trash order
			trashOrder = [];
			saveTrashOrder();
		}}>Empty Trash</button
	>
{/if}

<!-- List of Items (Todos and Projects) -->
{#if mergedItems.length > 0}
	<ul class="mt-4 space-y-2">
		{#each mergedItems as item, index (`${item.itemType}-${item.id}`)}
			<li data-key={`${item.itemType}-${item.id}`} class="trash-item relative">
				{#if dragInsertIndex === index}
					<div
						class="absolute -top-1 right-0 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}
				{#if dragInsertIndex === mergedItems.length && index === mergedItems.length - 1}
					<div
						class="absolute right-0 -bottom-1 left-0 h-0.5 bg-blue-500 shadow-lg"
						style="z-index: 50;"
					></div>
				{/if}

				<div class="trash-item-wrapper">
					<button
						data-key={`${item.itemType}-${item.id}`}
						class="trash-item-button w-full rounded-md p-3 text-left transition-colors duration-150 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-gray-800"
						onclick={highlightItem}
						draggable="true"
						ondragstart={(event: DragEvent) =>
							handleDragStart(event, `${item.itemType}-${item.id}`)}
						ondragover={(event: DragEvent) => handleDragOver(event, `${item.itemType}-${item.id}`)}
						ondrop={(event: DragEvent) => handleDrop(event, `${item.itemType}-${item.id}`)}
						ondragend={handleDragEnd}
					>
						<div class="flex items-center gap-2">
							{#if item.itemType === 'todo'}
								<!-- Todo status indicator -->
								<div class="shrink-0">
									{#if item.logged_status === 'completed'}
										<div
											class="grid h-4 w-4 place-items-center border-2 border-blue-500 bg-blue-500"
											aria-label="Completed"
										>
											<svg viewBox="0 0 20 20" class="h-3 w-3" aria-hidden="true">
												<path
													d="M5 10l3 3 7-7"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
										</div>
									{:else if item.logged_status === 'canceled'}
										<div
											class="grid h-4 w-4 place-items-center border-2 border-blue-500 bg-blue-500"
											aria-label="Canceled"
										>
											<svg viewBox="0 0 20 20" class="h-3 w-3" aria-hidden="true">
												<path
													d="M5 5l10 10M15 5l-10 10"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
												/>
											</svg>
										</div>
									{:else if item.start === 'someday'}
										<div class="h-4 w-4 border-2 border-dashed border-gray-400"></div>
									{:else}
										<div class="h-4 w-4 border-2 border-gray-400"></div>
									{/if}
								</div>
							{:else}
								<!-- Project icon -->
								<span class="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
									📁
								</span>
							{/if}
							<div class="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
						</div>
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<!-- Context Menu -->
<ContextMenu show={showMenu} x={menuX} y={menuY}>
	<RestoreSelected {highlightedItems} {clearHighlightsForAllItems} />

	<PermanentlyDeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

	<ClearSelected {clearHighlightsForAllItems} />
</ContextMenu>
