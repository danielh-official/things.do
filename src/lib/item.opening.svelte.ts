import { type Item } from "$lib/db";
import type { Observable } from "dexie";
import { onDestroy } from "svelte";

export default function useItemOpening(
    items: Observable<Item[]>,
    clearHighlightsForAllItems: () => void
) {
    let openedItem: Item | null = $state(null);

    // Keep a reactive snapshot of the current items emitted by the observable
    let itemsSnapshot: Item[] = $state([]);
    const subscription = items.subscribe((value) => {
        itemsSnapshot = value ?? [];
    });
    onDestroy(() => subscription?.unsubscribe?.());

    function openItem(event: MouseEvent) {
        clearHighlightsForAllItems();

        const li = event.currentTarget as HTMLLIElement;

        openedItem =
            itemsSnapshot.filter(
                (item: Item) => item.id === parseInt(li.getAttribute('data-id') || '', 10)
            )[0] || null;
    }

    function closeOpenedItem() {
        openedItem = null;
    }

    return {
        get openedItem() { return openedItem; },
        set openedItem(value: Item | null) { openedItem = value; },
        openItem,
        closeOpenedItem
    }
}