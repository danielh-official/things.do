<script lang="ts">
	let {
		highlightedItems = $bindable(),
		deleteHighlightedItems,
		clearHighlightsForAllItems
	}: {
		highlightedItems: Set<number>;
		deleteHighlightedItems: () => Promise<void>;
		clearHighlightsForAllItems: () => void;
	} = $props();
</script>

<div>
	<!-- Box for showing options for showing controls for selected items. -->
	{#if highlightedItems.size > 0}
		<div
			class="fixed bottom-4 left-1/2 flex -translate-x-1/2 transform flex-col space-x-4 gap-y-4 rounded border border-gray-300 bg-white p-4 shadow-lg"
		>
			<p>{highlightedItems.size} item(s) selected</p>
			<div class="flex space-x-4">
				<button
					class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
					onclick={deleteHighlightedItems}
				>
					Delete Selected Items
				</button>
				<button
					class="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
					onclick={clearHighlightsForAllItems}
				>
					Clear Selected Items
				</button>
			</div>
		</div>
	{/if}
</div>
