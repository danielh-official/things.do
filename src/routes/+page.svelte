<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { onMount } from 'svelte';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import MultiselectOptionBox from '$lib/components/MultiselectOptionBox.svelte';
	import ItemInputBox from '$lib/components/ItemInputBox.svelte';
	import { getFocusingTasks } from '$lib';

	let items = $state<Item[]>([]);

	onMount(async () => {
		window.addEventListener('keydown', processKeydownEvent);

		await updateItemsState();
	});

	async function updateItemsState() {
		items = await getFocusingTasks();
	}

	async function addItem(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item) {
			db.items.add({
				things_id: null,
				title: item,
				notes: '',
				start_date: null,
				deadline: null,
				start: null,
				tags: [],
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				blocked_by: [],
				evening: false,
				checklist: [],
				logged_at: null,
				logged_status: null,
				order: items.length > 0 ? Math.max(...items.map((t) => t.order)) + 1 : 1,
				deleted_at: null,
				type: 'task',
				later: false,
				parent_id: null,
				parent_things_id: null
			});

			input.value = '';

			updateItemsState();
		}
	}

	let openedItem: Item | null = $state(null);

	function openItem(event: MouseEvent) {
		clearHighlightsForAllItems();

		const li = event.currentTarget as HTMLLIElement;

		openedItem =
			items.filter((item: Item) => item.id === parseInt(li.getAttribute('data-id') || '', 10))[0] ||
			null;
	}

	function closeOpenedItem() {
		openedItem = null;
	}

	let addingNewItem = $state(false);

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.code === 'Enter' && addingNewItem) {
			addItem(event);
			return;
		}

		if (event.code === 'Space' && !openedItem && !addingNewItem) {
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

		if (event.key === 'Backspace' && highlightedItems.size > 0) {
			deleteHighlightedItems();
			return;
		}
	}

	async function deleteHighlightedItems() {
		if (
			!confirm(
				`Are you sure you want to delete ${highlightedItems.size} selected item(s)? This action cannot be undone.`
			)
		) {
			return;
		}

		highlightedItems.forEach(async (itemId) => {
			await db.items.update(itemId, { deleted_at: new SvelteDate() });
		});
		updateItemsState();
		clearHighlightsForAllItems();
	}

	let highlightedItems = $state<Set<number>>(new Set());
	let draggingItemId = $state<number | null>(null);

	function highlightItem(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const itemId = parseInt(button.getAttribute('data-id') || '', 10);
		const newHighlightedItems = new SvelteSet(highlightedItems);

		if (newHighlightedItems.has(itemId)) {
			newHighlightedItems.delete(itemId);
			button.classList.add('bg-white');
			button.classList.add('hover:bg-gray-50');
			button.classList.remove('bg-blue-200');
			button.classList.remove('hover:bg-blue-300');
		} else {
			newHighlightedItems.add(itemId);
			button.classList.remove('bg-white');
			button.classList.remove('hover:bg-gray-50');
			button.classList.add('bg-blue-200');
			button.classList.add('hover:bg-blue-300');
		}

		highlightedItems = newHighlightedItems;
	}

	function handleDragStart(event: DragEvent, itemId: number) {
		draggingItemId = itemId;
		event.dataTransfer?.setData('text/plain', String(itemId));
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	async function handleDrop(event: DragEvent, targetItemId: number) {
		event.preventDefault();

		const sourceId =
			draggingItemId ?? parseInt(event.dataTransfer?.getData('text/plain') || '', 10);
		if (!sourceId || sourceId === targetItemId) {
			resetDragState();
			return;
		}

		const currentItems = [...items];
		const fromIndex = currentItems.findIndex((item) => item.id === sourceId);
		const toIndex = currentItems.findIndex((item) => item.id === targetItemId);

		if (fromIndex === -1 || toIndex === -1) {
			resetDragState();
			return;
		}

		const [movedItem] = currentItems.splice(fromIndex, 1);
		currentItems.splice(toIndex, 0, movedItem);

		items = currentItems;

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
	}

	function clearHighlightsForAllItems() {
		highlightedItems = new SvelteSet();

		items.forEach((item: Item) => {
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

	function loggedStatusChanged() {
		updateItemsState();
	}
</script>

<svelte:head>
	<title>Focus | Things.do</title>
</svelte:head>

<ItemInputBox bind:addingNewItem />
{#if items?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each items as item (item.id)}
			<ItemComponent
				{item}
				bind:openedItem
				{openItem}
				{highlightItem}
				handleDragStart={(event: DragEvent) => handleDragStart(event, item.id!)}
				handleDragOver={(event: DragEvent) => handleDragOver(event)}
				handleDrop={(event: DragEvent) => handleDrop(event, item.id!)}
				{handleDragEnd}
				{loggedStatusChanged}
			/>
		{/each}
	</ul>
{/if}
<MultiselectOptionBox {highlightedItems} {deleteHighlightedItems} {clearHighlightsForAllItems} />
