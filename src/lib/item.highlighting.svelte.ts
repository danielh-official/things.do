import { db, type Item } from "$lib/db";
import type { Observable } from "dexie";
import { onDestroy } from "svelte";
import { SvelteDate, SvelteSet } from "svelte/reactivity";

export default function useItemHighlighting(
    items: Observable<Item[]>,
) {
    // Keep a reactive snapshot of the current items emitted by the observable
    let itemsSnapshot: Item[] = $state([]);
    const subscription = items.subscribe((value) => {
        itemsSnapshot = value ?? [];
    });
    onDestroy(() => subscription?.unsubscribe?.());

    async function deleteHighlightedItems() {
        highlightedItems.forEach(async (itemId) => {
            await db.items.update(itemId, { deleted_at: new SvelteDate() });
        });
        clearHighlightsForAllItems();
    }

    let highlightedItems = $state(new SvelteSet<number>());

    function highlightItem(event: MouseEvent) {
        const button = event.currentTarget as HTMLButtonElement;
        const itemId = parseInt(button.getAttribute('data-id') || '', 10);

        if (highlightedItems.has(itemId)) {
            highlightedItems.delete(itemId);
            button.classList.add('bg-white');
            button.classList.add('hover:bg-gray-50');
            button.classList.remove('bg-blue-200');
            button.classList.remove('hover:bg-blue-300');
        } else {
            highlightedItems.add(itemId);
            button.classList.remove('bg-white');
            button.classList.remove('hover:bg-gray-50');
            button.classList.add('bg-blue-200');
            button.classList.add('hover:bg-blue-300');
        }
    }

    function clearHighlightsForAllItems() {
        itemsSnapshot.forEach((item: Item) => {
            const itemId = item.id;

            const button = document.querySelector(`button[data-id='${itemId}']`) as HTMLButtonElement;
            if (button) {
                button.classList.add('bg-white');
                button.classList.add('hover:bg-gray-50');
                button.classList.remove('bg-blue-200');
                button.classList.remove('hover:bg-blue-300');
            }
        });
        highlightedItems.clear();
    }

    return {
        highlightedItems,
        highlightItem,
        clearHighlightsForAllItems,
        deleteHighlightedItems
    };
}