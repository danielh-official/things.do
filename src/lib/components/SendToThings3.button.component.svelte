<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems = $bindable()
	}: {
		highlightedItems: SvelteSet<number>;
	} = $props();

	interface ThingsObject {
		type: string;
		operation?: 'update';
		id?: string;
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

		if (item.things_id) {
			obj.id = item.things_id;
			obj.operation = 'update';
		}

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
				// To ISO8601 string
				obj.attributes['completion-date'] = item.logged_at.toISOString() || null;
			} else if (item.logged_status === 'canceled') {
				obj.attributes.canceled = true;
				obj.attributes['completion-date'] = item.logged_at.toISOString() || null;
			}
		} else {
			obj.attributes.completed = false;
		}

		return {
			item,
			obj
		};
	}

	function buildXSuccessUrl(itemIds: number[]): string {
		if (itemIds.length === 0) {
			return '';
		}

		let path = 'success';

		const query = new URLSearchParams();

		query.set('sent-at', SvelteDate.now().toString());

		itemIds.forEach((id) => {
			query.append('id', id.toString());
		});

		const callbackUrlParam = encodeURIComponent(window.location.origin + '/' + path + '?' + query.toString());

		return callbackUrlParam;
	}

	async function syncAllSelectedItemsToThings3() {
		let items: Item[] = [];

		let data: any[] = [];

		for (let itemId of highlightedItems) {
			let { item, obj } = await getJsonForItemId(itemId);

			if (obj) {
				data.push(obj);
			}

			if (item && !item.things_id) {
				items.push(item);
			}
		}

		if (data.length === 0) {
			return;
		}

		const dataParam = encodeURIComponent(JSON.stringify(data));

		const callbackUrlParam = buildXSuccessUrl(items.map((item) => item.id));

		let thingsUrl = `things:///json?data=${dataParam}`;

		if (callbackUrlParam) {
			thingsUrl += `&x-success=${callbackUrlParam}`;
		}

		const authToken = localStorage.getItem('things3_auth_token');

		if (authToken) {
			thingsUrl += `&auth-token=${encodeURIComponent(authToken)}`;
		}

		window.open(thingsUrl, '_blank');
	}
</script>

<button
	class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
	onclick={syncAllSelectedItemsToThings3}
	disabled={highlightedItems.size > 200}
>
	Sync To Things 3
</button>
