<script lang="ts">
	import { db, type Item, type Project } from '$lib/db';
	import { getLoggedTodos, getLoggedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Mixed/DeleteSelected.mixed.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';
	import List from '$lib/components/List.Item.component.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { page } from '$app/state';

	let allTodos = liveQuery(() => getLoggedTodos());
	let allProjects = liveQuery(() => getLoggedProjects());
	let tags = liveQuery(() => db.tags.toArray());

	let selectedTagIds = $state<number[]>([]);
	let showNoTagFilter = $state(false);

	// Collect tags used by current items and check if there are items without tags
	let availableTags = $derived.by(() => {
		if (!$allTodos || !$allProjects || !$tags) return [];

		const usedTagIds = new SvelteSet<number>();
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

		return $tags
			.filter((tag) => usedTagIds.has(tag.id))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	let hasItemsWithoutTags = $derived.by(() => {
		if (!$allTodos || !$allProjects) return false;
		return (
			$allTodos.some((todo) => !todo.tag_ids || todo.tag_ids.length === 0) ||
			$allProjects.some((project) => !project.tag_ids || project.tag_ids.length === 0)
		);
	});

	// Filter items based on selected tags - using $effect to create filtered liveQuery
	let todos = $state(allTodos);
	let projects = $state(allProjects);

	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			todos = allTodos;
		} else if (showNoTagFilter) {
			// Show only items without tags
			todos = liveQuery(async () => {
				const items = await getLoggedTodos();
				return items.filter((todo: Item) => !todo.tag_ids || todo.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			todos = liveQuery(async () => {
				const items = await getLoggedTodos();
				return items.filter(
					(todo: Item) => todo.tag_ids && filterIds.every((tagId) => todo.tag_ids.includes(tagId))
				);
			});
		}
	});

	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			projects = allProjects;
		} else if (showNoTagFilter) {
			// Show only items without tags
			projects = liveQuery(async () => {
				const items = await getLoggedProjects();
				return items.filter((project: Project) => !project.tag_ids || project.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			projects = liveQuery(async () => {
				const items = await getLoggedProjects();
				return items.filter(
					(project: Project) =>
						project.tag_ids && filterIds.every((tagId) => project.tag_ids.includes(tagId))
				);
			});
		}
	});

	// Type for unified items with their source table
	type UnifiedItem = (Item | Project) & { itemType: 'todo' | 'project' };

	// State for opened item
	let openedItem = $state<UnifiedItem | null>(null);

	// State for managing cross-table order
	let logbookOrder = $state<{ id: number; type: 'todo' | 'project'; order: number }[]>([]);

	// Helper function to save logbook order to localStorage
	function saveLogbookOrder() {
		if (browser) {
			localStorage.setItem('logbookOrder', JSON.stringify(logbookOrder));
		}
	}

	// Load or initialize logbook order from localStorage
	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('logbookOrder');
			if (stored) {
				logbookOrder = JSON.parse(stored);
			}
		}
	});

	// Update logbookOrder when items change
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
		if (logbookOrder.length === 0 && allItems.length > 0) {
			logbookOrder = allItems.map((item, idx) => ({
				id: item.id!,
				type: item.itemType,
				order: idx
			}));
			saveLogbookOrder();
			return;
		}

		// Remove items from logbookOrder that no longer exist
		const existingIds = new Set(allItems.map((item) => `${item.itemType}-${item.id}`));
		const filteredOrder = logbookOrder.filter((orderItem) =>
			existingIds.has(`${orderItem.type}-${orderItem.id}`)
		);

		// Add new items to logbookOrder
		const orderedIds = new Set(filteredOrder.map((o) => `${o.type}-${o.id}`));
		const newItems: typeof logbookOrder = [];
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

		if (filteredOrder.length !== logbookOrder.length || newItems.length > 0) {
			logbookOrder = [...filteredOrder, ...newItems];
			saveLogbookOrder();
		}
	});

	// Merge and sort items based on cross-table order - convert to Observable for List.Item component
	let mergedItems = liveQuery(async () => {
		const todoItems: UnifiedItem[] = ($todos || []).map((t) => ({
			...t,
			itemType: 'todo' as const
		}));
		const projectItems: UnifiedItem[] = ($projects || []).map((p) => ({
			...p,
			itemType: 'project' as const
		}));

		const allItems = [...todoItems, ...projectItems];

		// Sort items based on logbookOrder
		const orderMap = new Map(logbookOrder.map((o) => [`${o.type}-${o.id}`, o.order]));
		return allItems.sort((a, b) => {
			const aOrder = orderMap.get(`${a.itemType}-${a.id}`) ?? Infinity;
			const bOrder = orderMap.get(`${b.itemType}-${b.id}`) ?? Infinity;
			return aOrder - bOrder;
		});
	});

	$effect(() => {
		// Check if URL has an item parameter and open that item
		const itemIdParam = page.url.searchParams.get('item');
		if (itemIdParam) {
			const itemId = parseInt(itemIdParam, 10);
			if (!isNaN(itemId) && $mergedItems && $mergedItems.length > 0) {
				const itemToOpen = $mergedItems.find((item) => item.id === itemId);
				if (itemToOpen) {
					openedItem = itemToOpen;
				}
			}
		}
	});

	let highlightedItems = new SvelteSet<string>(); // Use 'type-id' as key

	function clearHighlightsForAllItems() {
		highlightedItems.clear();
	}

	// Helper functions for keyboard shortcuts
	async function deleteHighlightedItems() {
		for (const itemKey of highlightedItems) {
			const [type, idStr] = itemKey.split('-');
			const id = parseInt(idStr, 10);
			if (type === 'todo') {
				await db.todos.update(id, { deleted_at: new SvelteDate() });
			} else if (type === 'project') {
				await db.projects.update(id, { deleted_at: new SvelteDate() });
			}
		}
		clearHighlightsForAllItems();
	}

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = ($mergedItems || []).filter((item) =>
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
			deleteHighlightedItems();
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
				(el.classList.contains('logbook-item-button') || el.classList.contains('logbook-item'))
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
	<title>Logbook | Things.do</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Logbook</h1>

<TagFilter bind:availableTags bind:selectedTagIds bind:showNoTagFilter {hasItemsWithoutTags} />

<!-- List of Items (Todos and Projects) using unified component -->
<List items={mergedItems} bind:openedItem {highlightedItems} />

{#if $mergedItems && $mergedItems.length === 0}
	<p class="mt-4 text-gray-500">No completed items yet.</p>
{/if}

<!-- Context Menu -->
<ContextMenu show={showMenu} x={menuX} y={menuY}>
	<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

	<ClearSelected {clearHighlightsForAllItems} />
</ContextMenu>
