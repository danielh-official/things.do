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

	async function restoreHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.todos.update(itemId, { deleted_at: null });
		});
		clearHighlightsForAllItems();
	}
</script>

<button
	class="cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
	onclick={restoreHighlightedItems}
>
	Restore Selected Items
</button>
