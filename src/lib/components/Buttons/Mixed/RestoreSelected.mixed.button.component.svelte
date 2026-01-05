<script lang="ts">
	import { db } from '$lib/db';
	import type { SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems,
		clearHighlightsForAllItems
	}: {
		highlightedItems: SvelteSet<string>;
		clearHighlightsForAllItems: () => void;
	} = $props();

	async function restoreHighlightedItems() {
		for (const itemKey of highlightedItems) {
			const [type, idStr] = itemKey.split('-');
			const id = parseInt(idStr, 10);
			if (type === 'todo') {
				await db.todos.update(id, { deleted_at: null });
			} else if (type === 'project') {
				await db.projects.update(id, { deleted_at: null });
			}
		}
		clearHighlightsForAllItems();
	}
</script>

<button
	class="cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
	onclick={restoreHighlightedItems}
>
	Restore Selected Items
</button>
