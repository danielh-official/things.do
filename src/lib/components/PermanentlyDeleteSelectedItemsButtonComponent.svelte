<script lang="ts">
	import { db } from '$lib/db';
	import type { SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems,
		clearHighlightsForAllItems
	}: {
		highlightedItems: SvelteSet<number>;
		clearHighlightsForAllItems: () => void;
	} = $props();

	async function permanentlyDeleteHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.items.delete(itemId);
		});
		clearHighlightsForAllItems();
	}
</script>

<button
	class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
	onclick={permanentlyDeleteHighlightedItems}
>
	Permanently Delete Selected Items
</button>
