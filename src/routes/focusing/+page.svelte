<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { getFocusingTodos, getTagAndDescendants, getProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import TodoList from '$lib/components/List.Todo.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Todo/DeleteSelected.todo.button.component.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import SendToThings3 from '$lib/components/Buttons/Todo/SendToThings3.todo.button.component.svelte';
	import UnattachFromThings3 from '$lib/components/Buttons/Todo/UnattachFromThings3.todo.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import SetAsideForLater from '$lib/components/Buttons/Todo/SetAsideForLater.todo.button.component.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let allTodos = liveQuery(() => getFocusingTodos());
	let tags = liveQuery(() => db.tags.toArray());

	let selectedTagIds = $state<number[]>([]);
	let showNoTagFilter = $state(false);

	// Collect tags used by current items and check if there are items without tags
	let availableTags = $derived.by(() => {
		if (!$allTodos || !$tags) return [];

		const usedTagIds = new SvelteSet<number>();
		for (const todo of $allTodos) {
			if (todo.tag_ids) {
				for (const tagId of todo.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}

		return $tags
			.filter((tag) => usedTagIds.has(tag.id))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	let hasItemsWithoutTags = $derived.by(() => {
		if (!$allTodos) return false;
		return $allTodos.some((todo) => !todo.tag_ids || todo.tag_ids.length === 0);
	});

	// Filter todos based on selected tags - using $effect to create filtered liveQuery
	let todos = $state(allTodos);

	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			todos = allTodos;
		} else if (showNoTagFilter) {
			// Show only items without tags (excluding inherited tags from projects)
			todos = liveQuery(async () => {
				const items = await getFocusingTodos();
				const projects = await getProjects();
				const projectsById = new Map(projects.map((p) => [p.id, p]));

				return items.filter((todo: Item) => {
					const hasOwnTags = todo.tag_ids && todo.tag_ids.length > 0;
					const hasInheritedTags =
						todo.parent_id &&
						projectsById.get(todo.parent_id)?.tag_ids &&
						projectsById.get(todo.parent_id)!.tag_ids.length > 0;
					return !hasOwnTags && !hasInheritedTags;
				});
			});
		} else {
			// Create a new liveQuery that depends on the current filter
			// Check both direct tags and inherited tags from project
			const filterIds = [...selectedTagIds];
			todos = liveQuery(async () => {
				const items = await getFocusingTodos();
				const projects = await getProjects();
				const projectsById = new Map(projects.map((p) => [p.id, p]));

				// Build expanded tag sets for each filter tag
				const expandedSets: Set<number>[] = [];
				for (const tagId of filterIds) {
					const descendants = await getTagAndDescendants(tagId);
					expandedSets.push(new Set(descendants));
				}

				return items.filter((todo: Item) => {
					// Collect effective tags (own + inherited from project)
					const effectiveTags = new SvelteSet<number>();
					if (todo.tag_ids) {
						todo.tag_ids.forEach((id) => effectiveTags.add(id));
					}
					if (todo.parent_id) {
						const project = projectsById.get(todo.parent_id);
						if (project?.tag_ids) {
							project.tag_ids.forEach((id) => effectiveTags.add(id));
						}
					}

					if (effectiveTags.size === 0) return false;

					// Item must have at least one tag from each expanded set
					return expandedSets.every((set) => {
						return Array.from(set).some((tagId) => effectiveTags.has(tagId));
					});
				});
			});
		}
	});
</script>

<svelte:head>
	<title>Focusing | Things.do</title>
</svelte:head>

<TagFilter bind:availableTags bind:selectedTagIds bind:showNoTagFilter {hasItemsWithoutTags} />

<TodoList
	{todos}
	{tags}
	defaultTodoAdditionParams={{
		notes: '',
		start_date: null,
		deadline: null,
		start: null,
		tag_ids: [],
		blocked_by: [],
		evening: false,
		checklist: [],
		logged_at: null,
		logged_status: null,
		deleted_at: null,
		later: false,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			<SetAsideForLater {highlightedItems} {clearHighlightsForAllItems} />

			<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

			<ClearSelected {clearHighlightsForAllItems} />

			<SendToThings3 {highlightedItems} />

			<UnattachFromThings3 {highlightedItems} />
		</ContextMenu>
	{/snippet}
</TodoList>
