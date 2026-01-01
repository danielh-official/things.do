<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { db } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';

	interface InitialParsedDataObject {
		completed_at: string;
		created_at: string;
		updated_at: string;
		id: string;
		notes: string;
		start_date: string;
		start: string;
		status: 'Open' | 'Completed' | 'Canceled';
		tags: string;
		title: string;
		type: string;
		deadline: string;
		parent_id: string | null;
	}

	function isInitialParsedDataObject(item: any): item is InitialParsedDataObject {
		return (
			typeof item === 'object' &&
			item !== null &&
			'completed_at' in item &&
			'created_at' in item &&
			'updated_at' in item &&
			'id' in item &&
			'notes' in item &&
			'start_date' in item &&
			'start' in item &&
			'status' in item &&
			'tags' in item &&
			'title' in item &&
			'type' in item &&
			'deadline' in item &&
			'parent_id' in item
		);
	}

	function parseDateStringToSvelteDate(dateString: string): SvelteDate | null {
		const timestamp = Date.parse(dateString);
		return isNaN(timestamp) ? null : new SvelteDate(timestamp);
	}

	onMount(async () => {
		// Read data in route param "data"

		const dataParam = page.url.searchParams.get('data');

		if (!dataParam) {
			return;
		}

		const initialParse = JSON.parse(dataParam);

		// If initial parse is an array, continue

		if (!Array.isArray(initialParse)) {
			return;
		}

		for (const item of initialParse) {
			// Before working on the item, let's parse the tags

			const tags = item.tags
				.split('\n')
				.map((tag: string) => tag.trim())
				.filter((tag: string) => tag.length > 0);

			let tagIdsToAssignToItem: number[] = [];

			for (const tagName of tags) {
				// Check if tag already exists
				let existingTag = await db.tags.where('name').equals(tagName).first();

				if (!existingTag) {
					// Add new tag
					const newTagId = await db.tags.add({
						name: tagName,
						created_at: new SvelteDate(),
						updated_at: new SvelteDate(),
						order: 0,
						parent_tag_id: null
					});

					tagIdsToAssignToItem.push(newTagId);
				}

				// Now we have the tag in existingTag
				// We can associate this tag with the item later when adding/updating the item
				if (existingTag) {
					tagIdsToAssignToItem.push(existingTag.id);
				}
			}

			const newModifiedAt = parseDateStringToSvelteDate(item.updated_at);

			// If item.id already exists in the table as things_id, we need to compare the modification dates to ensure we're not overwriting newer data with older data.
			const existingItem = await db.items.where('things_id').equals(item.id).first();

			if (existingItem && isInitialParsedDataObject(item)) {
				const existingModifiedAt = existingItem.updated_at;

				// Update existing item
				db.items
					.where('things_id')
					.equals(item.id)
					.modify({
						title: item.title,
						notes: item.notes,
						type:
							item.type === 'task' || item.type === 'project' || item.type === 'area'
								? item.type
								: 'task',
						logged_status:
							item.status === 'Completed'
								? 'completed'
								: item.status === 'Canceled'
									? 'canceled'
									: null,
						start_date: parseDateStringToSvelteDate(item.start_date),
						start: item.start === 'anytime' || item.start === 'someday' ? item.start : null,
						deadline: parseDateStringToSvelteDate(item.deadline),
						logged_at: parseDateStringToSvelteDate(item.completed_at),
						// Only update updated_at if the newModifiedAt is more recent than existingModifiedAt
						updated_at:
							newModifiedAt && existingModifiedAt < newModifiedAt
								? newModifiedAt
								: existingModifiedAt,

			            parent_id: null,
			            parent_things_id: item.parent_id,
                        tag_ids: tagIdsToAssignToItem
					});
				continue;
			}

			if (isInitialParsedDataObject(item)) {
				await db.items.add({
					things_id: item.id,
					title: item.title,
					notes: item.notes,
					// If type is not a valid string of "task", "project", or "area", use "task" as default
					type:
						item.type === 'task' || item.type === 'project' || item.type === 'area'
							? item.type
							: 'task',
					// If not 'completed' or 'canceled', use null as default
					logged_status:
						item.status === 'Completed'
							? 'completed'
							: item.status === 'Canceled'
								? 'canceled'
								: null,
					start_date: parseDateStringToSvelteDate(item.start_date),
					// If start is not a valid string of "anytime" or "someday", use null as default
					start: item.start === 'anytime' || item.start === 'someday' ? item.start : null,
					deadline: parseDateStringToSvelteDate(item.deadline),
					logged_at: parseDateStringToSvelteDate(item.completed_at),
					created_at: parseDateStringToSvelteDate(item.created_at) || new SvelteDate(),
					updated_at: newModifiedAt || new SvelteDate(),
					tag_ids: tagIdsToAssignToItem,
					parent_id: null,
					parent_things_id: item.parent_id,
					later: false,
					order: 0,
					evening: false,
					blocked_by: [],
					deleted_at: null,
					checklist: []
				});
			}
		}
	});
</script>

<svelte:head>
	<title>Process | Things.do</title>
</svelte:head>
