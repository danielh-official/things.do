<script lang="ts">
	import { db } from '$lib/db';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems = $bindable()
	}: {
		highlightedItems: SvelteSet<number>;
	} = $props();

	function unattachFromThings3() {
		highlightedItems.forEach(async (itemId) => {
			const item = await db.items.get(itemId);
			if (item) {
				await db.items.update(itemId, { things_id: null, sent_to_things_at: null });
			}
		});
	}
</script>

<button
	class="cursor-pointer rounded bg-blue-400 px-4 py-2 text-white hover:bg-blue-500"
	onclick={unattachFromThings3}
>
	Unattach From Things 3
</button>
