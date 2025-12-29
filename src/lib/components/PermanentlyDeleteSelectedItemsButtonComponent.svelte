<script lang="ts">
	let {
		permanentlyDeleteHighlightedItems
	}: {
		permanentlyDeleteHighlightedItems: () => Promise<void>;
	} = $props();
</script>

<button
	class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
	onclick={permanentlyDeleteHighlightedItems}
>
	Permanently Delete Selected Items
</button>
