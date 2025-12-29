<script lang="ts">
	let {
		highlightedItems = $bindable(),
		children
	}: {
		highlightedItems: Set<number>;
		children: any;
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
				{@render children()}
			</div>
		</div>
	{/if}
</div>
