<script lang="ts">
	import { db } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';
	import type { SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems,
		clearHighlightsForAllItems
	}: {
		highlightedItems: SvelteSet<string>;
		clearHighlightsForAllItems: () => void;
	} = $props();

	async function deleteHighlightedItems() {
		for (const itemKey of highlightedItems) {
			const [type, idStr] = itemKey.split('-');
			const id = parseInt(idStr, 10);
			if (type === 'todo') {
				await db.todos.update(id, { deleted_at: new SvelteDate() });
			} else if (type === 'project') {
				await db.projects.update(id, { deleted_at: new SvelteDate() });
			}
		}
		clearHighlightsForAllItems();
	}
</script>

<button
	class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
	onclick={deleteHighlightedItems}
>
	Delete Selected Items
</button>
