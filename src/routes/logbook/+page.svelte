<script lang="ts">
	import { db, type Item, type Project } from '$lib/db';
	import { getLoggedTodos, getLoggedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Mixed/DeleteSelected.mixed.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';

	let todos = liveQuery(() => getLoggedTodos());
	let projects = liveQuery(() => getLoggedProjects());

	// Type for unified items with their source table
	type UnifiedItem = (Item | Project) & { itemType: 'todo' | 'project' };

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

<!-- List of Items (Todos and Projects) -->
{#if mergedItems.length > 0}
	<ul class="mt-4 space-y-2">
		{#each mergedItems as item (`${item.itemType}-${item.id}`)}
			<li data-key={`${item.itemType}-${item.id}`} class="logbook-item relative">
				<div class="logbook-item-wrapper">
					<button
						data-key={`${item.itemType}-${item.id}`}
						class="logbook-item-button w-full rounded-md p-3 text-left transition-colors duration-150 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-gray-800"
						onclick={highlightItem}
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
{:else}
	<p class="text-gray-500">No completed items yet.</p>
{/if}

<!-- Context Menu -->
<ContextMenu show={showMenu} x={menuX} y={menuY}>
	<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

	<ClearSelected {clearHighlightsForAllItems} />
</ContextMenu>
