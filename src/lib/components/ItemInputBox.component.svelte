<script lang="ts">
	let {
		addingNewItem = $bindable()
	}: {
		addingNewItem: boolean;
	} = $props();
</script>

<input
	class="w-full rounded border border-gray-300 p-2 dark:bg-gray-700 dark:text-white"
	type="text"
	id="new-item-input"
	placeholder="Enter item..."
	onfocus={() => (addingNewItem = true)}
	onblur={() => (addingNewItem = false)}
/>
