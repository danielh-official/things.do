<script lang="ts">
	import { db, type Item, type LogStatus } from '$lib/db';
	import { clickOutside } from '$lib';
	import DeadlineInputComponent from './DeadlineInputComponent.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import StartDateInputComponent from './StartDateInputComponent.svelte';

	let {
		item = $bindable(),
		openedItem = $bindable(),
		handleDragStart,
		handleDragOver,
		handleDrop,
		handleDragEnd,
		openItem,
		highlightItem,
		loggedStatusChanged
	}: {
		item: Item;
		openedItem: Item | null;
		handleDragStart?: (event: DragEvent, taskId: number) => void;
		handleDragOver?: (event: DragEvent) => void;
		handleDrop?: (event: DragEvent, taskId: number) => void;
		handleDragEnd?: (event: DragEvent) => void;
		openItem: (event: MouseEvent) => void;
		highlightItem: (event: MouseEvent) => void;
		loggedStatusChanged: () => void;
	} = $props();

	function saveTaskEdits(
		taskId: number,
		task: {
			title?: string;
			notes?: string | null;
		}
	) {
		db.items.update(taskId, {
			...task,
			updated_at: new SvelteDate()
		});
	}

	let editingDeadlineForItemId: number | null = $state(null);
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

		db.items.update(id, {
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

				loggedStatusChanged();
			}, 2000);
		} else if (newStatus === null) {
			pendingRemovalTaskId = null;
			setTimeout(() => {
				loggedStatusChanged();
			}, 2000);
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

	let editingStartDateForItemId: number | null = $state(null);
</script>

{#if openedItem && openedItem.id === item.id}
	<li
		class="cursor-pointer rounded border border-blue-500 bg-blue-50 p-4"
		data-id={item.id}
		use:clickOutside
		onoutsideclick={() => (openedItem = null)}
	>
		<input
			type="text"
			class="mb-2 w-full rounded border border-gray-300 p-2"
			bind:value={openedItem.title}
			placeholder="New To-Do"
			oninput={() =>
				openedItem &&
				saveTaskEdits(openedItem.id, {
					title: openedItem.title
				})}
		/>
		<textarea
			class="mb-2 w-full rounded border border-gray-300 p-2"
			placeholder="Notes"
			rows="4"
			bind:value={openedItem.notes}
			oninput={() =>
				openedItem &&
				saveTaskEdits(openedItem.id, {
					notes: openedItem.notes
				})}
		></textarea>

		{#if item.start_date || item.start}
			<div class="flex space-x-4 text-left">
				<StartDateInputComponent bind:openedItem bind:editingStartDateForItemId />
			</div>
		{/if}

		{#if item.deadline}
			<div class="flex space-x-4 text-left">
				<DeadlineInputComponent bind:openedItem bind:editingDeadlineForItemId />
			</div>
		{/if}

		{#if !item.start_date && !item.start && !item.deadline}
			<div class="flex justify-end space-x-4">
				<StartDateInputComponent bind:openedItem bind:editingStartDateForItemId />
				<DeadlineInputComponent bind:openedItem bind:editingDeadlineForItemId />
			</div>
		{:else if !item.start_date && !item.start}
			<div class="flex justify-end space-x-4">
				<StartDateInputComponent bind:openedItem bind:editingStartDateForItemId />
			</div>
		{:else if !item.deadline}
			<div class="flex justify-end space-x-4">
				<DeadlineInputComponent bind:openedItem bind:editingDeadlineForItemId />
			</div>
		{/if}
	</li>
{:else}
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
		<!-- Status button with cycling functionality -->
		<button
			class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center"
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
					<svg viewBox="0 0 20 20" class="h-3 w-3 text-white" aria-hidden="true">
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
					<svg viewBox="0 0 20 20" class="h-3 w-3 text-white" aria-hidden="true">
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

		<button
			class="flex w-full cursor-pointer justify-between rounded bg-white p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
			ondblclick={openItem}
			data-id={item.id}
			onclick={highlightItem}
		>
			<div>
				{item.title}
				{#if item.notes && item.notes.length > 0}
					<span class="ml-2 text-gray-400">📝</span>
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
