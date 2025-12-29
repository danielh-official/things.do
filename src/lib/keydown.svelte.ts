import type { UseItemAddingReturn } from "$lib/item.adding.svelte";
import type { UseItemHighlightingReturn } from "$lib/item.highlighting.svelte";
import type { UseItemOpeningReturn } from "./item.opening.svelte";

export default function useKeydownHandling(
    itemAddingUtility: UseItemAddingReturn | undefined,
    itemOpeningUtility: UseItemOpeningReturn,
    itemHighlightingUtility: UseItemHighlightingReturn
) {
    function processKeydownEvent(event: KeyboardEvent) {
        if (event.code === 'Enter' && itemAddingUtility?.addingNewItem) {
            itemAddingUtility.addItem?.(event);
            return;
        }

        if (
            event.code === 'Space' &&
            !itemOpeningUtility.openedItem &&
            !itemAddingUtility?.addingNewItem
        ) {
            const input = document.querySelector('input#new-item-input') as HTMLInputElement;
            if (input) {
                event.preventDefault();
                input.focus();
            }
            return;
        }

        if (event.key === 'Escape' && itemOpeningUtility.openedItem) {
            itemOpeningUtility.closeOpenedItem();
            return;
        }

        if (event.key === 'Escape' && itemHighlightingUtility.highlightedItems.size > 0) {
            itemHighlightingUtility.clearHighlightsForAllItems();
            return;
        }

        if (
            event.key === 'Backspace' &&
            itemHighlightingUtility.highlightedItems.size > 0 &&
            !itemAddingUtility?.addingNewItem &&
            !itemOpeningUtility.openedItem
        ) {
            itemHighlightingUtility.deleteHighlightedItems();
            return;
        }
    }

    return {
        processKeydownEvent
    };
}