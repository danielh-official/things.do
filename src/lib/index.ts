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

			// Filter out logged items (completed or canceled)
			if (todo.logged_at || todo.logged_status) {
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

			// Filter out logged items (completed or canceled)
			if (todo.logged_at || todo.logged_status) {
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

			// Filter out logged items (completed or canceled)
			if (todo.logged_at || todo.logged_status) {
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

export async function getTrashedProjects() {
	const result = await db.projects.toArray();

	return result
		.filter((project) => {
			if (project.deleted_at && project.deleted_at !== null) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTags() {
	return await db.tags.toArray();
}

export async function getProjects() {
	const result = await db.projects.toArray();

	return result
		.filter((project) => {
			if (project.deleted_at && project.deleted_at !== null) {
				return false;
			}

			// Filter out logged projects (completed or canceled)
			if (project.logged_at || project.logged_status) {
				return false;
			}

			return true;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTodosForProject(projectId: number) {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			if (todo.deleted_at && todo.deleted_at !== null) {
				return false;
			}

			// Filter out logged items (completed or canceled)
			if (todo.logged_at || todo.logged_status) {
				return false;
			}

			if (todo.parent_id === projectId) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
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

export async function getLoggedTodos() {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			// Only show logged items that aren't deleted
			if (todo.deleted_at && todo.deleted_at !== null) {
				return false;
			}

			// Show items that are logged (completed or canceled)
			if (todo.logged_at || todo.logged_status) {
				return true;
			}

			return false;
		})
		.sort((a, b) => {
			// Sort by logged_at descending (most recent first)
			if (!a.logged_at || !b.logged_at) return 0;
			return b.logged_at.getTime() - a.logged_at.getTime();
		});
}

export async function getLoggedProjects() {
	const result = await db.projects.toArray();

	return result
		.filter((project) => {
			// Only show logged items that aren't deleted
			if (project.deleted_at && project.deleted_at !== null) {
				return false;
			}

			// Show projects that are logged (completed or canceled)
			if (project.logged_at || project.logged_status) {
				return true;
			}

			return false;
		})
		.sort((a, b) => {
			// Sort by logged_at descending (most recent first)
			if (!a.logged_at || !b.logged_at) return 0;
			return b.logged_at.getTime() - a.logged_at.getTime();
		});
}
