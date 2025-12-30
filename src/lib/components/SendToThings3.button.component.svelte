<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';

	let {
		highlightedItems = $bindable()
	}: {
		highlightedItems: SvelteSet<number>;
	} = $props();

	interface ThingsObject {
		type: string;
		attributes: ThingsObjectAttributes;
	}

	interface ThingsObjectAttributes {
		title: string;
		when?: string | null;
		deadline?: string | null;
		notes?: string | null;
		tags?: string[];
		'checklist-items'?: ThingsObject[];
		completed?: boolean;
		canceled?: boolean;
		'creation-date'?: string;
		'completion-date'?: string | null;
	}

	async function getJsonForItemId(
		itemId: number
	): Promise<{ item: Item | undefined; obj: ThingsObject | undefined }> {
		const item = await db.items.get(itemId);

		if (!item) {
			return { item: undefined, obj: undefined };
		}

		const tagsForItem = await db.tags
			.where('id')
			.anyOf(item.tag_ids || [])
			.toArray();

		const tagNames = tagsForItem.map((tag) => tag.name);

		const obj: ThingsObject = {
			type: item.type === 'project' ? 'project' : 'to-do',
			attributes: {
				title: item.title
			}
		};

		if (item.notes) {
			obj.attributes.notes = item.notes;
		}

		if (item.start_date) {
			obj.attributes.when = item.start_date.toDateString() ?? item.start;
		}

		if (item.deadline) {
			obj.attributes.deadline = item.deadline.toDateString();
		}

		if (item.tag_ids.length > 0) {
			obj.attributes.tags = tagNames;
		}

		if (item.checklist && item.checklist.length > 0) {
			obj.attributes['checklist-items'] = item.checklist.map((checklistItem) => ({
				type: 'to-do',
				attributes: {
					title: checklistItem.title,
					completed: checklistItem.logged && checklistItem.logged_status === 'completed',
					canceled: checklistItem.logged && checklistItem.logged_status === 'canceled'
				}
			}));
		}

		if (item.logged_at) {
			if (item.logged_status === 'completed') {
				obj.attributes.completed = true;
				obj.attributes['completion-date'] = item.logged_at.toDateString() || null;
			} else if (item.logged_status === 'canceled') {
				obj.attributes.canceled = true;
				obj.attributes['completion-date'] = item.logged_at.toDateString() || null;
			}
		}

		return {
			item,
			obj
		};
	}

	async function addAllSelectedItemsToThings3() {
		let items: Item[] = [];

		let data: any[] = [];

		for (let itemId of highlightedItems) {
			let { item, obj } = await getJsonForItemId(itemId);

			if (obj) {
				data.push(obj);
			}

			if (item) {
				items.push(item);
			}
		}

		if (data.length === 0) {
			return;
		}

		const itemIds = items.map((item) => item.id);

		let path = 'success';

		itemIds.forEach((id) => {
			// Add id=[id] to the path for each instance
			path += (path.includes('?') ? '&' : '?') + `id=${id}`;
		});

		path += `&sent-at=${SvelteDate.now()}`;

		const callbackUrlParam = encodeURIComponent(window.location.href + path);

		const dataParam = encodeURIComponent(JSON.stringify(data));

		const thingsUrl = `things:///json?data=${dataParam}&x-success=${callbackUrlParam}`;

		window.open(thingsUrl, '_blank');
	}
</script>

<button
	class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
	onclick={addAllSelectedItemsToThings3}
	disabled={highlightedItems.size > 200}
>
	Add To Things 3
</button>
