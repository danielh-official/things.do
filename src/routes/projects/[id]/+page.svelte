<script lang="ts">
	import { db, type Item, type Project, type LogStatus, type Tag } from '$lib/db';
	import { getAllTodosForProject } from '$lib';
	import { liveQuery, type Observable } from 'dexie';
	import Todos from '$lib/components/List.Todo.component.svelte';
	import Todo from '$lib/components/Todo.component.svelte';
	import { page } from '$app/state';
	import { PenNibOutline, TagSolid, TagOutline, LockSolid } from 'flowbite-svelte-icons';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import DeleteSelected from '$lib/components/Buttons/Todo/DeleteSelected.todo.button.component.svelte';
	import SetAsideForLater from '$lib/components/Buttons/Todo/SetAsideForLater.todo.button.component.svelte';
	import FocusOnNow from '$lib/components/Buttons/Todo/FocusOnNow.todo.button.component.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import { tick } from 'svelte';

	let projectId = $derived(page.params.id ? parseInt(page.params.id, 10) : null);

	let allTodos: Observable<Item[]> | undefined = $state();
	let showLoggedTodos = $state(false);
	let loggedTodoOpenedItem: Item | null = $state(null);

	let tags = liveQuery(() => db.tags.toArray());

	let project: Omit<Project, 'created_at' | 'updated_at'> = $state({
		id: 1,
		title: '',
		notes: '',
		start: null,
		start_date: null,
		deadline: null,
		order: 0,
		tag_ids: [],
		evening: false,
		things_id: null,
		parent_id: null,
		parent_things_id: null,
		deleted_at: null,
		logged_at: null,
		logged_status: null,
		blocked_by: [],
		later: false
	});

	$effect(() => {
		if (projectId) {
			db.projects.get(projectId).then((proj) => {
				if (proj) {
					project = {
						id: proj.id,
						title: proj.title,
						notes: proj.notes,
						start: proj.start,
						start_date: proj.start_date,
						deadline: proj.deadline,
						order: proj.order,
						tag_ids: proj.tag_ids,
						evening: proj.evening,
						things_id: proj.things_id,
						parent_id: proj.parent_id,
						parent_things_id: proj.parent_things_id,
						deleted_at: proj.deleted_at,
						logged_at: proj.logged_at,
						logged_status: proj.logged_status,
						blocked_by: proj.blocked_by,
						later: proj.later
					};
				}
			});

			allTodos = liveQuery(() =>
				getAllTodosForProject(projectId ?? -1).then((items) =>
					items.sort((a, b) => a.order - b.order)
				)
			);
		}
	});

	// Create Observable for unlogged todos
	let todos = $derived.by(() => {
		if (!allTodos) return liveQuery(async () => []);
		return liveQuery(async () => {
			const items = await getAllTodosForProject(projectId ?? -1);
			return items.filter((todo) => !todo.logged_at).sort((a, b) => a.order - b.order);
		});
	});

	// Get logged todos separately (only those with logged_at set)
	let loggedTodos = $derived($allTodos?.filter((todo) => todo.logged_at) ?? []);
	let loggedTodosCount = $derived(loggedTodos.length);

	let editingTitle = $state(false);

	function startEditingTitle() {
		editingTitle = true;
		const input = document.getElementById('project-title-input') as HTMLInputElement;
		if (input) {
			input.focus();
			input.select();
		}
	}

	function updateProjectTitle(newTitle: string) {
		if (page.params.id) {
			db.projects.update(parseInt(page.params.id, 10), {
				title: newTitle,
				updated_at: new SvelteDate()
			});
		}
	}

	function updateProjectTitleOnKeydown(e: KeyboardEvent, newTitle: string) {
		if (e.key === 'Enter' || e.key === 'Escape') {
			e.preventDefault();
			editingTitle = false;
			updateProjectTitle(newTitle);
		}
	}

	function updateProjectTitleOnBlur(newTitle: string) {
		editingTitle = false;
		updateProjectTitle(newTitle);
	}

	function customKeydownBehavior(
		event: KeyboardEvent,
		highlightedItems: SvelteSet<number>,
		openedItem: Item | null,
		addingNewItem: boolean,
		defaultTodoAdditionParams:
			| Omit<Item, 'id' | 'order' | 'title' | 'created_at' | 'updated_at' | 'things_id'>
			| undefined,
		closeOpenedItem: () => void,
		clearHighlightsForAllItems: () => void,
		shouldPermanentlyDeleteHighlightedItems: boolean,
		permanentlyDeleteHighlightedItems: () => void,
		deleteHighlightedItems: () => void,
		addItem: ((event: KeyboardEvent) => void) | null
	) {
		if (editingTitle || editingNotes) {
			return;
		}

		if (!$allTodos) {
			return;
		}

		if (event.metaKey && (event.key === 'c' || event.key === 'C') && highlightedItems.size > 0) {
			event.preventDefault();
			const selectedItems = $allTodos.filter(
				(item: Item) => item.id != null && highlightedItems.has(item.id)
			);
			if (selectedItems.length > 0 && navigator.clipboard?.writeText) {
				const markdown = selectedItems.map((item) => `- ${item.title}`).join('\n');
				navigator.clipboard.writeText(markdown);
			}
			return;
		}

		if (event.code === 'Enter' && addingNewItem) {
			addItem?.(event);
			return;
		}

		if (event.code === 'Space' && !openedItem && !addingNewItem && defaultTodoAdditionParams) {
			const input = document.querySelector('input#new-item-input') as HTMLInputElement;
			if (input) {
				event.preventDefault();
				input.focus();
			}
			return;
		}

		if (event.key === 'Escape' && openedItem) {
			closeOpenedItem();
			return;
		}

		if (event.key === 'Escape' && highlightedItems.size > 0) {
			clearHighlightsForAllItems();
			return;
		}

		if (event.key === 'Backspace' && highlightedItems.size > 0 && !addingNewItem && !openedItem) {
			if (shouldPermanentlyDeleteHighlightedItems) {
				permanentlyDeleteHighlightedItems();
			} else {
				deleteHighlightedItems();
			}
			return;
		}

		if (event.key === 'f' && highlightedItems.size > 0) {
			event.preventDefault();
			// Get highlighted items and set all 'later' to false
			highlightedItems.forEach(async (itemId) => {
				await db.todos.update(itemId, { later: false, updated_at: new SvelteDate() });
			});
			clearHighlightsForAllItems();
			return;
		}

		if (event.key === 'l' && highlightedItems.size > 0) {
			event.preventDefault();
			// Get highlighted items and set all 'later' to true
			highlightedItems.forEach(async (itemId) => {
				await db.todos.update(itemId, { later: true, updated_at: new SvelteDate() });
			});
			clearHighlightsForAllItems();
			return;
		}
	}

	let notesTextarea: HTMLTextAreaElement | undefined = $state();

	let editingNotes = $state(false);

	function startEditingNotes() {
		editingNotes = true;
		setTimeout(() => {
			if (notesTextarea) {
				notesTextarea.style.height = 'auto';
				notesTextarea.style.height = notesTextarea.scrollHeight + 'px';
				notesTextarea.focus();
			}
		}, 0);
	}

	function autoResizeTextarea(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		textarea.style.height = 'auto';
		textarea.style.height = textarea.scrollHeight + 'px';
	}

	let pendingProjectLogTimeout: number | null = null;

	function cycleProjectStatus(id: number) {
		const currentStatus: LogStatus = project.logged_status as LogStatus;
		let newStatus: LogStatus;

		if (!currentStatus) {
			newStatus = 'completed';
		} else if (currentStatus === 'completed') {
			newStatus = 'canceled';
		} else {
			newStatus = null;
		}

		// Update local project object for reactive UI (status only, not logged_at yet)
		project = {
			...project,
			logged_status: newStatus
		};

		// Handle different status transitions
		if (newStatus === null) {
			// Immediately clear logged_at when unmarking
			if (pendingProjectLogTimeout) {
				clearTimeout(pendingProjectLogTimeout);
				pendingProjectLogTimeout = null;
			}
			db.projects.update(id, {
				logged_status: null,
				logged_at: null,
				updated_at: new SvelteDate()
			});
			project = {
				...project,
				logged_at: null
			};
		} else if (newStatus === 'completed' || newStatus === 'canceled') {
			// Update status in DB immediately (for UI feedback)
			db.projects.update(id, {
				logged_status: newStatus,
				updated_at: new SvelteDate()
			});

			// If transitioning from open to logged state, start the delay timer
			if (currentStatus === null) {
				// Delay setting logged_at (this triggers the filter)
				pendingProjectLogTimeout = setTimeout(() => {
					db.projects.update(id, {
						logged_at: new SvelteDate()
					});
					pendingProjectLogTimeout = null;
				}, 2000) as unknown as number;
			}
			// If already in a logged state (cycling between completed/canceled),
			// keep the existing delay timer running - don't clear it
		}
	}

	// Tags functionality for project
	let tagsForProject: Tag[] = $state([]);
	let tagInputOpen = $state(false);
	let tagInputText = $state('');
	let allTagOptions = $state<Tag[]>([]);
	let filteredTagOptions = $state<Tag[]>([]);
	let tagNameById: Record<number, string> = $state({});

	$effect(() => {
		const tagIds = project.tag_ids ?? [];
		updateTagsForProject(tagIds);
	});

	async function updateTagsForProject(tagIds: number[] | null | undefined) {
		const allTags = await db.tags.toArray();

		if (tagIds && tagIds.length > 0) {
			tagsForProject = allTags
				.filter((t) => tagIds?.includes(t.id))
				.sort((a, b) => a.order - b.order);
		} else {
			tagsForProject = [];
		}
	}

	$effect(() => {
		// Ensure names for current project's tags are loaded
		const ids = (project.tag_ids ?? []) as number[];
		if (ids.length > 0) {
			(async () => {
				const rows = await db.tags.bulkGet(ids);
				const mapUpdate: Record<number, string> = {};
				for (const row of rows) {
					if (row) mapUpdate[row.id] = row.name;
				}
				tagNameById = { ...tagNameById, ...mapUpdate };
			})();
		}
	});

	// Blockers UI state
	let blockerInputOpen = $state(false);
	let blockerInputText = $state('');
	let allBlockerOptions = $state<(Item | Project)[]>([]);
	let filteredBlockerOptions = $state<(Item | Project)[]>([]);
	let blockerTitleById: Record<number, string> = $state({});
	let selectedBlockers: SvelteSet<number> = new SvelteSet();
	let originalBlockers: number[] = [];

	$effect(() => {
		// Ensure titles for current project's blockers are loaded
		const ids = (project.blocked_by ?? []) as number[];
		if (ids.length > 0) {
			(async () => {
				const todos = await db.todos.bulkGet(ids);
				const projects = await db.projects.bulkGet(ids);
				const mapUpdate: Record<number, string> = {};
				for (const row of [...todos, ...projects]) {
					if (row) mapUpdate[row.id] = row.title;
				}
				blockerTitleById = { ...blockerTitleById, ...mapUpdate };
			})();
		}
	});

	$effect(() => {
		const q = tagInputText.trim().toLowerCase();
		const current = new Set<number>((project.tag_ids ?? []) as number[]);
		const opts = allTagOptions.filter((t) => !current.has(t.id));
		if (!q) {
			filteredTagOptions = opts.slice(0, 8);
			return;
		}
		const starts = opts.filter((t) => t.name.toLowerCase().startsWith(q));
		const contains = opts.filter(
			(t) => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q)
		);
		filteredTagOptions = [...starts, ...contains].slice(0, 8);
	});

	async function openTagInput() {
		if (tagInputOpen) {
			closeTagInput();
			return;
		}

		tagInputOpen = true;
		tagInputText = '';
		// gather all tags from DB, unique
		const all = await db.tags.toArray();
		all.sort((a, b) => a.name.localeCompare(b.name));
		allTagOptions = all;
		// populate name map
		const mapUpdate: Record<number, string> = {};
		for (const t of all) mapUpdate[t.id] = t.name;
		tagNameById = { ...tagNameById, ...mapUpdate };
		await tick();
		const el = document.getElementById(`project-tag-input`) as HTMLInputElement | null;
		if (el) el.focus();
	}

	function closeTagInput() {
		tagInputOpen = false;
		tagInputText = '';
	}

	async function addTagId(tagId: number) {
		const existingIds = Array.isArray(project.tag_ids) ? (project.tag_ids as number[]) : [];
		const nextTags = [...existingIds, tagId];
		project = { ...project, tag_ids: nextTags };
		if (project.id != null) {
			await db.projects.update(project.id, { tag_ids: nextTags, updated_at: new SvelteDate() });
		}
		tagInputText = '';
	}

	async function addTagFromInput() {
		const name = tagInputText.trim();
		if (!name) return;
		const existing = allTagOptions.find((t) => t.name.toLowerCase() === name.toLowerCase());
		if (existing) {
			await addTagId(existing.id);
			return;
		}
		const nextOrder =
			allTagOptions.length > 0 ? Math.max(...allTagOptions.map((t) => t.order ?? 0), 0) + 1 : 1;
		const id = await db.tags.add({
			name,
			parent_tag_id: null,
			order: nextOrder,
			created_at: new SvelteDate(),
			updated_at: new SvelteDate()
		});
		const newTag: Tag = {
			id: id as number,
			name,
			parent_tag_id: null,
			order: nextOrder,
			created_at: new SvelteDate(),
			updated_at: new SvelteDate()
		};
		allTagOptions = [...allTagOptions, newTag].sort((a, b) => a.name.localeCompare(b.name));
		tagNameById[newTag.id] = newTag.name;
		await addTagId(newTag.id);
	}

	function onTagInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTagFromInput();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closeTagInput();
		}
	}

	async function removeTagFromProject(tagId: number) {
		const existingIds = Array.isArray(project.tag_ids) ? (project.tag_ids as number[]) : [];
		const nextTags = existingIds.filter((id) => id !== tagId);
		project = { ...project, tag_ids: nextTags };
		if (project.id != null) {
			await db.projects.update(project.id, {
				tag_ids: nextTags,
				updated_at: new SvelteDate()
			});
		}
	}

	$effect(() => {
		const q = blockerInputText.trim().toLowerCase();
		const current = new Set<number>((project.blocked_by ?? []) as number[]);
		// Filter out the current project itself
		const opts = allBlockerOptions.filter((t) => !current.has(t.id) && t.id !== project.id);
		if (!q) {
			filteredBlockerOptions = opts.slice(0, 8);
			return;
		}
		const starts = opts.filter((t) => t.title.toLowerCase().startsWith(q));
		const contains = opts.filter(
			(t) => !t.title.toLowerCase().startsWith(q) && t.title.toLowerCase().includes(q)
		);
		filteredBlockerOptions = [...starts, ...contains].slice(0, 8);
	});

	async function openBlockerInput() {
		if (blockerInputOpen) {
			closeBlockerInput();
			return;
		}

		blockerInputOpen = true;
		blockerInputText = '';
		// gather all todos and projects from DB
		const allTodos = await db.todos.toArray();
		const allProjects = await db.projects.toArray();

		// Filter out deleted and logged items
		const validTodos = allTodos.filter((t) => !t.deleted_at && !t.logged_at);
		const validProjects = allProjects.filter((p) => !p.deleted_at && !p.logged_at);

		const all = [...validTodos, ...validProjects];
		all.sort((a, b) => a.title.localeCompare(b.title));
		allBlockerOptions = all;

		// populate title map
		const mapUpdate: Record<number, string> = {};
		for (const t of all) mapUpdate[t.id] = t.title;
		blockerTitleById = { ...blockerTitleById, ...mapUpdate };

		// Initialize selected blockers and save original state
		const ids = (project.blocked_by ?? []) as number[];
		originalBlockers = [...ids];
		selectedBlockers.clear();
		ids.forEach((id) => selectedBlockers.add(id));

		await tick();
		const el = document.getElementById(`blocker-input-${project.id}`) as HTMLInputElement | null;
		if (el) el.focus();
	}

	function closeBlockerInput() {
		blockerInputOpen = false;
		blockerInputText = '';
		// Restore original blockers on cancel
		selectedBlockers.clear();
		originalBlockers.forEach((id) => selectedBlockers.add(id));
	}

	function toggleBlocker(blockerId: number) {
		if (selectedBlockers.has(blockerId)) {
			selectedBlockers.delete(blockerId);
		} else {
			selectedBlockers.add(blockerId);
		}
	}

	async function saveBlockers() {
		const blockerIds = Array.from(selectedBlockers);
		const now = new SvelteDate();
		project = { ...project, blocked_by: blockerIds };
		if (project.id != null) {
			await db.projects.update(project.id, { blocked_by: blockerIds, updated_at: now });
		}
		closeBlockerInput();
	}

	function onBlockerInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeBlockerInput();
		}
	}

	function isItemTodoOrProject(item: Item | Project): 'project' | 'todo' {
		return Object.hasOwn(item, 'checklist') ? 'todo' : 'project';
	}

	function removeBlocker(event: MouseEvent, blockerId: number) {
		event.preventDefault();
		event.stopPropagation();
		selectedBlockers.delete(blockerId);
	}
