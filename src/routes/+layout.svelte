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

	let unloggedFocusingTodosCount = $derived(
		$focusingTodos?.filter((_) => {
			return !(_.logged_at || _.logged_status);
		}).length ?? 0
	);
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

	let draggedProjectId: number | null = $state(null);
	let dragOverProjectId: number | null = $state(null);
	let dropPosition: 'above' | 'below' | null = $state(null);
	let isDraggingTodo = $state(false);

	// Sidebar resizing
	let sidebarWidth = $state(256); // 16rem = 256px (w-64)
	let isResizing = $state(false);
	const MIN_SIDEBAR_WIDTH = 256; // w-64

	function handleResizeStart(event: MouseEvent) {
		isResizing = true;
		event.preventDefault();
	}

	function handleResizeMove(event: MouseEvent) {
		if (!isResizing) return;

		const maxWidth = window.innerWidth / 2;
		const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(event.clientX, maxWidth));
		sidebarWidth = newWidth;
	}

	function handleResizeEnd() {
		isResizing = false;
	}

	function handleDragStart(event: DragEvent, projectId: number) {
		draggedProjectId = projectId;
		if (event.dataTransfer) {
			event.dataTransfer.setData('application/x-project-item', projectId.toString());
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDrop(event: DragEvent, projectId: number) {
		event.preventDefault();

		const isTodoItem = event.dataTransfer?.types.includes('application/x-todo-item');
		const isProjectItem = event.dataTransfer?.types.includes('application/x-project-item');

		// Handle todo item being dropped on project
		if (isTodoItem) {
			const todoId = parseInt(event.dataTransfer?.getData('application/x-todo-item') || '', 10);
			if (todoId) {
				db.todos.update(todoId, {
					parent_id: projectId,
					updated_at: new SvelteDate()
				});
			}
			dragOverProjectId = null;
			dropPosition = null;
			isDraggingTodo = false;
			return;
		}

		// Handle project reordering
		if (!isProjectItem) {
			dragOverProjectId = null;
			dropPosition = null;
			draggedProjectId = null;
			isDraggingTodo = false;
			return;
		}

		dragOverProjectId = null;
		dropPosition = null;

		if (draggedProjectId) {
			const draggedProjectIndex = $projects.findIndex((p) => p.id === draggedProjectId);
			const targetProjectIndex = $projects.findIndex((p) => p.id === projectId);

			if (draggedProjectIndex !== -1 && targetProjectIndex !== -1) {
				const updatedProjects = [...$projects];
				const [movedProject] = updatedProjects.splice(draggedProjectIndex, 1);
				updatedProjects.splice(targetProjectIndex, 0, movedProject);
				// Update the order property here based on the new positions
				updatedProjects.forEach((project, index) => {
					project.order = index;
				});
				// Save the updated order to the database
				updatedProjects.forEach(async (project) => {
					await db.projects.update(project.id, { order: project.order });
				});
			}
		}

		draggedProjectId = null;
	}

	function handleDragOver(event: DragEvent, projectId: number) {
		const isTodoItem = event.dataTransfer?.types.includes('application/x-todo-item');
		const isProjectItem = event.dataTransfer?.types.includes('application/x-project-item');

		// Accept both project items (for reordering) and todo items (for assignment)
		if (!isTodoItem && !isProjectItem) {
			dragOverProjectId = null;
			dropPosition = null;
			isDraggingTodo = false;
			return;
		}

		event.preventDefault();
		dragOverProjectId = projectId;

		// For todo items, show full highlight (no position)
		if (isTodoItem) {
			isDraggingTodo = true;
			dropPosition = null;
			return;
		}

		// For project items, show position indicator
		isDraggingTodo = false;

		// Determine if dropping above or below based on mouse position
		const element = event.currentTarget as HTMLElement;
		const rect = element.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		dropPosition = event.clientY < midpoint ? 'above' : 'below';
	}

	function handleDragLeave() {
		dragOverProjectId = null;
		dropPosition = null;
		isDraggingTodo = false;
	}

	function handleDragEnd() {
		draggedProjectId = null;
		dragOverProjectId = null;
		dropPosition = null;
		isDraggingTodo = false;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<svelte:window onmousemove={handleResizeMove} onmouseup={handleResizeEnd} />

<!-- MARK: Banner for notice of unstable demo -->
<div
	class="border-default border-b bg-yellow-100 p-2 text-center text-sm dark:bg-yellow-900 dark:text-yellow-300"
>
	<p><strong>⚠️ NOTICE</strong></p>
	<p>
		This project is in active development and in the beginning stages. Features and functionality
		may change frequently and bugs are to be expected.
	</p>
	<p>
		Also, data may periodically reset. All data is currently stored locally on your browser and any
		clearing of storage or usage of another browser will result in a fresh state.
	</p>
	<p><b>Use at your own risk!</b></p>
	<p>
		For issues or feedback, please visit our <a
			href="https://github.com/danielh-official/things.do/issues"
			target="_blank"
			class="text-blue-600 hover:underline dark:text-white">GitHub repository</a
		>.
	</p>
</div>

<div class="flex">
	<aside
		id="default-sidebar"
		class="relative min-h-screen bg-gray-100 transition-transform sm:translate-x-0 dark:bg-gray-800"
		style="width: {sidebarWidth}px"
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
						{#if unloggedFocusingTodosCount > 0}
							<span
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
								>{unloggedFocusingTodosCount}</span
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
				<hr class="my-2 border-t border-gray-600 dark:border-gray-300" />
				<li>
					<button
						onclick={createNewProject}
						class="text-body rounded-base group flex w-full items-center px-2 py-1.5 text-left hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
					>
						<span class="ms-3 flex-1 whitespace-nowrap">+ New Project</span>
					</button>
				</li>
				{#if projectsCount > 0}
					{#each $projects.sort((a, b) => a.order - b.order).slice(0, 5) ?? [] as project}
						<li
							draggable="true"
							ondragstart={(event: DragEvent) => handleDragStart(event, project.id)}
							ondrop={(event: DragEvent) => handleDrop(event, project.id)}
							ondragover={(event: DragEvent) => handleDragOver(event, project.id)}
							ondragleave={handleDragLeave}
							ondragend={handleDragEnd}
							class={{
								'border-t-2 border-blue-400 dark:border-blue-500':
									dragOverProjectId === project.id &&
									draggedProjectId !== project.id &&
									dropPosition === 'above' &&
									!isDraggingTodo,
								'border-b-2 border-blue-400 dark:border-blue-500':
									dragOverProjectId === project.id &&
									draggedProjectId !== project.id &&
									dropPosition === 'below' &&
									!isDraggingTodo,
								'bg-blue-100 dark:bg-blue-900/50':
									dragOverProjectId === project.id && isDraggingTodo,
								'opacity-50': draggedProjectId === project.id,
								'rounded-base': true
							}}
						>
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
								<span class="ms-3 flex-1 truncate whitespace-nowrap">{project.title}</span>
							</a>
						</li>
					{/each}
				{/if}
				{#if projectsCount > 0}
					<li>
						<a
							href={resolve('/projects')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5 dark:text-white': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/projects'
							}}
						>
							<span class="ms-3 flex-1 whitespace-nowrap">View All Projects</span>
						</a>
					</li>
				{/if}
			</ul>

			<!-- Show at bottom -->
			<ul
				class="absolute bottom-4 space-y-2 font-medium"
				style="width: calc({sidebarWidth}px - 1.5rem)"
			>
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
				{/if}
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

		<!-- Resize handle -->
		<button
			class="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize transition-colors hover:bg-blue-500"
			class:bg-blue-500={isResizing}
			onmousedown={handleResizeStart}
			aria-label="Resize sidebar"
		></button>
	</aside>

	<main class="w-full max-w-xl p-4 md:mx-auto">
		{@render children()}
	</main>

	<ToastHost />
</div>
