<script lang="ts">
	import { db, type Project } from '$lib/db';
	import { getProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import List from '$lib/components/List.Project.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Project/DeleteSelected.project.button.component.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';

	let allProjects = liveQuery(() => getProjects());
	let tags = liveQuery(() => db.tags.toArray());

	let selectedTagIds = $state<number[]>([]);
	let showNoTagFilter = $state(false);

	// Collect tags used by current items
	let availableTags = $derived.by(() => {
		if (!$allProjects || !$tags) return [];
		
		const usedTagIds = new Set<number>();
		for (const project of $allProjects) {
			if (project.tag_ids) {
				for (const tagId of project.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}
		
		return $tags.filter(tag => usedTagIds.has(tag.id)).sort((a, b) => a.name.localeCompare(b.name));
	});

	// Filter projects based on selected tags - using $effect to create filtered liveQuery
	let projects = $state(allProjects);
	
	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			projects = allProjects;
		} else if (showNoTagFilter) {
			// Show only items without tags
			projects = liveQuery(async () => {
				const items = await getProjects();
				return items.filter((project: Project) => !project.tag_ids || project.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			projects = liveQuery(async () => {
				const items = await getProjects();
				return items.filter((project: Project) => 
					project.tag_ids && filterIds.every(tagId => project.tag_ids.includes(tagId))
				);
			});
		}
	});
</script>

<svelte:head>
	<title>Projects | Things.do</title>
</svelte:head>

<TagFilter bind:availableTags bind:selectedTagIds bind:showNoTagFilter />

<List {projects}>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

			<ClearSelected {clearHighlightsForAllItems} />
		</ContextMenu>
	{/snippet}
</List>
