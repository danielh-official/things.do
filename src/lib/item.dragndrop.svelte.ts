import { db, type Item } from "$lib/db";
import type { Observable } from "dexie";
import { onDestroy } from "svelte";
import { SvelteDate, type SvelteSet } from "svelte/reactivity";

export interface UseDragAndDropReturn {
    handleDragStart: (event: DragEvent, itemId: number) => void;
    handleDragOver: (event: DragEvent, targetItemId?: number) => void;
    handleDrop: (event: DragEvent, targetItemId: number) => Promise<void>;
    handleDragEnd: () => void;
    dragInsertIndex: number | null;
}

export default function useDragAndDrop(
    items: Observable<Item[]>,
    highlightedItems: SvelteSet<number>
): UseDragAndDropReturn {
    let draggingItemId: number | null = $state(null);
    let dragInsertIndex: number | null = $state(null);

    // Keep a reactive snapshot of the current items emitted by the observable
    let itemsSnapshot: Item[] = $state([]);
    const subscription = items.subscribe((value) => {
        itemsSnapshot = value ?? [];
    });
    onDestroy(() => subscription?.unsubscribe?.());

    function handleDragStart(event: DragEvent, itemId: number) {
        draggingItemId = itemId;
        // Keep the source id in dataTransfer for fallback cases
        event.dataTransfer?.setData('text/plain', String(itemId));
    }

    function handleDragOver(event: DragEvent, targetItemId?: number) {
        event.preventDefault();
        const el = event.currentTarget as HTMLElement;
        let targetId = targetItemId;
        if (targetId == null) {
            const idAttr = el.getAttribute('data-id');
            if (!idAttr) {
                dragInsertIndex = null;
                return;
            }
            targetId = parseInt(idAttr, 10);
        }
        // If dragging a highlighted group and hovering over one of the group items, hide indicator
        const isGroupMove =
            draggingItemId != null && highlightedItems.size > 0 && highlightedItems.has(draggingItemId);
        if (isGroupMove && highlightedItems.has(targetId)) {
            dragInsertIndex = null;
            return;
        }

        const rect = el.getBoundingClientRect();
        const dropAfter = event.clientY > rect.top + rect.height / 2;

        const idx = itemsSnapshot.findIndex((i: Item) => i.id === targetId);
        if (idx === -1) {
            dragInsertIndex = null;
            return;
        }

        dragInsertIndex = idx + (dropAfter ? 1 : 0);

    }

    async function handleDrop(event: DragEvent, targetItemId: number) {
        event.preventDefault();

        const sourceId =
            draggingItemId ?? parseInt(event.dataTransfer?.getData('text/plain') || '', 10);
        if (!sourceId) {
            resetDragState();
            return;
        }

        // Determine if we are moving a group: move all highlighted items together
        const isGroupMove = highlightedItems.size > 0 && highlightedItems.has(sourceId);
        const groupIds: number[] = isGroupMove
            ? itemsSnapshot.filter((i) => i.id != null && highlightedItems.has(i.id!)).map((i) => i.id!)
            : [sourceId];

        // No-op if target is inside the group being moved
        if (groupIds.includes(targetItemId)) {
            resetDragState();
            return;
        }

        const currentItems = [...itemsSnapshot];

        // Remove all items being moved, preserving their original relative order
        const movedItems: Item[] = [];
        for (const id of groupIds) {
            const idx = currentItems.findIndex((item) => item.id === id);
            if (idx !== -1) {
                const [mi] = currentItems.splice(idx, 1);
                movedItems.push(mi);
            }
        }

        // Determine insertion position (before/after) based on cursor position
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const dropAfter = event.clientY > rect.top + rect.height / 2;

        let insertionIndex = currentItems.findIndex((item) => item.id === targetItemId);
        if (insertionIndex === -1) {
            resetDragState();
            return;
        }
        if (dropAfter) insertionIndex += 1;

        // Insert the moved items as a contiguous block
        currentItems.splice(insertionIndex, 0, ...movedItems);

        await Promise.all(
            currentItems.map((item, index) => {
                if (item.id == null) return Promise.resolve();
                return db.items.update(item.id, {
                    order: index + 1,
                    updated_at: new SvelteDate()
                });
            })
        );

        resetDragState();
    }

    function handleDragEnd() {
        resetDragState();
    }

    function resetDragState() {
        draggingItemId = null;
        dragInsertIndex = null;
    }

    return {
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleDragEnd,
        get dragInsertIndex() { return dragInsertIndex; },
        set dragInsertIndex(value: number | null) { dragInsertIndex = value; }
    };
}