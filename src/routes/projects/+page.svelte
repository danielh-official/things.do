<script lang="ts">
	import { getProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import List from '$lib/components/List.Project.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Project/DeleteSelected.project.button.component.svelte';

	let projects = liveQuery(() => getProjects());
</script>

<svelte:head>
	<title>Projects | Things.do</title>
</svelte:head>

<List {projects}>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

			<ClearSelected {clearHighlightsForAllItems} />
		</ContextMenu>
	{/snippet}
</List>
