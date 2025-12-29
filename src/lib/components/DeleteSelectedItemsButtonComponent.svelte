<script lang="ts">
	let {
		deleteHighlightedItems
	}: {
		deleteHighlightedItems: () => void;
	} = $props();
</script>

<button
	class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
	onclick={deleteHighlightedItems}
>
	Delete Selected Items
</button>
