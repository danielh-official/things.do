<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		getBlockedTodos,
		getFocusingTodos,
		getLaterTodos,
		getTags,
		getTrashedTodos,
		getProjects
	} from '$lib';
	import { liveQuery } from 'dexie';
	import ToastHost from '$lib/components/ToastHost.component.svelte';
	import {
		ClockOutline,
		CloseCircleSolid,
		EyeOutline,
		TagOutline,
		TrashBinOutline,
		CogOutline,
		FolderOutline
	} from 'flowbite-svelte-icons';
	import { db } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';

	let { children } = $props();

	let focusingTodos = liveQuery(() => getFocusingTodos());
	let laterTodos = liveQuery(() => getLaterTodos());
	let blockedTodos = liveQuery(() => getBlockedTodos());
	let trashedTodos = liveQuery(() => getTrashedTodos());
	let tags = liveQuery(() => getTags());
	let projects = liveQuery(() => getProjects());

	let focusingTodosCount = $derived($focusingTodos?.length ?? 0);
	let laterTodosCount = $derived($laterTodos?.length ?? 0);
	let blockedTodosCount = $derived($blockedTodos?.length ?? 0);
	let trashedTodosCount = $derived($trashedTodos?.length ?? 0);
	let tagsCount = $derived($tags?.length ?? 0);
	let projectsCount = $derived($projects?.length ?? 0);

	async function createNewProject() {
		const name = prompt('New project name?')?.trim();
		if (!name) return;

		const allProjects = await db.projects.toArray();
		const order = allProjects.length;
		const now = new SvelteDate();

		await db.projects.add({
			title: name,
			notes: null,
			start: null,
			start_date: null,
			deadline: null,
			order,
			tag_ids: [],
			evening: false,
			created_at: now,
			updated_at: now,
			deleted_at: null,
			logged_at: null,
			logged_status: null,
			blocked_by: [],
			later: false,
			parent_id: null,
			parent_things_id: null,
			things_id: null
		});
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex dark:bg-slate-800 dark:text-white">
	<aside
		id="default-sidebar"
		class="min-h-screen w-64 bg-gray-100 transition-transform sm:translate-x-0 dark:bg-gray-800"
		aria-label="Sidebar"
	>
		<div class="border-default h-full overflow-y-auto border-e px-3 py-4">
			<ul class="space-y-2 font-medium">
				<li>
					<a
						href={resolve('/focusing')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
							'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/focusing'
						}}
					>
						<EyeOutline class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75" />
						<span class="ms-3 flex-1 whitespace-nowrap">Focusing</span>
						{#if focusingTodosCount > 0}
							<span
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
								>{focusingTodosCount}</span
							>
						{/if}
					</a>
				</li>
				{#if laterTodosCount > 0}
					<li>
						<a
							href={resolve('/later')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/later'
							}}
						>
							<ClockOutline
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Later</span>
						</a>
					</li>
				{/if}
				{#if blockedTodosCount > 0}
					<li>
						<a
							href={resolve('/blocked')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/blocked'
							}}
						>
							<CloseCircleSolid
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Blocked</span>
						</a>
					</li>
				{/if}
				{#if trashedTodosCount > 0}
					<li>
						<a
							href={resolve('/trash')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/trash'
							}}
						>
							<TrashBinOutline
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Trash</span>
						</a>
					</li>
				{/if}
				{#if tagsCount > 0}
					<li>
						<a
							href={resolve('/tags')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/tags'
							}}
						>
							<TagOutline
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Tags</span>
						</a>
					</li>
					<hr class="my-2 border-t border-gray-300 dark:border-gray-600" />
				{/if}
				<li>
					<button
						onclick={createNewProject}
						class="text-body rounded-base group flex w-full items-center px-2 py-1.5 text-left hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
					>
						<FolderOutline
							class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						/>
						<span class="ms-3 flex-1 whitespace-nowrap">+ New Project</span>
					</button>
				</li>
				{#if projectsCount > 0}
					{#each $projects ?? [] as project}
						<li>
							<a
								href={resolve(`/projects/${project.id}`)}
								class={{
									'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
									'bg-gray-300 dark:bg-gray-600': page.url.pathname === `/projects/${project.id}`
								}}
							>
								<FolderOutline
									class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
								/>
								<span class="ms-3 flex-1 whitespace-nowrap">{project.title}</span>
							</a>
						</li>
					{/each}
				{/if}
			</ul>

			<!-- Show at bottom -->
			<ul class="absolute bottom-4 w-56 space-y-2 font-medium">
				<li>
					<a
						href={resolve('/settings')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
							'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/settings'
						}}
					>
						<CogOutline class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75" />
						<span class="ms-3 flex-1 whitespace-nowrap">Settings</span>
					</a>
				</li>
			</ul>
		</div>
	</aside>

	<main class="w-full max-w-xl p-4 md:mx-auto">
		{@render children()}
	</main>

	<ToastHost />
</div>
