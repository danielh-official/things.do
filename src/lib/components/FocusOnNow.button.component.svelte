<script lang="ts">
	import { db } from '$lib/db';

	let {
		highlightedItems = $bindable(),
		clearHighlightsForAllItems
	}: {
		highlightedItems: Set<number>;
		clearHighlightsForAllItems: () => void;
	} = $props();
</script>

<button
	class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
	onclick={() => {
		highlightedItems.forEach(async (itemId) => {
			const item = await db.todos.get(itemId);
			if (item) {
				await db.todos.update(itemId, { later: false });
			}
		});
		clearHighlightsForAllItems();
	}}>Focus On Now <span class="keyboard-shortcut">F</span></button
>
