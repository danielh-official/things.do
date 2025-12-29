import { db, type Item } from '$lib/db';
import type { Observable } from 'dexie';
import { onDestroy } from 'svelte';
import { SvelteDate } from 'svelte/reactivity';

export interface UseItemAddingReturn {
	addingNewItem: boolean;
	addItem: (event: KeyboardEvent) => Promise<void>;
}

export default function useItemAdding(
	items: Observable<Item[]>,
	defaultItemParams: Omit<
		Item,
		'id' | 'order' | 'title' | 'created_at' | 'updated_at' | 'things_id'
	>
): UseItemAddingReturn {
	// Keep a reactive snapshot of the current items emitted by the observable
	let itemsSnapshot: Item[] = $state([]);
	const subscription = items.subscribe((value) => {
		itemsSnapshot = value ?? [];
	});
	onDestroy(() => subscription?.unsubscribe?.());

	let addingNewItem = $state(false);

	async function addItem(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item) {
			db.items.add({
				...defaultItemParams,
				title: item,
				order: itemsSnapshot.length > 0 ? Math.max(...itemsSnapshot.map((t) => t.order)) + 1 : 1,
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				things_id: null
			});

			input.value = '';
		}
	}

	return {
		get addingNewItem() {
			return addingNewItem;
		},
		set addingNewItem(value: boolean) {
			addingNewItem = value;
		},
		addItem
	};
}
