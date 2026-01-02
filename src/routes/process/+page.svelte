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
		checklist: string | null;
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
			'parent_id' in item &&
			'checklist' in item
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

		for (const todo of initialParse) {
			// Before working on the item, let's parse the tags

			const tags = todo.tags
				.split('\n')
				.map((tag: string) => tag.trim())
				.filter((tag: string) => tag.length > 0);

			let tagIdsToAssignToTodo: number[] = [];

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

					tagIdsToAssignToTodo.push(newTagId);
				}

				// Now we have the tag in existingTag
				// We can associate this tag with the todo later when adding/updating the todo
				if (existingTag) {
					tagIdsToAssignToTodo.push(existingTag.id);
				}
			}

			const newModifiedAt = parseDateStringToSvelteDate(todo.updated_at);

			// If todo.id already exists in the table as things_id, we need to compare the modification dates to ensure we're not overwriting newer data with older data.
			const existingTodo = await db.todos.where('things_id').equals(todo.id).first();

			if (existingTodo && isInitialParsedDataObject(todo)) {
				const existingModifiedAt = existingTodo.updated_at;

				// Update existing todo
				db.todos
					.where('things_id')
					.equals(todo.id)
					.modify({
						title: todo.title,
						notes: todo.notes,
						logged_status:
							todo.status === 'Completed'
								? 'completed'
								: todo.status === 'Canceled'
									? 'canceled'
									: null,
						start_date: parseDateStringToSvelteDate(todo.start_date),
						start: todo.start === 'anytime' || todo.start === 'someday' ? todo.start : null,
						deadline: parseDateStringToSvelteDate(todo.deadline),
						logged_at: parseDateStringToSvelteDate(todo.completed_at),
						// Only update updated_at if the newModifiedAt is more recent than existingModifiedAt
						updated_at:
							newModifiedAt && existingModifiedAt < newModifiedAt
								? newModifiedAt
								: existingModifiedAt,

						parent_id: null,
						parent_things_id: todo.parent_id,
						tag_ids: tagIdsToAssignToTodo
					});
				continue;
			}

			if (isInitialParsedDataObject(todo)) {
				await db.todos.add({
					things_id: todo.id,
					title: todo.title,
					notes: todo.notes,
					// If not 'completed' or 'canceled', use null as default
					logged_status:
						todo.status === 'Completed'
							? 'completed'
							: todo.status === 'Canceled'
								? 'canceled'
								: null,
					start_date: parseDateStringToSvelteDate(todo.start_date),
					// If start is not a valid string of "anytime" or "someday", use null as default
					start: todo.start === 'anytime' || todo.start === 'someday' ? todo.start : null,
					deadline: parseDateStringToSvelteDate(todo.deadline),
					logged_at: parseDateStringToSvelteDate(todo.completed_at),
					created_at: parseDateStringToSvelteDate(todo.created_at) || new SvelteDate(),
					updated_at: newModifiedAt || new SvelteDate(),
					tag_ids: tagIdsToAssignToTodo,
					parent_id: null,
					parent_things_id: todo.parent_id,
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
