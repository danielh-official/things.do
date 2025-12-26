<script lang="ts">
	import type { Item } from '$lib/db';
	import { TagSolid } from 'flowbite-svelte-icons';

	let {
		item = $bindable(),
		openTagInput
	}: {
		item: Item;
		openTagInput: () => void;
	} = $props();
</script>

<div>
	{#if !(item.tag_ids && item.tag_ids.length)}
		<button class="ml-auto text-sm" title="Add tag" onclick={openTagInput}>
			<TagSolid class="inline h-6 w-6" />
		</button>
	{/if}
</div>
