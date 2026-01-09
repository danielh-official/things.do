<script lang="ts">
	import Todo from '$lib/components/Todo.component.svelte';
	import { cleanupTags } from '$lib';
	import { onMount, type Snippet } from 'svelte';
	import { db, type Item, type Project, type Tag, type LogStatus } from '$lib/db';
	import type { Observable } from 'dexie';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { TagOutline } from 'flowbite-svelte-icons';

	// Define a unified type for items (todos and projects)
	type UnifiedItem = (Item | Project) & { itemType: 'todo' | 'project' };

	let {
		items = $bindable(),
		tags = $bindable(),
		openedItem = $bindable(null),
		highlightedItems = $bindable(new SvelteSet<string>()),
		shouldPermanentlyDeleteHighlightedItemsOnEscape:
			shouldPermanentlyDeleteHighlightedItems = false,
		customKeydownBehavior,
		contextMenu
	}: {
		items: Observable<UnifiedItem[]>;
		tags?: Observable<Tag[]>;
		openedItem: UnifiedItem | null;
		highlightedItems: SvelteSet<string>;
		shouldPermanentlyDeleteHighlightedItemsOnEscape?: boolean;
		customKeydownBehavior?: (
			event: KeyboardEvent,
			highlightedItems: SvelteSet<string>,
			openedItem: UnifiedItem | null,
			closeOpenedItem: () => void,
			clearHighlightsForAllItems: () => void,
			shouldPermanentlyDeleteHighlightedItems: boolean,
			permanentlyDeleteHighlightedItems: () => void,
			deleteHighlightedItems: () => void
		) => void;
		contextMenu?: Snippet<
			[
				highlightedItems: SvelteSet<string>,
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
				const subscription = items.subscribe((itemsList) => {
					if (itemsList && itemsList.length > 0) {
						const itemToOpen = itemsList.find((item: UnifiedItem) => item.id === itemId);
						if (itemToOpen) {
							openedItem = itemToOpen;
						}
						subscription.unsubscribe();
					}
				});
			}
		}
	});

	function getItemKey(item: UnifiedItem): string {
		return `${item.itemType}-${item.id}`;
	}

	function alsoToggleHighlightForAllPreviousItems(itemKey: string) {
		const itemsArray = $items;
		const currentIndex = itemsArray.findIndex((item) => getItemKey(item) === itemKey);
		if (currentIndex === -1) return;

		const lastHighlightedIndex = itemsArray.findIndex((item) =>
			highlightedItems.has(getItemKey(item))
		);

		if (lastHighlightedIndex === -1) {
			highlightedItems.add(itemKey);
			return;
		}

		const start = Math.min(lastHighlightedIndex, currentIndex);
		const end = Math.max(lastHighlightedIndex, currentIndex);

		for (let i = start; i <= end; i++) {
			highlightedItems.add(getItemKey(itemsArray[i]));
		}
	}

	function toggleHighlight(itemKey: string) {
		if (highlightedItems.has(itemKey)) {
			highlightedItems.delete(itemKey);
		} else {
			highlightedItems.add(itemKey);
		}
	}

	function clearHighlightsForAllItems() {
		highlightedItems.clear();
	}

	function openItem(event: MouseEvent) {
		clearHighlightsForAllItems();

		const button = event.currentTarget as HTMLButtonElement;
		const itemKey = button.getAttribute('data-key') || '';
		const [itemType, itemIdStr] = itemKey.split('-');

		const item =
			$items.find(
				(item: UnifiedItem) => item.itemType === itemType && item.id === parseInt(itemIdStr, 10)
			) || null;

		openedItem = item;

		// Update URL with item parameter
		if (item) {
			const url = new URL(window.location.href);
			url.searchParams.set('item', String(item.id));
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(url.pathname + url.search, { replaceState: true, noScroll: true });
		}
	}

	function highlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemKey = button.getAttribute('data-key') || '';

		if (event.shiftKey) {
			alsoToggleHighlightForAllPreviousItems(itemKey);
		} else if (event.metaKey || event.ctrlKey) {
			toggleHighlight(itemKey);
		} else {
			clearHighlightsForAllItems();
			highlightedItems.add(itemKey);
		}
	}

	function oneWayHighlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemKey = button.getAttribute('data-key') || '';

		if (!highlightedItems.has(itemKey)) {
			clearHighlightsForAllItems();
			highlightedItems.add(itemKey);
		}
	}

	function closeOpenedItem() {
		openedItem = null;
		const url = new URL(window.location.href);
		url.searchParams.delete('item');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url.pathname + url.search, { replaceState: true, noScroll: true });
	}

	// Tags state
	let tagNameById: Record<number, string> = $state({});

	$effect(() => {
		// Load all tag names for items that have tags
		const itemsList = $items;
		if (!itemsList || !Array.isArray(itemsList)) return;

		(async () => {
			const allTagIds = new SvelteSet<number>();
			for (const item of itemsList) {
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

	// MARK: Drag & Drop

	let draggingItemKey: string | null = $state(null);
	let dragInsertIndex: number | null = $state(null);

	function handleDragStart(event: DragEvent, itemKey: string) {
		draggingItemKey = itemKey;
		event.dataTransfer!.effectAllowed = 'move';
		event.dataTransfer!.setData('application/x-item', itemKey);
	}

	function handleDragOver(event: DragEvent, targetItemKey: string) {
		if (!event.dataTransfer?.types.includes('application/x-item')) {
			dragInsertIndex = null;
			return;
		}

		event.preventDefault();
		event.dataTransfer!.dropEffect = 'move';

		const el = (event.currentTarget as HTMLElement).closest('.unified-item');
		if (!el) {
			dragInsertIndex = null;
			return;
		}

		const rect = el.getBoundingClientRect();
		const dropAfter = event.clientY > rect.top + rect.height / 2;

		const idx = $items.findIndex((item) => getItemKey(item) === targetItemKey);
		if (idx === -1) {
			dragInsertIndex = null;
			return;
		}

		dragInsertIndex = idx + (dropAfter ? 1 : 0);
	}

	async function handleDrop(event: DragEvent, targetItemKey: string) {
		if (!event.dataTransfer?.types.includes('application/x-item')) {
			resetDragState();
			return;
		}

		event.preventDefault();

		const sourceKey = draggingItemKey ?? (event.dataTransfer?.getData('application/x-item') || '');
		if (!sourceKey) {
			resetDragState();
			return;
		}

		const isGroupMove = highlightedItems.size > 0 && highlightedItems.has(sourceKey);
		const groupKeys: string[] = isGroupMove
			? $items
					.filter((item) => highlightedItems.has(getItemKey(item)))
					.map((item) => getItemKey(item))
			: [sourceKey];

		if (groupKeys.includes(targetItemKey)) {
			resetDragState();
			return;
		}

		// This would require custom order management - for now, just reset
		resetDragState();
	}

	function handleDragEnd() {
		resetDragState();
	}

	function resetDragState() {
		draggingItemKey = null;
		dragInsertIndex = null;
	}

	async function deleteHighlightedItems() {
		for (const itemKey of highlightedItems) {
			const [itemType, itemIdStr] = itemKey.split('-');
			const itemId = parseInt(itemIdStr, 10);

			if (itemType === 'todo') {
				await db.todos.update(itemId, { deleted_at: new SvelteDate() });
			} else if (itemType === 'project') {
				await db.projects.update(itemId, { deleted_at: new SvelteDate() });
			}
		}
		clearHighlightsForAllItems();
	}

	async function permanentlyDeleteHighlightedItems() {
		for (const itemKey of highlightedItems) {
			const [itemType, itemIdStr] = itemKey.split('-');
			const itemId = parseInt(itemIdStr, 10);

			if (itemType === 'todo') {
				await db.todos.delete(itemId);
			} else if (itemType === 'project') {
				await db.projects.delete(itemId);
			}
		}
		clearHighlightsForAllItems();
	}

	// MARK: Keydown Handling

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = $items.filter((item: UnifiedItem) =>
				highlightedItems.has(getItemKey(item))
			);
			if (selectedItems.length > 0 && navigator.clipboard?.writeText) {
				const markdown = selectedItems.map((item) => `- ${item.title}`).join('\n');
				navigator.clipboard.writeText(markdown);
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

		if (event.key === 'Backspace' && highlightedItems.size > 0 && !openedItem) {
			if (shouldPermanentlyDeleteHighlightedItems) {
				permanentlyDeleteHighlightedItems();
			} else {
				deleteHighlightedItems();
			}
			return;
		}

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
		}
	}

	let showMenu = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);

	function handleContextMenu(event: MouseEvent, items: SvelteSet<string>) {
		const path = event.composedPath() as HTMLElement[];
		const isOverItem = path.some(
			(el) =>
				el.classList &&
				(el.classList.contains('item-button') || el.classList.contains('unified-item'))
		);

		if (!isOverItem || items.size === 0) {
			return;
		}

		event.preventDefault();

		showMenu = false;

		menuX = event.clientX;
		menuY = event.clientY - 150;

		showMenu = true;
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.target instanceof HTMLElement) {
			const isInput =
				event.target.tagName === 'INPUT' ||
				event.target.tagName === 'TEXTAREA' ||
				event.target.contentEditable === 'true';

			if (!isInput) {
				processKeydownEvent(event);
			}
		} else {
			processKeydownEvent(event);
		}
	}}
	oncontextmenu={(event) => handleContextMenu(event, highlightedItems)}
/>

<!-- MARK: List of Items -->
{#if $items?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each $items as item, index (getItemKey(item))}
			<li data-key={getItemKey(item)} class="unified-item relative">
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

				<!-- MARK: Individual Item -->
				{#if item.itemType === 'todo'}
					<!-- Render Todo using the Todo component -->
					<Todo
						item={item as Item}
						openedItem={openedItem as Item | null}
						{openItem}
						{highlightItem}
						handleDragStart={(event: DragEvent) => handleDragStart(event, getItemKey(item))}
						handleDragOver={(event: DragEvent) => handleDragOver(event, getItemKey(item))}
						handleDrop={(event: DragEvent) => handleDrop(event, getItemKey(item))}
						{handleDragEnd}
						tags={$tags || []}
						{oneWayHighlightItem}
						hideParent={true}
					/>
				{:else}
					<!-- Render Project inline (simplified) -->
					<div
						class="flex items-center"
						role="button"
						tabindex="0"
						draggable="true"
						ondragstart={(event: DragEvent) => handleDragStart(event, getItemKey(item))}
						ondragover={(event: DragEvent) => handleDragOver(event, getItemKey(item))}
						ondrop={(event: DragEvent) => handleDrop(event, getItemKey(item))}
						ondragend={handleDragEnd}
					>
						<!-- Status indicator -->
						<button
							class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center text-white"
							onclick={async (event: MouseEvent) => {
								event.stopPropagation();
								const currentStatus: LogStatus = item.logged_status as LogStatus;
								let newStatus: LogStatus;
								let newLoggedAt: SvelteDate | null;

								if (!currentStatus) {
									newStatus = 'completed';
									newLoggedAt = new SvelteDate();
								} else if (currentStatus === 'completed') {
									newStatus = 'canceled';
									newLoggedAt = new SvelteDate();
								} else {
									newStatus = null;
									newLoggedAt = null;
								}

								await db.projects.update(item.id!, {
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

						<!-- Title button -->
						<button
							data-key={getItemKey(item)}
							class="item-button flex w-full cursor-pointer justify-between rounded p-2 text-left"
							ondblclick={openItem}
							onclick={highlightItem}
							oncontextmenu={oneWayHighlightItem}
						>
							<div class="flex items-center gap-2">
								<div class="flex flex-col">
									<span class="font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
								</div>
							</div>
							<!-- MARK: Tags Preview -->
							{#if item.tag_ids && item.tag_ids.length > 0}
								<div class="flex items-center gap-1">
									{#each item.tag_ids as tagId (tagId)}
										<span
											class="m-1 inline-block rounded-2xl border px-[.35rem] py-[.15rem] text-[11px] text-gray-400"
										>
											<TagOutline class="inline h-4 w-4" />
											{tagNameById[tagId] ?? 'Loading...'}
										</span>
									{/each}
								</div>
							{/if}
						</button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<!-- MARK: Context Menu -->
{#if contextMenu}
	{@render contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
{/if}
