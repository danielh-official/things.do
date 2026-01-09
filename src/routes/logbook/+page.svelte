<script lang="ts">
	import { db, type Item, type Project, type LogStatus } from '$lib/db';
	import { getLoggedTodos, getLoggedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Mixed/DeleteSelected.mixed.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { TagOutline } from 'flowbite-svelte-icons';

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

	// Tags state
	let tagNameById: Record<number, string> = $state({});

	$effect(() => {
		// Load all tag names for items that have tags
		if (!mergedItems) return;

		(async () => {
			const allTagIds = new SvelteSet<number>();
			for (const item of mergedItems) {
				if (item.tag_ids && item.tag_ids.length > 0) {
					for (const tagId of item.tag_ids) {
						allTagIds.add(tagId);
					}
				}
			}

			if (allTagIds.size > 0) {
				const ids = Array.from(allTagIds);
				const rows = await db.tags.bulkGet(ids);
				const mapUpdate: Record<number, string> = {};
				for (const row of rows) {
					if (row) mapUpdate[row.id] = row.name;
				}
				tagNameById = { ...tagNameById, ...mapUpdate };
			}
		})();
	});

	function openItem(event: MouseEvent) {
		clearHighlightsForAllItems();

		const button = event.currentTarget as HTMLButtonElement;
		const itemKey = button.getAttribute('data-key') || '';
		const [itemType, itemId] = itemKey.split('-');

		if (itemType === 'todo') {
			const item = mergedItems.find((i) => i.itemType === 'todo' && i.id === parseInt(itemId, 10));
			openedItem = item || null;
		} else {
			const item = mergedItems.find(
				(i) => i.itemType === 'project' && i.id === parseInt(itemId, 10)
			);
			openedItem = item || null;
		}

		// Update URL with item parameter
		if (openedItem) {
			const url = new URL(window.location.href);
			url.searchParams.set('item', String(openedItem.id));
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(url.pathname + url.search, { replaceState: true, noScroll: true });
		}
	}

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
			if (!isNaN(itemId) && mergedItems.length > 0) {
				const itemToOpen = mergedItems.find((item) => item.id === itemId);
				if (itemToOpen) {
					openedItem = itemToOpen;
				}
			}
		}
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

<!-- List of Items (Todos and Projects) -->
{#if mergedItems.length > 0}
	<ul class="mt-4 space-y-2">
		{#each mergedItems as item (`${item.itemType}-${item.id}`)}
			<li data-key={`${item.itemType}-${item.id}`} class="logbook-item relative">
				<div class="logbook-item-wrapper">
					<div
						class="flex w-full items-center gap-2 rounded-md p-3 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800"
					>
						{#if item.itemType === 'todo'}
							<!-- Todo status indicator -->
							<button
								class="shrink-0 cursor-pointer"
								data-key={`${item.itemType}-${item.id}`}
								onclick={(event: { stopPropagation: () => void }) => {
									event.stopPropagation();
									// Cycle through statuses
									const currentStatus = item.logged_status;
									let newStatus: LogStatus;
									let newLoggedAt: SvelteDate | null;

									if (currentStatus === 'completed') {
										newStatus = 'canceled';
										newLoggedAt = new SvelteDate();
									} else if (currentStatus === 'canceled') {
										newStatus = null;
										newLoggedAt = null;
									} else {
										newStatus = 'completed';
										newLoggedAt = new SvelteDate();
									}

									db.todos.update(item.id!, {
										logged_status: newStatus,
										logged_at: newLoggedAt,
										updated_at: new SvelteDate()
									});
								}}
							>
								{#if item.logged_status === 'completed'}
									<div
										class="grid h-4 w-4 place-items-center border-2 border-blue-500 bg-blue-500 text-white"
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
										class="grid h-4 w-4 place-items-center border-2 border-blue-500 bg-blue-500 text-white"
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
							</button>
						{:else}
							<!-- Project status indicator with larger circle -->
							<button
								class="shrink-0 cursor-pointer"
								data-key={`${item.itemType}-${item.id}`}
								onclick={(event: { stopPropagation: () => void }) => {
									event.stopPropagation();
									// Cycle through project statuses
									const currentStatus = item.logged_status;
									let newStatus: LogStatus;
									let newLoggedAt: SvelteDate | null;

									if (currentStatus === 'completed') {
										newStatus = 'canceled';
										newLoggedAt = new SvelteDate();
									} else if (currentStatus === 'canceled') {
										newStatus = null;
										newLoggedAt = null;
									} else {
										newStatus = 'completed';
										newLoggedAt = new SvelteDate();
									}

									db.projects.update(item.id!, {
										logged_status: newStatus,
										logged_at: newLoggedAt,
										updated_at: new SvelteDate()
									});
								}}
							>
								{#if item.logged_status === 'completed'}
									<div
										class="grid h-5 w-5 place-items-center rounded-full border-2 border-blue-500 bg-blue-500 text-white"
										aria-label="Completed"
									>
										<svg viewBox="0 0 20 20" class="h-3.5 w-3.5" aria-hidden="true">
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
										class="grid h-5 w-5 place-items-center rounded-full border-2 border-blue-500 bg-blue-500 text-white"
										aria-label="Canceled"
									>
										<svg viewBox="0 0 20 20" class="h-3.5 w-3.5" aria-hidden="true">
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
									<div class="h-5 w-5 rounded-full border-2 border-dashed border-gray-400"></div>
								{:else}
									<div class="h-5 w-5 rounded-full border-2 border-gray-400"></div>
								{/if}
							</button>
						{/if}
						<button
							data-key={`${item.itemType}-${item.id}`}
							class="logbook-item-button flex-1 text-left font-medium text-gray-900 dark:text-gray-100 {item.itemType ===
							'project'
								? 'text-base'
								: ''}"
							onclick={highlightItem}
							ondblclick={openItem}
						>
							{item.title}
						</button>
						<!-- MARK: Tags Preview -->
						{#if item.tag_ids && item.tag_ids.length > 0}
							{#each item.tag_ids as tagId (tagId)}
								<span
									class="m-1 inline-block rounded-2xl border px-[.35rem] py-[.15rem] text-[11px] text-gray-400"
								>
									<TagOutline class="inline h-4 w-4" />
									{tagNameById[tagId] ?? 'Loading...'}
								</span>
							{/each}
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-gray-500">No completed items yet.</p>
{/if}

<!-- Context Menu -->
<ContextMenu show={showMenu} x={menuX} y={menuY}>
	<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

	<ClearSelected {clearHighlightsForAllItems} />
</ContextMenu>
