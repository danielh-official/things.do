<script lang="ts">
	import type { Tag } from '$lib/db';

	let {
		availableTags = $bindable(),
		selectedTagIds = $bindable(),
		onFilterChange
	}: {
		availableTags: Tag[];
		selectedTagIds: number[];
		onFilterChange?: (selectedIds: number[]) => void;
	} = $props();

	function toggleTag(tagId: number) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
		onFilterChange?.(selectedTagIds);
	}

	function clearFilters() {
		selectedTagIds = [];
		onFilterChange?.(selectedTagIds);
	}
</script>

{#if availableTags.length > 0}
	<div class="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter by Tags</h3>
			{#if selectedTagIds.length > 0}
				<button
					onclick={clearFilters}
					class="text-xs text-blue-600 hover:underline dark:text-blue-400"
				>
					Clear filters
				</button>
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each availableTags as tag (tag.id)}
				<button
					onclick={() => toggleTag(tag.id)}
					class={`rounded-full px-3 py-1 text-sm transition-colors ${
						selectedTagIds.includes(tag.id)
							? 'bg-blue-500 text-white hover:bg-blue-600'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
					}`}
				>
					{tag.name}
				</button>
			{/each}
		</div>
	</div>
{/if}
