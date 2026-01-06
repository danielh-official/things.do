<script lang="ts">
	import { db } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';

	let {
		highlightedItems = $bindable(),
		clearHighlightsForAllItems
	}: {
		highlightedItems: Set<number>;
		clearHighlightsForAllItems: () => void;
	} = $props();

	async function deleteHighlightedItems() {
		highlightedItems.forEach(async (itemId) => {
			await db.todos.update(itemId, { deleted_at: new SvelteDate() });
		});
		clearHighlightsForAllItems();
	}
</script>

<button
	class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
	data-testid="delete-selected-button"
	onclick={deleteHighlightedItems}
>
	Delete
</button>
