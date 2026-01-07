<script lang="ts">
	import { getBlockedTodos, getBlockedProjects } from '$lib';
	import { liveQuery } from 'dexie';
	import TodoList from '$lib/components/List.Todo.component.svelte';
	import ProjectList from '$lib/components/List.Project.component.svelte';
	import { db } from '$lib/db';

	let blockedTodos = liveQuery(() => getBlockedTodos());
	let blockedProjects = liveQuery(() => getBlockedProjects());
	let tags = liveQuery(() => db.tags.toArray());
</script>

<svelte:head>
	<title>Blocked | Things.do</title>
</svelte:head>

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
