<script lang="ts">
	let {
		highlightedItems = $bindable(),
		deleteHighlightedItems,
		restoreHighlightedItems,
		clearHighlightsForAllItems
	}: {
		highlightedItems: Set<number>;
		deleteHighlightedItems: () => Promise<void>;
		restoreHighlightedItems?: () => Promise<void>;
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
			<div class="flex flex-col space-y-4">
				{#if !!restoreHighlightedItems}
					<button
						class="cursor-pointer rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
						onclick={restoreHighlightedItems}
					>
						Restore Selected Items
					</button>
				{/if}
				<button
					class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
					onclick={deleteHighlightedItems}
				>
					{!!restoreHighlightedItems ? 'Permanently' : ''} Delete Selected Items
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
