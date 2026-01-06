<script lang="ts">
	import { db, type Item, type LogStatus } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';
	import { tick } from 'svelte';

	let {
		item = $bindable(),
		openedItem = $bindable(),
		handleDragStart,
		handleDragOver,
		handleDrop,
		handleDragEnd,
		openItem,
		highlightItem,
		oneWayHighlightItem,
		tags = $bindable<Tag[]>(),
		hideParent = false
	}: {
		item: Item;
		openedItem: Item | null;
		handleDragStart?: (event: DragEvent, taskId: number) => void;
		handleDragOver?: (event: DragEvent) => void;
		handleDrop?: (event: DragEvent, taskId: number) => void;
		handleDragEnd?: (event: DragEvent) => void;
		openItem: (event: MouseEvent) => void;
		highlightItem: (event: MouseEvent) => void;
		oneWayHighlightItem: (event: MouseEvent) => void;
		tags: Tag[];
		hideParent: boolean;
	} = $props();

	let tagsForItem: Tag[] = $state([]);

	$effect(() => {
		item.tag_ids;

		updateTagsForItem();
	});

	async function updateTagsForItem() {
		tags = await db.tags.toArray();

		if (item.tag_ids && item.tag_ids.length > 0) {
			tagsForItem = tags
				.filter((t) => item.tag_ids?.includes(t.id))
				.sort((a, b) => a.order - b.order);
		} else {
			tagsForItem = [];
		}
	}

	function saveTaskEdits(
		taskId: number,
		task: {
			title?: string;
			notes?: string | null;
		}
	) {
		db.todos.update(taskId, {
			...task,
			updated_at: new SvelteDate()
		});
	}

	let pendingRemovalTaskId: number | null = $state(null);

	function cycleTaskStatus(id: number) {
		const currentStatus: LogStatus = item.logged_status as LogStatus;
		let newStatus: LogStatus;
		let newLoggedAt: SvelteDate | null = null;

		if (!currentStatus) {
			newStatus = 'completed';
			newLoggedAt = new SvelteDate();
		} else if (currentStatus === 'completed') {
			newStatus = 'canceled';
			newLoggedAt = new SvelteDate();
		} else {
			newStatus = null;
			newLoggedAt = null;
		}

		// Update local task object for reactive UI
		item = {
			...item,
			logged_status: newStatus,
			logged_at: newLoggedAt,
			updated_at: new SvelteDate()
		};

		db.todos.update(id, {
			logged_status: newStatus,
			logged_at: newLoggedAt,
			updated_at: new SvelteDate()
		});

		// Set pending removal if transitioning to completed or cancelled
		if ((newStatus === 'completed' || newStatus === 'canceled') && currentStatus === null) {
			pendingRemovalTaskId = id;
			setTimeout(() => {
				if (pendingRemovalTaskId === id) {
					pendingRemovalTaskId = null;
				}
			}, 2000);
		} else if (newStatus === null) {
			pendingRemovalTaskId = null;
		}
	}

	function getDeadlineRelativeText(deadline: SvelteDate | null): string {
		if (!deadline) return '';

		const now = new SvelteDate();
		const timeDiff = deadline.getTime() - now.getTime();
		const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

		if (dayDiff === 0) {
			return 'today';
		} else if (dayDiff >= 1) {
			return `${dayDiff} days left`;
		} else if (dayDiff === -1) {
			return '1 day ago';
		} else {
			return `${-dayDiff} days ago`;
		}
	}

	// Tags UI state
	let tagInputOpen = $state(false);
	let tagInputText = $state('');
	import type { Tag } from '$lib/db';
	import {
		FileDocSolid,
		FilePenSolid,
		LinkOutline,
		TagOutline,
		TagSolid
	} from 'flowbite-svelte-icons';
	import { liveQuery } from 'dexie';
	import { getProjects } from '$lib';
	let allTagOptions = $state<Tag[]>([]);
	let filteredTagOptions = $state<Tag[]>([]);
	let tagNameById: Record<number, string> = $state({});

	$effect(() => {
		// Ensure names for current item's tags are loaded
		const ids = (item.tag_ids ?? []) as number[];
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

	$effect(() => {
		const q = tagInputText.trim().toLowerCase();
		const current = new Set<number>((item.tag_ids ?? []) as number[]);
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
		const el = document.getElementById(`tag-input-${item.id}`) as HTMLInputElement | null;
		if (el) el.focus();
	}

	function closeTagInput() {
		tagInputOpen = false;
		tagInputText = '';
	}

	async function addTagId(tagId: number) {
		const existingIds = Array.isArray(item.tag_ids) ? (item.tag_ids as number[]) : [];
		const nextTags = [...existingIds, tagId];
		item = { ...item, tag_ids: nextTags, updated_at: new SvelteDate() };
		if (item.id != null) {
			await db.todos.update(item.id, { tag_ids: nextTags, updated_at: new SvelteDate() });
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
		const nextOrder = allTagOptions.length
			? Math.max(...allTagOptions.map((t) => t.order ?? 0)) + 1
			: 1;
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

	const projects = liveQuery(() => {
		return getProjects();
	});

	function getParentForTodo(todo: Item) {
		if (!todo.parent_id) return null;

		return $projects.filter((project) => project.id === todo.parent_id)[0] || null;
	}
</script>

<!-- MARK: Is Open -->

{#if openedItem && openedItem.id === item.id}
	<div
		class="cursor-pointer rounded border border-blue-500 p-4 shadow-lg"
		data-id={item.id}
		onoutsideclick={() => !tagInputOpen && (openedItem = null)}
	>
		<input
			id={`item-title-input-${item.id}`}
			type="text"
			class="mb-2 w-full rounded border border-gray-300 p-2 dark:bg-gray-700"
			bind:value={openedItem.title}
			placeholder="New To-Do"
			oninput={() =>
				openedItem &&
				saveTaskEdits(openedItem.id, {
					title: openedItem.title
				})}
		/>

		<!-- MARK: Parent Search Select -->
		<div class="my-4 flex justify-end text-sm text-gray-500">
			<select
				class="rounded border border-gray-300 p-2 dark:bg-gray-700"
				bind:value={openedItem.parent_id}
				onchange={async () => {
					if (!openedItem) return;

					await db.todos.update(item.id!, {
						parent_id: openedItem.parent_id,
						updated_at: new SvelteDate()
					});

					openedItem = null;
				}}
			>
				<option value={null}>No Parent Project</option>
				{#each $projects as project}
					<option value={project.id} selected={openedItem.parent_id === project.id}>
						{project.title}
					</option>
				{/each}
			</select>
		</div>

		<!-- MARK: Things ID Link -->
		{#if item.things_id}
			<div class="my-4 text-sm text-gray-500">
				<span>Things ID: </span>
				<a
					href={`things:///show?id=${item.things_id}`}
					target="_blank"
					class="text-blue-600 hover:underline">{item.things_id}</a
				>
			</div>
		{/if}

		<textarea
			id={`item-notes-input-${item.id}`}
			class="mb-2 w-full rounded border border-gray-300 p-2 dark:bg-gray-700"
			placeholder="Notes"
			rows="4"
			bind:value={openedItem.notes}
			oninput={() =>
				openedItem &&
				saveTaskEdits(openedItem.id, {
					notes: openedItem.notes
				})}
		></textarea>

		<div class="flex items-center space-x-4 text-left">
			{#if !(item.tag_ids && item.tag_ids.length)}
				<button class="ml-auto text-sm" title="Add tag" onclick={openTagInput}>
					<TagSolid class="inline h-6 w-6" />
				</button>
			{/if}
		</div>

		{#if item.tag_ids && item.tag_ids.length}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each tagsForItem as tag}
					<button
						class="cursor-pointer rounded px-2 py-1 text-xs hover:line-through"
						onclick={() => {
							const existingIds = Array.isArray(item.tag_ids) ? (item.tag_ids as number[]) : [];
							const nextTags = existingIds.filter((id) => id !== tag.id);
							item = { ...item, tag_ids: nextTags, updated_at: new SvelteDate() };
							if (item.id != null) {
								db.todos.update(item.id, {
									tag_ids: nextTags,
									updated_at: new SvelteDate()
								});
							}
						}}>{tag.name}</button
					>
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
					id={`tag-input-${item.id}`}
					class="w-full rounded border border-gray-300 p-2 dark:bg-gray-700"
					placeholder="Type a tag and press Enter"
					bind:value={tagInputText}
					onkeydown={onTagInputKeydown}
				/>
				{#if filteredTagOptions.length}
					<ul class="absolute z-40 mt-1 w-full rounded border bg-white shadow dark:bg-gray-700">
						{#each filteredTagOptions as opt}
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
{:else}
	<!-- MARK: Not Open -->

	<div
		class="flex items-center"
		data-id={item.id}
		role="button"
		tabindex="0"
		draggable="true"
		ondragstart={(event: DragEvent) => handleDragStart && handleDragStart(event, item.id)}
		ondragover={(event: DragEvent) => handleDragOver && handleDragOver(event)}
		ondrop={(event: DragEvent) => handleDrop && handleDrop(event, item.id)}
		ondragend={handleDragEnd && handleDragEnd}
	>
		<!-- MARK: Status button with cycling functionality -->
		<button
			class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center text-white"
			onclick={(event: MouseEvent) => {
				event.stopPropagation();
				cycleTaskStatus(item.id);
			}}
		>
			{#if item.logged_status === 'completed'}
				<div
					class="grid h-4 w-4 place-items-center border-2 border-blue-500 bg-blue-500"
					aria-label="Completed"
				>
					<svg viewBox="0 0 20 20" class="h-3 w-3" aria-hidden="true">
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
			{:else if item.logged_status === 'canceled'}
				<div
					class="grid h-4 w-4 place-items-center border-2 border-blue-500 bg-blue-500"
					aria-label="Canceled"
				>
					<svg viewBox="0 0 20 20" class="h-3 w-3" aria-hidden="true">
						<path
							d="M5 5l10 10M15 5l-10 10"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</div>
			{:else if item.start === 'someday'}
				<div class="h-4 w-4 border-2 border-dashed border-gray-400"></div>
			{:else}
				<div class="h-4 w-4 border-2 border-gray-400"></div>
			{/if}
		</button>

		<!-- MARK: Item Title and Icons -->
		<button
			class="flex w-full cursor-pointer justify-between rounded p-2 text-left"
			ondblclick={openItem}
			data-id={item.id}
			data-testid="todo-item-button"
			onclick={highlightItem}
			oncontextmenu={oneWayHighlightItem}
		>
			<div class="flex items-center gap-2">
				<div class="flex flex-col">
					{item.title}
					{#if !hideParent && item.parent_id}
						<span class="mt-1 text-sm text-gray-400">
							{#if $projects}
								<span>{getParentForTodo(item)?.title}</span>
							{:else}
								<span>Loading...</span>
							{/if}
						</span>
					{/if}
				</div>
				{#if item.notes && item.notes.length > 0}
					<FilePenSolid class="inline h-4 w-4 text-gray-400 dark:text-gray-600" />
				{/if}
				{#if item.checklist && item.checklist.length > 0}
					<FileDocSolid class="inline h-4 w-4 text-gray-400 dark:text-gray-600" />
				{/if}
				{#if item.things_id}
					<LinkOutline class="inline h-4 w-4 text-gray-400 dark:text-gray-600" />
				{/if}
				<!-- MARK: Tags Preview -->
				{#if item.tag_ids && item.tag_ids.length > 0}
					{#each item.tag_ids as tagId}
						<span
							class="m-1 inline-block rounded-2xl border px-[.35rem] py-[.15rem] text-[11px] text-gray-400"
						>
							<TagOutline class="inline h-4 w-4" />
							{tagNameById[tagId]}
						</span>
					{/each}
				{/if}
			</div>
			<div>
				{#if item.deadline}
					<span class="text-sm text-gray-500">
						{getDeadlineRelativeText(item.deadline)}
					</span>
				{/if}
			</div>
		</button>
	</div>
{/if}
