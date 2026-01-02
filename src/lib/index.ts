// place files you want to import through the `$lib` alias in this folder.

import { db } from '$lib/db';

export async function getFocusingTodos() {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			if (todo.deleted_at && todo.deleted_at !== null) {
				return false;
			}

			if (todo.later) {
				return false;
			}

			return true;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getLaterTodos() {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			if (todo.deleted_at && todo.deleted_at !== null) {
				return false;
			}

			if (todo.later) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getBlockedTodos() {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			if (todo.deleted_at && todo.deleted_at !== null) {
				return false;
			}

			if (todo.blocked_by && todo.blocked_by.length > 0) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTrashedTodos() {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			if (todo.deleted_at && todo.deleted_at !== null) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTags() {
	return await db.tags.toArray();
}

export async function cleanupTags() {
	const allTags = await db.tags.toArray();
	const validTagIds = new Set(allTags.map((tag) => tag.id));

	const result = await db.todos.toArray();
	for (const todo of result) {
		const originalTagIds = todo.tag_ids || [];
		const filteredTagIds = originalTagIds.filter((tagId) => validTagIds.has(tagId));
		if (filteredTagIds.length !== originalTagIds.length) {
			await db.todos.update(todo.id!, { tag_ids: filteredTagIds });
		}
	}
}
