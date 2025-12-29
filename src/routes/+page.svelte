<script lang="ts">
	import { db, type Item } from '$lib/db';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBoxComponent.svelte';
	import ItemInputBox from '$lib/components/ItemInputBoxComponent.svelte';
	import { getFocusingItems } from '$lib';
	import { liveQuery } from 'dexie';
	import useDragAndDrop from '$lib/item.dragndrop.svelte';

	let items = liveQuery(() => getFocusingItems());

	let tags = liveQuery(() => db.tags.toArray());

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
				tag_ids: [],
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				blocked_by: [],
				evening: false,
				checklist: [],
				logged_at: null,
				logged_status: null,
				order: $items.length > 0 ? Math.max(...$items.map((t) => t.order)) + 1 : 1,
				deleted_at: null,
				type: 'task',
				later: false,
				parent_id: null,
				parent_things_id: null
			});

			input.value = '';
		}
	}

	let openedItem: Item | null = $state(null);

	function openItem(event: MouseEvent) {
		clearHighlightsForAllItems();

		const li = event.currentTarget as HTMLLIElement;

		openedItem =
			$items.filter(
				(item: Item) => item.id === parseInt(li.getAttribute('data-id') || '', 10)
			)[0] || null;
	}

	function closeOpenedItem() {
		openedItem = null;
	}

	let addingNewItem = $state(false);

	async function deleteHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.items.update(itemId, { deleted_at: new SvelteDate() });
		});
		clearHighlightsForAllItems();
	}

	let highlightedItems = new SvelteSet<number>();

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

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.code === 'Enter' && addingNewItem) {
			addItem?.(event);
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

		if (event.key === 'Escape' && highlightedItems.size > 0) {
			clearHighlightsForAllItems();
			return;
		}

		if (event.key === 'Backspace' && highlightedItems.size > 0 && !addingNewItem && !openedItem) {
			deleteHighlightedItems();
			return;
		}
	}

	let dnd = useDragAndDrop(items, highlightedItems);
</script>

<svelte:head>
	<title>Focus | Things.do</title>
</svelte:head>

<svelte:window onkeydown={processKeydownEvent} />

<ItemInputBox bind:addingNewItem />
{#if $items?.length > 0}
	<ul class="mt-4 space-y-2">
		{#each $items as item, index (item.id)}
			<li
				data-id={item.id}
				class={dnd.dragInsertIndex === index
					? 'relative -my-2 border-t-2 border-blue-400'
					: dnd.dragInsertIndex === $items.length && index === $items.length - 1
						? 'relative -my-2 border-b-2 border-blue-400'
						: ''}
			>
				<ItemComponent
					{item}
					bind:openedItem
					{openItem}
					{highlightItem}
					handleDragStart={(event: DragEvent) => dnd.handleDragStart(event, item.id!)}
					handleDragOver={(event: DragEvent) => dnd.handleDragOver(event, item.id!)}
					handleDrop={(event: DragEvent) => dnd.handleDrop(event, item.id!)}
					handleDragEnd={dnd.handleDragEnd}
					tags={$tags}
				/>
			</li>
		{/each}
	</ul>
{/if}
<MultiselectOptionBoxComponent
	{highlightedItems}
	{deleteHighlightedItems}
	{clearHighlightsForAllItems}
/>
