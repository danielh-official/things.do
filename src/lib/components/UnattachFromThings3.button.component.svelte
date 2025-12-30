<script lang="ts">
	import { db } from '$lib/db';
	import { addToast, toasts } from '$lib/toastStore';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems = $bindable()
	}: {
		highlightedItems: SvelteSet<number>;
	} = $props();

	async function unattachFromThings3() {
		let itemsAlreadyUnattached = 0;

		for (const itemId of highlightedItems) {

			const item = await db.items.get(itemId);

			if (item) {
				if (item.things_id === null) {
					itemsAlreadyUnattached += 1;
				} else {
					await db.items.update(itemId, { things_id: null, sent_to_things_at: null });
				}
			}
		}

		let message = 'Selected items unattached from Things 3.';

		if (itemsAlreadyUnattached > 0) {
			message += ` (${itemsAlreadyUnattached} item${
				itemsAlreadyUnattached > 1 ? 's were' : ' was'
			} already unattached)`;
		}

		addToast(message, {
			type: 'success',
			duration: 3000
		});
	}
</script>

<button
	class="cursor-pointer rounded bg-blue-400 px-4 py-2 text-white hover:bg-blue-500"
	onclick={unattachFromThings3}
>
	Unattach From Things 3
</button>
