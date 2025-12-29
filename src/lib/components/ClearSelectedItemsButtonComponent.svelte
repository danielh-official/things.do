<script lang="ts">
	let {
		clearHighlightsForAllItems
	}: {
		clearHighlightsForAllItems: () => void;
	} = $props();
</script>

<button
	class="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
	onclick={clearHighlightsForAllItems}
>
	Clear Selected Items
</button>