</script>

<!-- MARK: Head -->

<svelte:head>
	<title>{project ? project.title : 'Project'} | Things.do</title>
</svelte:head>

<!-- MARK: Project Actions -->

<div class="mb-4 flex justify-end space-x-4">
	<button
		class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
		onclick={() => {
			if (projectId) {
				db.projects.update(projectId, { deleted_at: new SvelteDate() }).then(() => {
					history.back();
				});
			}
		}}>Delete</button
	>
	<button class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
		>Sync Project To Things</button
	>
</div>

<div>
	{#if project}
		<div class="flex items-center gap-2">
			<!-- MARK: Status button with cycling functionality -->
			<button
				class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center text-white"
				onclick={(event: MouseEvent) => {
					event.stopPropagation();
					cycleProjectStatus(project.id);
				}}
			>
				{#if project.logged_status === 'completed'}
					<div
						class="grid h-5 w-5 place-items-center rounded-full border-2 border-blue-500 bg-blue-500"
						aria-label="Completed"
					>
						<svg viewBox="0 0 20 20" class="h-3.5 w-3.5" aria-hidden="true">
							<path
								d="M5 10l3 3 7-7"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
				{:else if project.logged_status === 'canceled'}
					<div
						class="grid h-5 w-5 place-items-center rounded-full border-2 border-blue-500 bg-blue-500"
						aria-label="Canceled"
					>
						<svg viewBox="0 0 20 20" class="h-3.5 w-3.5" aria-hidden="true">
							<path
								d="M5 5l10 10M15 5l-10 10"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					</div>
				{:else if project.start === 'someday'}
					<div class="h-5 w-5 rounded-full border-2 border-dashed border-gray-400"></div>
				{:else}
					<div class="h-5 w-5 rounded-full border-2 border-gray-400"></div>
				{/if}
			</button>

			<!-- MARK: Editing Title -->

			{#if editingTitle}
				<input
					id="project-title-input"
					type="text"
					class="mb-2 w-full border-b border-gray-300 p-1 text-2xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					bind:value={project.title}
					onblur={() => updateProjectTitleOnBlur(project.title)}
					onkeydown={(e: KeyboardEvent) => updateProjectTitleOnKeydown(e, project.title)}
				/>
			{:else}
				<h1 class="mb-2 w-full text-2xl font-bold">{project.title}</h1>
			{/if}

			{#if !editingTitle}
				<button class="text-left" onclick={startEditingTitle}>
					<PenNibOutline
						class="me-2 inline h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					/>
				</button>
			{/if}
		</div>

		<hr class="my-4" />

		<!-- MARK: Editing Notes -->

		{#if editingNotes}
			<textarea
				bind:this={notesTextarea}
				oninput={autoResizeTextarea}
				rows="4"
				class="w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				bind:value={project.notes}
				onblur={() => {
					editingNotes = false;
					db.projects.update(project.id, {
						notes: project.notes,
						updated_at: new SvelteDate()
					});
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Escape') {
						e.preventDefault();
						editingNotes = false;
						db.projects.update(project.id, {
							notes: project.notes,
							updated_at: new SvelteDate()
						});
					}
				}}
			></textarea>
		{:else}
			<div class="flex justify-between gap-2">
				<div class="prose whitespace-pre-wrap dark:prose-invert">
					{project.notes?.trim() ? project.notes : 'No notes added.'}
				</div>

				<button class="mb-auto text-left" onclick={startEditingNotes}>
					<PenNibOutline
						class="me-2 inline h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					/>
				</button>
			</div>
		{/if}

		<!-- MARK: Project Tags -->
		<div class="mt-4">
			{#if !(project.tag_ids && project.tag_ids.length)}
				<button class="text-sm text-gray-500" title="Add tag" onclick={openTagInput}>
					<TagSolid class="inline h-5 w-5" />
					<span class="ml-1">Add tags</span>
				</button>
			{/if}

			{#if project.tag_ids && project.tag_ids.length}
				<div class="flex flex-wrap gap-2">
					{#each tagsForProject as tag (tag.id)}
						<button
							class="cursor-pointer rounded bg-gray-200 px-2 py-1 text-xs hover:line-through dark:bg-gray-700"
							onclick={() => removeTagFromProject(tag.id)}
						>
							<TagOutline class="inline h-3 w-3" />
							{tag.name}
						</button>
					{/each}
					<button
						class="rounded px-2 py-1 text-xs text-blue-600 hover:underline"
						onclick={openTagInput}>+ Add tag</button
					>
				</div>
			{/if}

			{#if tagInputOpen}
				<div class="relative mt-2">
					<input
						id="project-tag-input"
						class="w-full rounded border border-gray-300 p-2 dark:bg-gray-700"
						placeholder="Type a tag and press Enter"
						bind:value={tagInputText}
						onkeydown={onTagInputKeydown}
						onblur={() => {
							// Small delay to allow click events on dropdown items to fire
							setTimeout(() => closeTagInput(), 200);
						}}
					/>
					{#if filteredTagOptions.length}
						<ul class="absolute z-40 mt-1 w-full rounded border bg-white shadow dark:bg-gray-700">
							{#each filteredTagOptions as opt (opt.id)}
								<li>
									<button
										class="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600"
										onclick={() => addTagId(opt.id)}>{opt.name}</button
									>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>

		<!-- MARK: Blockers Section -->
		<hr class="my-4" />
		<div class="mb-4">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Blockers</h3>
				<button
					class="cursor-pointer rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
					onclick={openBlockerInput}
				>
					{project.blocked_by && project.blocked_by.length > 0 ? 'Edit Blockers' : 'Add Blockers'}
				</button>
			</div>
			{#if project.blocked_by && project.blocked_by.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each project.blocked_by as blockerId (blockerId)}
						<span
							class="rounded bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-900 dark:text-red-200"
						>
							<LockSolid class="inline h-3 w-3" />
							{blockerTitleById[blockerId] || `Item ${blockerId}`}
						</span>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-gray-500 dark:text-gray-400">No blockers set for this project.</p>
			{/if}
		</div>

		{#if blockerInputOpen}
			<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
				<div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
						Select Blockers
					</h2>
					<input
						id={`blocker-input-${project.id}`}
						class="mb-4 w-full rounded border border-gray-300 p-2 dark:bg-gray-700"
						placeholder="Search for todos or projects..."
						bind:value={blockerInputText}
						onkeydown={onBlockerInputKeydown}
					/>
					{#if filteredBlockerOptions.length}
						<div class="mb-4 max-h-64 overflow-y-auto rounded border bg-white dark:bg-gray-700">
							{#each filteredBlockerOptions as opt (opt.id)}
								<label class="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
									<input
										type="checkbox"
										checked={selectedBlockers.has(opt.id)}
										onchange={() => toggleBlocker(opt.id)}
										class={{
											'mr-2': true,
											'rounded-full': isItemTodoOrProject(opt) === 'project'
										}}
									/>
									<span>{opt.title}</span>
								</label>
							{/each}
						</div>
					{/if}
					{#if selectedBlockers.size > 0}
						<div class="mb-4">
							<div class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
								Selected ({selectedBlockers.size}):
							</div>
							<div class="flex flex-wrap gap-2">
								{#each Array.from(selectedBlockers) as blockerId (blockerId)}
									<button
										class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer hover:line-through"
										onclick={(event: MouseEvent) => removeBlocker(event, blockerId)}
									>
										{blockerTitleById[blockerId] || `Item ${blockerId}`}
									</button>
								{/each}
							</div>
						</div>
					{/if}
					<div class="flex justify-end space-x-2">
						<button
							class="cursor-pointer rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200"
							onclick={closeBlockerInput}>Cancel</button
						>
						<button
							class="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
							onclick={saveBlockers}>Save</button
						>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<hr class="my-4 mb-40" />

<!-- MARK: Project To-Dos -->

{#if $todos && $todos.length > 0}
	<Todos
		{todos}
		{tags}
		hideParentForTodosInList
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
			parent_id: page.params.id ? parseInt(page.params.id, 10) : null,
			parent_things_id: null
		}}
		customKeydownBehavior={(
			event,
			highlightedItems,
			openedItem,
			addingNewItem,
			defaultTodoAdditionParams,
			closeOpenedItem,
			clearHighlightsForAllItems,
			shouldPermanentlyDeleteHighlightedItems,
			permanentlyDeleteHighlightedItems,
			deleteHighlightedItems,
			addItem
		) =>
			customKeydownBehavior(
				event,
				highlightedItems,
				openedItem,
				addingNewItem,
				defaultTodoAdditionParams,
				closeOpenedItem,
				clearHighlightsForAllItems,
				shouldPermanentlyDeleteHighlightedItems,
				permanentlyDeleteHighlightedItems,
				deleteHighlightedItems,
				addItem
			)}
	>
		{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
			<ContextMenu show={showMenu} x={menuX} y={menuY}>
				<FocusOnNow {highlightedItems} {clearHighlightsForAllItems} />

				<SetAsideForLater {highlightedItems} {clearHighlightsForAllItems} />

				<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

				<ClearSelected {clearHighlightsForAllItems} />
			</ContextMenu>
		{/snippet}
	</Todos>
{/if}

<!-- MARK: Logged Todos Section -->

{#if loggedTodosCount > 0}
	<div class="mt-8">
		<button
			class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			onclick={() => (showLoggedTodos = !showLoggedTodos)}
		>
			{showLoggedTodos ? '▼' : '▶'}
			{showLoggedTodos ? 'Hide' : 'Show'} Logged To-Dos ({loggedTodosCount})
		</button>

		{#if showLoggedTodos}
			<div class="mt-4 opacity-60">
				<ul class="space-y-2">
					{#each loggedTodos as todo (todo.id)}
						<Todo
							item={todo}
							bind:openedItem={loggedTodoOpenedItem}
							openItem={() => {}}
							highlightItem={() => {}}
							oneWayHighlightItem={() => {}}
							tags={$tags ?? []}
							hideParent={true}
						/>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

<!-- MARK: Styles -->

<style>
	.prose :global(h1) {
		font-size: 1.5rem; /* Tailwind text-2xl equivalent */
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 1rem;
	}

	.prose :global(h2) {
		font-size: 1.25rem; /* Tailwind text-xl equivalent */
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.75rem;
	}

	.prose :global(h3) {
		font-size: 1.125rem; /* Tailwind text-lg equivalent */
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	.prose :global(h4) {
		font-size: 1rem; /* Tailwind text-base equivalent */
		font-weight: 600;
		margin-top: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.prose :global(h5),
	.prose :global(h6) {
		font-size: 0.875rem; /* Tailwind text-sm equivalent */
		font-weight: 600;
		margin-top: 0.5rem;
		margin-bottom: 0.25rem;
	}
</style>
