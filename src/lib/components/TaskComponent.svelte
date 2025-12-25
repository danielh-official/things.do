<script lang="ts">
	import { db, type Task } from '$lib/db';
	import { CalendarMonthSolid, FlagSolid } from 'flowbite-svelte-icons';
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
		task: Task;
		openedTask: Task | null;
		handleDragStart: (event: DragEvent, taskId: number) => void;
		handleDragOver: (event: DragEvent, taskId: number) => void;
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
		db.tasks.update(taskId, {
			...task,
			updated_at: new Date()
		});
	}

	let editingDeadlineForTaskId: number | null = $state(null);

	function toggleDeadlinePickerForTask(taskId: number) {
		if (editingDeadlineForTaskId === taskId) {
			editingDeadlineForTaskId = null;
			return;
		}

		editingDeadlineForTaskId = taskId;
	}

	function setDeadlineForTask(event: Event) {
		const dateValue = (event.target as HTMLInputElement).value;

		// Set to UTC timezone
		const selectedDate = dateValue ? new Date(dateValue + 'T23:59:59Z') : null;

		if (openedTask) {
			// Make sure the deadline is saved with time set to 00:00:00
			if (selectedDate) {
				selectedDate.setHours(0, 0, 0, 0);
			}

			db.tasks.update(openedTask.id, {
				deadline: selectedDate,
				updated_at: new Date()
			});

			openedTask.deadline = selectedDate;
		}
		editingDeadlineForTaskId = null;
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
		ondragstart={(event) => handleDragStart(event, task.id)}
		ondragover={(event) => handleDragOver(event, task.id)}
		ondrop={(event) => handleDrop(event, task.id)}
		ondragend={handleDragEnd}
	>
		<!-- TODO: Button with functionality where if if clicked once, shows check (completed), clicked twice shows X (cancelled), and clicked after X makes it open again (there should be a timeout from when the log is done to when the task is moved to logbook to allow the user the chance to change to cancelled or open) -->
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
