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

	async function permanentlyDeleteHighlightedItems() {
		if (
			!confirm(
				'Are you sure you want to permanently delete the selected items? This action cannot be undone.'
			)
		) {
			return;
		}

		for (const itemKey of highlightedItems) {
			const [type, idStr] = itemKey.split('-');
			const id = parseInt(idStr, 10);
			if (type === 'todo') {
				await db.todos.delete(id);
			} else if (type === 'project') {
				await db.projects.delete(id);
			}
		}
		clearHighlightsForAllItems();
	}
</script>

<button
	class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
	onclick={permanentlyDeleteHighlightedItems}
>
	Permanently Delete Selected Items
</button>
