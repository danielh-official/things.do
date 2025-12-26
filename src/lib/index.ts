// place files you want to import through the `$lib` alias in this folder.

import { db } from './db';

export function clickOutside(node: HTMLLIElement) {
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

export async function getFocusingTasks() {
	const allItems = await db.items.toArray();

	return allItems
		.filter((item) => {
			if (item.type === 'area' || item.type === 'project') {
				return false;
			}

			if (item.deleted_at && item.deleted_at !== null) {
				return false;
			}

			return true;
		})
		.sort((a, b) => a.order - b.order);
}