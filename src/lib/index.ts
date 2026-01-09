// place files you want to import through the `$lib` alias in this folder.

import { db, type Item, type Project } from '$lib/db';
import { SvelteSet } from 'svelte/reactivity';

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

			// Filter out blocked items
			if (todo.blocked_by && todo.blocked_by.length > 0) {
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

			// Filter out blocked items
			if (todo.blocked_by && todo.blocked_by.length > 0) {
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

export async function getBlockedProjects() {
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

			if (project.blocked_by && project.blocked_by.length > 0) {
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

			// Filter out blocked projects
			if (project.blocked_by && project.blocked_by.length > 0) {
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

			// Filter out blocked items
			if (todo.blocked_by && todo.blocked_by.length > 0) {
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

/**
 * Get all descendant tag IDs for a given tag ID (including the tag itself)
 */
export async function getTagAndDescendants(tagId: number): Promise<number[]> {
	const allTags = await db.tags.toArray();
	const result: number[] = [tagId];
	const queue: number[] = [tagId];

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const children = allTags.filter((tag) => tag.parent_tag_id === currentId).map((tag) => tag.id);
		result.push(...children);
		queue.push(...children);
	}

	return result;
}

/**
 * Check if an item matches the tag filters with hierarchy and inheritance support
 * An item matches if it has at least one tag from each selected tag's descendant set
 * For todos, also includes tags inherited from the parent project
 */
export async function itemMatchesTagFilters(
	item: Item | null,
	selectedTagIds: number[]
): Promise<boolean> {
	if (selectedTagIds.length === 0) return true;
	if (!item) return false;

	let itemTagIds: number[] = [];

	// For todos, get effective tags (own + inherited from project)
	if ('checklist' in item) {
		// It's a todo
		itemTagIds = await getEffectiveTagIds(item);
	} else {
		// It's a project
		itemTagIds = (item as Project).tag_ids || [];
	}

	if (itemTagIds.length === 0) return false;

	const itemTags = new SvelteSet(itemTagIds);

	// Build expanded tag sets for each filter tag
	for (const tagId of selectedTagIds) {
		const descendants = await getTagAndDescendants(tagId);
		const descendantsSet = new Set(descendants);

		// Item must have at least one tag from this expanded set
		if (!Array.from(descendantsSet).some((id) => itemTags.has(id))) {
			return false;
		}
	}

	return true;
}

/**
 * Get all items that are blocked by a given item (items it's blocking)
 */
export async function getBlockingItems(blockerId: number): Promise<(Item | Project)[]> {
	const todos = await db.todos.toArray();
	const projects = await db.projects.toArray();

	const blockedByBlocker: (Item | Project)[] = [];

	for (const todo of todos) {
		if (todo.blocked_by && todo.blocked_by.includes(blockerId)) {
			blockedByBlocker.push(todo);
		}
	}

	for (const project of projects) {
		if (project.blocked_by && project.blocked_by.includes(blockerId)) {
			blockedByBlocker.push(project);
		}
	}

	return blockedByBlocker;
}

/**
 * Get all tag IDs for a todo, including tags inherited from its parent project
 */
export async function getEffectiveTagIds(todo: Item): Promise<number[]> {
	const effectiveTags = new Set<number>();

	// Add todo's own tags
	if (todo.tag_ids) {
		for (const tagId of todo.tag_ids) {
			effectiveTags.add(tagId);
		}
	}

	// Add parent project's tags
	if (todo.parent_id) {
		const project = await db.projects.get(todo.parent_id);
		if (project && project.tag_ids) {
			for (const tagId of project.tag_ids) {
				effectiveTags.add(tagId);
			}
		}
	}

	return Array.from(effectiveTags);
}
