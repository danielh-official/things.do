<script lang="ts">
	import { db, type Item, type Project } from '$lib/db';
	import { getTrashedTodos, getTrashedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import RestoreSelected from '$lib/components/Buttons/Mixed/RestoreSelected.mixed.button.component.svelte';
	import PermanentlyDeleteSelected from '$lib/components/Buttons/Mixed/PermanentlyDeleteSelected.mixed.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';
	import List from '$lib/components/List.Item.component.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { page } from '$app/state';

	let allTodos = liveQuery(() => getTrashedTodos());
	let allProjects = liveQuery(() => getTrashedProjects());
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
				const items = await getTrashedTodos();
				return items.filter((todo: Item) => !todo.tag_ids || todo.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			todos = liveQuery(async () => {
				const items = await getTrashedTodos();
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
				const items = await getTrashedProjects();
				return items.filter((project: Project) => !project.tag_ids || project.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			projects = liveQuery(async () => {
				const items = await getTrashedProjects();
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

		// Sort items based on trashOrder
		const orderMap = new Map(trashOrder.map((o) => [`${o.type}-${o.id}`, o.order]));
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
		// Note: List.Item will clear highlights automatically
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
			// Note: List.Item handles clearing highlights
			return;
		}

		if (event.key === 'Backspace' && highlightedItems.size > 0) {
			permanentlyDeleteHighlightedItems();
			return;
		}
	}
</script>

<svelte:window onkeydown={processKeydownEvent} />

<svelte:head>
	<title>Trash | Things.do</title>
</svelte:head>

<TagFilter bind:availableTags bind:selectedTagIds bind:showNoTagFilter {hasItemsWithoutTags} />

{#if $mergedItems && $mergedItems.length > 0}
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

			($mergedItems || []).forEach(async (item) => {
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

<!-- List of Items (Todos and Projects) using unified component -->
<List items={mergedItems} bind:openedItem {highlightedItems}>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, show, x, y)}
		<ContextMenu {show} {x} {y}>
			<RestoreSelected {highlightedItems} {clearHighlightsForAllItems} />
			<PermanentlyDeleteSelected {highlightedItems} {clearHighlightsForAllItems} />
			<ClearSelected {clearHighlightsForAllItems} />
		</ContextMenu>
	{/snippet}
</List>
