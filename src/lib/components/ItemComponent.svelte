<script lang="ts">
	import { db, type Item, type LogStatus } from '$lib/db';
	import { CalendarMonthSolid, CheckCircleSolid, XSolid } from 'flowbite-svelte-icons';
	import { clickOutside } from '$lib';
	import DeadlineInputComponent from './DeadlineInputComponent.svelte';

	let {
		task = $bindable(),
		openedTask = $bindable(),
		handleDragStart,
		handleDragOver,
		handleDrop,
		handleDragEnd,
		openTask,
		highlightTask
	}: {
		task: Item;
		openedTask: Item | null;
		handleDragStart: (event: DragEvent, taskId: number) => void;
		handleDragOver: (event: DragEvent) => void;
		handleDrop: (event: DragEvent, taskId: number) => void;
		handleDragEnd: (event: DragEvent) => void;
		openTask: (event: MouseEvent) => void;
		highlightTask: (event: MouseEvent) => void;
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
			updated_at: new Date()
		});
	}

	let editingDeadlineForTaskId: number | null = $state(null);
	let pendingRemovalTaskId: number | null = $state(null);

	function cycleTaskStatus(event: MouseEvent, id: number) {
		event.stopPropagation();
		const currentStatus: LogStatus = task.logged_status as LogStatus;
		let newStatus: LogStatus;
		let newLoggedAt: Date | null = null;

		if (!currentStatus) {
			newStatus = 'completed';
			newLoggedAt = new Date();
		} else if (currentStatus === 'completed') {
			newStatus = 'canceled';
			newLoggedAt = new Date();
		} else {
			newStatus = null;
			newLoggedAt = null;
		}

		// Update local task object for reactive UI by creating a new object
		task = {
			...task,
			logged_status: newStatus,
			logged_at: newLoggedAt,
			updated_at: new Date()
		};

		// Update database
		db.items.update(id, {
			logged_status: newStatus,
			logged_at: newLoggedAt,
			updated_at: new Date()
		});

		// Set pending removal if transitioning to completed or cancelled
		if ((newStatus === 'completed' || newStatus === 'canceled') && currentStatus === null) {
			pendingRemovalTaskId = id;
			setTimeout(() => {
				if (pendingRemovalTaskId === id) {
					pendingRemovalTaskId = null;
				}
			}, 3000);
		} else if (newStatus === null) {
			pendingRemovalTaskId = null;
		}
	}

	function getDeadlineRelativeText(deadline: Date | null): string {
		if (!deadline) return '';

		const now = new Date();
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
		<div class="flex justify-between">
			<div class="mb-4 flex flex-col md:flex-row md:justify-between">
				{#if task.deadline}
					<div class="mt-2 flex flex-col md:mt-0 md:flex-row md:items-center">
						<DeadlineInputComponent {openedTask} {editingDeadlineForTaskId} />
					</div>
				{/if}
			</div>
			<div class="flex justify-end space-x-4">
				<div>
					<button class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600">
						<CalendarMonthSolid class="h-6 w-6 shrink-0" />
					</button>
				</div>
				{#if !task.deadline}
					<DeadlineInputComponent {openedTask} {editingDeadlineForTaskId} />
				{/if}
			</div>
		</div>
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
			onclick={(event: MouseEvent) => cycleTaskStatus(event, task.id)}
		>
			{#if task.logged_status === 'completed'}
				<CheckCircleSolid class="h-6 w-6 text-green-600" />
			{:else if task.logged_status === 'canceled'}
				<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-red-600">
					<XSolid class="h-3 w-3 text-red-600" />
				</div>
			{:else}
				<div class="h-6 w-6 rounded-full border-2 border-gray-400"></div>
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
