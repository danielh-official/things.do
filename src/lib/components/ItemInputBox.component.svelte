<script lang="ts">
	let {
		addingNewItem = $bindable()
	}: {
		addingNewItem: boolean;
	} = $props();
</script>

<input
	class="w-full rounded border border-gray-300 p-2"
	type="text"
	id="new-item-input"
	placeholder="Enter item..."
	onfocus={() => (addingNewItem = true)}
	onblur={() => (addingNewItem = false)}
/>
