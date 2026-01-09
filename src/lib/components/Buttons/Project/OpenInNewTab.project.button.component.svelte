<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	let {
		highlightedItems
	}: {
		highlightedItems: SvelteSet<number>;
	} = $props();

	function openInNewTab() {
		const projectIds = Array.from(highlightedItems);
		projectIds.forEach((projectId) => {
			const url = `/projects/${projectId}`;
			window.open(url, '_blank');
		});
	}
</script>

<button
	class="cursor-pointer block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
	onclick={openInNewTab}
	data-testid="open-in-new-tab-button"
>
	Open in New Tab{highlightedItems.size > 1 ? 's' : ''}
</button>
