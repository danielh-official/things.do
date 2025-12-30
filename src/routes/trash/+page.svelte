<script lang="ts">
	import ItemsListComponent from '$lib/components/ItemsList.component.svelte';
	import { db } from '$lib/db';
	import { getTrashedItems } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelectedItemsButtonComponent from '$lib/components/ClearSelectedItemsButtonComponent.svelte';
	import RestoreSelectedItemsButtonComponent from '$lib/components/RestoreSelectedItemsButtonComponent.svelte';
	import PermanentlyDeleteSelectedItemsButtonComponent from '$lib/components/PermanentlyDeleteSelectedItemsButtonComponent.svelte';

	let items = liveQuery(() => getTrashedItems());

	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Trash | Things.do</title>
</svelte:head>

{#if $items?.length > 0}
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

			$items.forEach(async (item) => {
				await db.items.delete(item.id!);
			});
		}}>Empty Trash</button
	>
{/if}

<ItemsListComponent {items} {tags}>
	{#snippet multiselectButtons(highlightedItems, clearHighlightsForAllItems)}
		<RestoreSelectedItemsButtonComponent {highlightedItems} {clearHighlightsForAllItems} />

		<PermanentlyDeleteSelectedItemsButtonComponent
			{highlightedItems}
			{clearHighlightsForAllItems}
		/>

		<ClearSelectedItemsButtonComponent {clearHighlightsForAllItems} />
	{/snippet}
</ItemsListComponent>
