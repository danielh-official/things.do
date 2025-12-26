<script lang="ts">
	import { db, type Item, type LogStatus } from '$lib/db';
	import { CheckCircleSolid, XSolid } from 'flowbite-svelte-icons';
	import { clickOutside } from '$lib';
	import DeadlineInputComponent from './DeadlineInputComponent.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import StartDateInputComponent from './StartDateInputComponent.svelte';

	let {
		task = $bindable(),
		openedTask = $bindable(),
		handleDragStart,
		handleDragOver,
		handleDrop,
		handleDragEnd,
		openTask,
		highlightTask,
		loggedStatusChanged
	}: {
		task: Item;
		openedTask: Item | null;
		handleDragStart: (event: DragEvent, taskId: number) => void;
		handleDragOver: (event: DragEvent) => void;
		handleDrop: (event: DragEvent, taskId: number) => void;
		handleDragEnd: (event: DragEvent) => void;
		openTask: (event: MouseEvent) => void;
		highlightTask: (event: MouseEvent) => void;
		loggedStatusChanged: () => void;
	} = $props();

	function saveTaskEdits(
		taskId: number,
		task: {
			title?: string;
			notes?: string;
		}
	) {
		db.items.update(taskId, {
			...task,
			updated_at: new SvelteDate()
		});
	}

	let editingDeadlineForTaskId: number | null = $state(null);
	let pendingRemovalTaskId: number | null = $state(null);

	function cycleTaskStatus(id: number) {
		const currentStatus: LogStatus = task.logged_status as LogStatus;
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
		task = {
			...task,
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

	let editingStartDateForTaskId: number | null = $state(null);
</script>

{#if openedTask && openedTask.id === task.id}
	<li
		class="cursor-pointer rounded border border-blue-500 bg-blue-50 p-4"
		data-id={task.id}
		use:clickOutside
		onoutsideclick={() => (openedTask = null)}
	>
		<input
			type="text"
			class="mb-2 w-full rounded border border-gray-300 p-2"
			bind:value={openedTask.title}
			placeholder="New To-Do"
			oninput={() =>
				openedTask &&
				saveTaskEdits(openedTask.id, {
					title: openedTask.title
				})}
		/>
		<textarea
			class="mb-2 w-full rounded border border-gray-300 p-2"
			placeholder="Notes"
			rows="4"
			bind:value={openedTask.notes}
			oninput={() =>
				openedTask &&
				saveTaskEdits(openedTask.id, {
					notes: openedTask.notes
				})}
		></textarea>

		{#if task.start_date || task.start === 'someday'}
			<div class="flex space-x-4 text-left">
				<StartDateInputComponent {openedTask} {editingStartDateForTaskId} />
			</div>
		{/if}

		{#if task.deadline}
			<div class="flex space-x-4 text-left">
				<DeadlineInputComponent {openedTask} {editingDeadlineForTaskId} />
			</div>
		{/if}

		<!-- When neither start_date nor deadline is set, show them at the right -->
		{#if !task.start_date && task.start !== 'someday' && !task.deadline}
			<div class="flex justify-end space-x-4">
				<StartDateInputComponent {openedTask} {editingStartDateForTaskId} />
				<DeadlineInputComponent {openedTask} {editingDeadlineForTaskId} />
			</div>
		{/if}

		{#if !task.start_date && task.start !== 'someday'}
			<div class="flex justify-end space-x-4">
				<StartDateInputComponent {openedTask} {editingStartDateForTaskId} />
			</div>
		{/if}

		{#if !task.deadline}
			<div class="flex justify-end space-x-4">
				<DeadlineInputComponent {openedTask} {editingDeadlineForTaskId} />
			</div>
		{/if}
	</li>
{:else}
	<div
		class="flex items-center"
		data-id={task.id}
		role="button"
		tabindex="0"
		draggable="true"
		ondragstart={(event: DragEvent) => handleDragStart(event, task.id)}
		ondragover={(event: DragEvent) => handleDragOver(event)}
		ondrop={(event: DragEvent) => handleDrop(event, task.id)}
		ondragend={handleDragEnd}
	>
		<!-- Status button with cycling functionality -->
		<button
			class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center"
			onclick={(event: MouseEvent) => {
				event.stopPropagation();
				cycleTaskStatus(task.id);
			}}
		>
			{#if task.logged_status === 'completed'}
				<CheckCircleSolid class="h-4 w-4 text-green-600" />
			{:else if task.logged_status === 'canceled'}
				<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-red-600">
					<XSolid class="h-3 w-3 text-red-600" />
				</div>
			{:else if task.start === 'someday'}
				<div class="h-4 w-4 border-2 border-dashed border-gray-400"></div>
			{:else}
				<div class="h-4 w-4 border-2 border-gray-400"></div>
			{/if}
		</button>

		<button
			class="flex w-full cursor-pointer justify-between rounded bg-white p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
			ondblclick={openTask}
			data-id={task.id}
			onclick={highlightTask}
		>
			<div>
				{task.title}
				{#if task.notes.length > 0}
					<span class="ml-2 text-gray-400">📝</span>
				{/if}
			</div>
			<div>
				{#if task.deadline}
					<span class="text-sm text-gray-500">
						{getDeadlineRelativeText(task.deadline)}
					</span>
				{/if}
			</div>
		</button>
	</div>
{/if}
