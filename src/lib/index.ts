// place files you want to import through the `$lib` alias in this folder.

import { db } from '$lib/db';

export function clickOutside(node: HTMLElement) {
	// the node has been mounted in the DOM

	window.addEventListener('click', handleClick);

	function handleClick(e: MouseEvent) {
		if (!node.contains(e.target as Node)) {
			node.dispatchEvent(new CustomEvent('outsideclick'));
		}
	}

	return {
		destroy() {
			// the node has been removed from the DOM
			window.removeEventListener('click', handleClick);
		}
	};
}

export async function getFocusingItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			if (item.later) {
				return false;
			}

			return true;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getLaterItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			if (item.later) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getBlockedItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			if (item.blocked_by && item.blocked_by.length > 0) {
				return true;
			}

			return false;
		})
		.sort((a, b) => a.order - b.order);
}

export async function getTrashedItems() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.deleted_at && item.deleted_at !== null) {
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

	const allItems = await db.items.toArray();
	for (const item of allItems) {
		const originalTagIds = item.tag_ids || [];
		const filteredTagIds = originalTagIds.filter((tagId) => validTagIds.has(tagId));
		if (filteredTagIds.length !== originalTagIds.length) {
			await db.items.update(item.id!, { tag_ids: filteredTagIds });
		}
	}
}
