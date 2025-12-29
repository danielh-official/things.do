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
			const item = await db.items.get(itemId);
			if (item) {
				await db.items.update(itemId, { later: true });
			}
		});
		clearHighlightsForAllItems();
	}}>Set Aside For Later</button
>
