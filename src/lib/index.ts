// place files you want to import through the `$lib` alias in this folder.

import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { db, type Item } from './db';

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
