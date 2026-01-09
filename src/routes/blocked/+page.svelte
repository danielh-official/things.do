<script lang="ts">
	import { getBlockedTodos, getBlockedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import TodoList from '$lib/components/List.Todo.component.svelte';
	import ProjectList from '$lib/components/List.Project.component.svelte';
	import { db, type Item, type Project } from '$lib/db';
	import TagFilter from '$lib/components/TagFilter.component.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let allBlockedTodos = liveQuery(() => getBlockedTodos());
	let allBlockedProjects = liveQuery(() => getBlockedProjects());
	let tags = liveQuery(() => db.tags.toArray());

	let selectedTagIds = $state<number[]>([]);
	let showNoTagFilter = $state(false);

	// Collect tags used by current items
	let availableTags = $derived.by(() => {
		if (!$allBlockedTodos || !$allBlockedProjects || !$tags) return [];

		const usedTagIds = new SvelteSet<number>();
		for (const todo of $allBlockedTodos) {
			if (todo.tag_ids) {
				for (const tagId of todo.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}
		for (const project of $allBlockedProjects) {
			if (project.tag_ids) {
				for (const tagId of project.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}

		return $tags
			.filter((tag) => usedTagIds.has(tag.id))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	// Filter items based on selected tags - using $effect to create filtered liveQuery
	let blockedTodos = $state(allBlockedTodos);
	let blockedProjects = $state(allBlockedProjects);

	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			blockedTodos = allBlockedTodos;
		} else if (showNoTagFilter) {
			// Show only items without tags
			blockedTodos = liveQuery(async () => {
				const items = await getBlockedTodos();
				return items.filter((todo: Item) => !todo.tag_ids || todo.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			blockedTodos = liveQuery(async () => {
				const items = await getBlockedTodos();
				return items.filter(
					(todo: Item) => todo.tag_ids && filterIds.every((tagId) => todo.tag_ids.includes(tagId))
				);
			});
		}
	});

	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			blockedProjects = allBlockedProjects;
		} else if (showNoTagFilter) {
			// Show only items without tags
			blockedProjects = liveQuery(async () => {
				const items = await getBlockedProjects();
				return items.filter((project: Project) => !project.tag_ids || project.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			blockedProjects = liveQuery(async () => {
				const items = await getBlockedProjects();
				return items.filter(
					(project: Project) =>
						project.tag_ids && filterIds.every((tagId) => project.tag_ids.includes(tagId))
				);
			});
		}
	});
</script>

<svelte:head>
	<title>Blocked | Things.do</title>
</svelte:head>

<TagFilter bind:availableTags bind:selectedTagIds bind:showNoTagFilter />

{#if $blockedTodos?.length || $blockedProjects?.length}
	{#if $blockedProjects?.length}
		<div class="mb-6">
			<h2 class="mb-2 px-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
				Blocked Projects ({$blockedProjects.length})
			</h2>
			<ProjectList projects={blockedProjects} />
		</div>
	{/if}

	{#if $blockedTodos?.length}
		<div>
			<h2 class="mb-2 px-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
				Blocked To-dos ({$blockedTodos.length})
			</h2>
			<TodoList
				todos={blockedTodos}
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
			/>
		</div>
	{/if}
{:else}
	<p class="p-4 text-sm text-gray-500 dark:text-gray-400">No blocked items right now.</p>
{/if}
