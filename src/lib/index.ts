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

			// Filter out logged items (only check logged_at for delay support)
			if (todo.logged_at) {
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

			// Filter out logged items (only check logged_at for delay support)
			if (todo.logged_at) {
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

			// Filter out logged items (only check logged_at for delay support)
			if (todo.logged_at) {
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

			// Filter out logged projects (only check logged_at for delay support)
			if (project.logged_at) {
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

			// Filter out logged items (only check logged_at for delay support)
			if (todo.logged_at) {
				return false;
			}

			if (todo.parent_id === projectId) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getAllTodosForProject(projectId: number) {
	const result = await db.todos.toArray();

	return result
		.filter((todo) => {
			if (todo.deleted_at && todo.deleted_at !== null) {
				return false;
			}

			if (todo.parent_id === projectId) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getProjectProgress(
	projectId: number
): Promise<{ completed: number; total: number }> {
	const todos = await getAllTodosForProject(projectId);
	const total = todos.length;
	const completed = todos.filter((todo) => todo.logged_at !== null).length;

	return { completed, total };
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

			// Show items that have logged_at set
			if (todo.logged_at) {
				return true;
			}

			return false;
		})
		.sort((a, b) => {
			// Sort by logged_at descending (most recent first)
			// If either doesn't have logged_at, put those at the end
			if (!a.logged_at && !b.logged_at) return 0;
			if (!a.logged_at) return 1;
			if (!b.logged_at) return -1;
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

			// Show projects that have logged_at set
			if (project.logged_at) {
				return true;
			}

			return false;
		})
		.sort((a, b) => {
			// Sort by logged_at descending (most recent first)
			// If either doesn't have logged_at, put those at the end
			if (!a.logged_at && !b.logged_at) return 0;
			if (!a.logged_at) return 1;
			if (!b.logged_at) return -1;
			return b.logged_at.getTime() - a.logged_at.getTime();
		});
}
