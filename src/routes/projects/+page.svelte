<script lang="ts">
	import { getProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import List from '$lib/components/List.Project.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	// import DeleteSelected from '$lib/components/Buttons/Todo/DeleteSelected.todo.button.component.svelte';
	// import SendToThings3 from '$lib/components/Buttons/Todo/SendToThings3.todo.button.component.svelte';
	// import UnattachFromThings3 from '$lib/components/Buttons/Todo/UnattachFromThings3.todo.button.component.svelte';

	let projects = liveQuery(() => getProjects());
</script>

<svelte:head>
	<title>Projects | Things.do</title>
</svelte:head>

<List {projects}>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			{#snippet children()}
				<!--
			
				TODO: These buttons won't work because they only affect todos, and the highlightedItems in this context are projects. For now, we should just have DeleteSelected for projects. We can save Things 3 syncing for later.
			
				<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

				<SendToThings3 {highlightedItems} />

				<UnattachFromThings3 {highlightedItems} /> -->

				<!-- Clear Selected works with both todos and projects, so it's good. -->
				<ClearSelected {clearHighlightsForAllItems} />
			{/snippet}
		</ContextMenu>
	{/snippet}
</List>
