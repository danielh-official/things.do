<script lang="ts">
	import { getProjectProgress } from '$lib';
	import { db, type Project, type LogStatus } from '$lib/db';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import ProgressCircle from '$lib/components/ProgressCircle.svelte';
	import { TagOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';

	let {
		item,
		highlightItem,
		dragInsertIndex = false,
		tagNameById = {},
		handleDragStart,
		handleDragOver,
		handleDrop,
		handleDragEnd
	}: {
		item: Project;
		highlightItem: (event: MouseEvent) => void;
		dragInsertIndex?: boolean;
		tagNameById?: Record<number, string>;
		handleDragStart?: (event: DragEvent, itemId: number) => void;
		handleDragOver?: (event: DragEvent, itemId?: number) => void;
		handleDrop?: (event: DragEvent, itemId: number) => void;
		handleDragEnd?: () => void;
	} = $props();

	// Store progress for the project
	let projectProgress = new SvelteMap<number, { completed: number; total: number }>();

	// Update progress whenever the project changes
	$effect(() => {
		(async () => {
			try {
				const progress = await getProjectProgress(item.id);
				projectProgress.set(item.id, progress);
			} catch (error) {
				console.error(`Failed to get progress for project ${item.id}:`, error);
				projectProgress.set(item.id, { completed: 0, total: 0 });
			}
		})();
	});

	function cycleProjectStatus(id: number) {
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

		db.projects.update(id, {
			logged_status: newStatus,
			logged_at: newLoggedAt,
			updated_at: new SvelteDate()
		});
	}

	function openProject(id: number) {
		const route = resolve(`/projects/${id}`);
		goto(route);
	}
</script>

<!-- MARK: Drag insertion indicator -->
{#if dragInsertIndex}
	<div
		class="absolute -top-1 right-0 left-0 h-0.5 bg-blue-500 shadow-lg"
		style="z-index: 50;"
	></div>
{/if}

<!-- MARK: Individual Project Item -->
<div class="project-in-index-item">
	<div
		class="flex items-center"
		data-id={item.id}
		role="button"
		tabindex="0"
		draggable="true"
		ondragstart={(event: DragEvent) => handleDragStart?.(event, item.id)}
		ondragover={(event: DragEvent) => handleDragOver?.(event, item.id)}
		ondrop={(event: DragEvent) => handleDrop?.(event, item.id)}
		ondragend={handleDragEnd}
	>
		<!-- MARK: Status button with cycling functionality -->
		<button
			class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center text-white"
			onclick={(event: MouseEvent) => {
				event.stopPropagation();
				cycleProjectStatus(item.id);
			}}
		>
			{#if item.logged_status === 'completed'}
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
			{:else if item.logged_status === 'canceled'}
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
			{:else if item.start === 'someday'}
				<div class="h-5 w-5 rounded-full border-2 border-dashed border-gray-400"></div>
			{:else}
				<div class="h-5 w-5 rounded-full border-2 border-gray-400"></div>
			{/if}
		</button>

		<button
			data-id={item.id}
			data-testid="project-item-button"
			class="flex w-full items-center rounded-md p-3 text-left transition-colors duration-150 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-gray-800"
			onclick={highlightItem}
			ondblclick={() => openProject(item.id)}
		>
			<div class="flex-1 font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
			{#if projectProgress.get(item.id)}
				{@const progress = projectProgress.get(item.id)}
				{#if progress && progress.total > 0}
					<ProgressCircle completed={progress.completed} total={progress.total} size={20} />
				{/if}
			{/if}
			<div class="flex items-center gap-2">
				<!-- MARK: Tags Preview -->
				{#if item.tag_ids && item.tag_ids.length > 0}
					{#each item.tag_ids as tagId (tagId)}
						<span
							class="m-1 inline-block rounded-2xl border px-[.35rem] py-[.15rem] text-[11px] text-gray-400"
						>
							<TagOutline class="inline h-4 w-4" />
							{tagNameById[tagId] ?? 'Loading...'}
						</span>
					{/each}
				{/if}
			</div>
		</button>
	</div>
</div>
