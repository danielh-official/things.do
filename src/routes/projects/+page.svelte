<script lang="ts">
	import { getProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import List from '$lib/components/List.Project.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import DeleteSelected from '$lib/components/Buttons/Todo/DeleteSelected.todo.button.component.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import SendToThings3 from '$lib/components/Buttons/Todo/SendToThings3.todo.button.component.svelte';
	import UnattachFromThings3 from '$lib/components/Buttons/Todo/UnattachFromThings3.todo.button.component.svelte';

	let projects = liveQuery(() => getProjects());
</script>

<svelte:head>
	<title>Projects | Things.do</title>
</svelte:head>

<List {projects}>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			{#snippet children()}
				<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

				<ClearSelected {clearHighlightsForAllItems} />

				<SendToThings3 {highlightedItems} />

				<UnattachFromThings3 {highlightedItems} />
			{/snippet}
		</ContextMenu>
	{/snippet}
</List>
