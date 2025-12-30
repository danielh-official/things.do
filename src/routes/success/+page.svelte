<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { db } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';

	let thingsIds: string[] = $state([]);

	onMount(async () => {
		// Multiple id params are sent. For each id, we need to update the corresponding item in our database.

		const ids = page.url.searchParams.getAll('id');

		const params = new URLSearchParams(page.url.search);
		const idsParam = params.get('x-things-ids');

		if (!idsParam) {
			return;
		}

		const sentAt = params.get('sent-at');

		// Convert to SvelteDate
		const sentAtDate = sentAt ? new SvelteDate(parseInt(sentAt, 10)) : null;

		thingsIds = JSON.parse(idsParam);

		for (const [index, id] of ids.entries()) {
			const item = await db.items.where('id').equals(Number(id)).first();

			if (!item) {
				continue;
			}

			const thingsId = thingsIds[index];

			await db.items.update(item.id, {
				things_id: thingsId,
				sent_to_things_at: sentAtDate
			});
		}

		// After processing, close the tab
		window.close();
	});
</script>

<svelte:head>
	<title>Success | Things.do</title>
</svelte:head>
