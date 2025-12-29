<script lang="ts">
	import { db } from '$lib/db';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import MultiselectOptionBoxComponent from '$lib/components/MultiselectOptionBoxComponent.svelte';
	import ItemInputBox from '$lib/components/ItemInputBoxComponent.svelte';
	import { getFocusingItems } from '$lib';
	import { liveQuery } from 'dexie';
	import useDragAndDrop from '$lib/item.dragndrop.svelte';
	import useItemOpening from '$lib/item.opening.svelte';
	import useItemHighlighting from '$lib/item.highlighting.svelte';

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

	let itemHighlightingUtility = useItemHighlighting(items);

	let itemOpeningUtility = useItemOpening(
		items,
		itemHighlightingUtility.clearHighlightsForAllItems
	);

	let addingNewItem = $state(false);

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.code === 'Enter' && addingNewItem) {
			addItem?.(event);
			return;
		}

		if (event.code === 'Space' && !itemOpeningUtility.openedItem && !addingNewItem) {
			const input = document.querySelector('input#new-item-input') as HTMLInputElement;
			if (input) {
				event.preventDefault();
				input.focus();
			}
			return;
		}

		if (event.key === 'Escape' && itemOpeningUtility.openedItem) {
			itemOpeningUtility.closeOpenedItem();
			return;
		}

		if (event.key === 'Escape' && itemHighlightingUtility.highlightedItems.size > 0) {
			itemHighlightingUtility.clearHighlightsForAllItems();
			return;
		}

		if (
			event.key === 'Backspace' &&
			itemHighlightingUtility.highlightedItems.size > 0 &&
			!addingNewItem &&
			!itemOpeningUtility.openedItem
		) {
			itemHighlightingUtility.deleteHighlightedItems();
			return;
		}
	}

	let dragndropUtility = useDragAndDrop(items, itemHighlightingUtility.highlightedItems);
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
				class={dragndropUtility.dragInsertIndex === index
					? 'relative -my-2 border-t-2 border-blue-400'
					: dragndropUtility.dragInsertIndex === $items.length && index === $items.length - 1
						? 'relative -my-2 border-b-2 border-blue-400'
						: ''}
			>
				<ItemComponent
					{item}
					bind:openedItem={itemOpeningUtility.openedItem}
					openItem={itemOpeningUtility.openItem}
					highlightItem={itemHighlightingUtility.highlightItem}
					handleDragStart={(event: DragEvent) => dragndropUtility.handleDragStart(event, item.id!)}
					handleDragOver={(event: DragEvent) => dragndropUtility.handleDragOver(event, item.id!)}
					handleDrop={(event: DragEvent) => dragndropUtility.handleDrop(event, item.id!)}
					handleDragEnd={dragndropUtility.handleDragEnd}
					tags={$tags}
				/>
			</li>
		{/each}
	</ul>
{/if}
<MultiselectOptionBoxComponent
	highlightedItems={itemHighlightingUtility.highlightedItems}
	deleteHighlightedItems={itemHighlightingUtility.deleteHighlightedItems}
	clearHighlightsForAllItems={itemHighlightingUtility.clearHighlightsForAllItems}
/>
