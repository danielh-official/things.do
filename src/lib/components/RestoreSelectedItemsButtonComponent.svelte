<script lang="ts">
    let {
        restoreHighlightedItems
    }: {
        restoreHighlightedItems: () => Promise<void>;
    } = $props();
</script>

<button
	class="cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
	onclick={restoreHighlightedItems}
>
	Restore Selected Items
</button>
