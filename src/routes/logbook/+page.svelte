<script lang="ts">
	import TodosList from '$lib/components/List.Todo.component.svelte';
	import ProjectsList from '$lib/components/List.Project.component.svelte';
	import { db } from '$lib/db';
	import { getLoggedTodos, getLoggedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import RestoreSelected from '$lib/components/Buttons/RestoreSelected.button.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/DeleteSelected.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';

	let todos = liveQuery(() => getLoggedTodos());
	let projects = liveQuery(() => getLoggedProjects());
	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Logbook | Things.do</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Logbook</h1>

{#if $projects?.length > 0}
	<h2 class="mt-6 mb-2 text-lg font-semibold">Completed Projects</h2>
	<ProjectsList {projects}>
		{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
			<ContextMenu show={showMenu} x={menuX} y={menuY}>
				{#snippet children()}
					<RestoreSelected {highlightedItems} {clearHighlightsForAllItems} />

					<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

					<ClearSelected {clearHighlightsForAllItems} />
				{/snippet}
			</ContextMenu>
		{/snippet}
	</ProjectsList>
{/if}

{#if $todos?.length > 0}
	<h2 class="mt-6 mb-2 text-lg font-semibold">Completed To-Dos</h2>
	<TodosList {todos} {tags}>
		{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
			<ContextMenu show={showMenu} x={menuX} y={menuY}>
				{#snippet children()}
					<RestoreSelected {highlightedItems} {clearHighlightsForAllItems} />

					<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

					<ClearSelected {clearHighlightsForAllItems} />
				{/snippet}
			</ContextMenu>
		{/snippet}
	</TodosList>
{/if}

{#if (!$todos || $todos.length === 0) && (!$projects || $projects.length === 0)}
	<p class="text-gray-500">No completed items yet.</p>
{/if}
