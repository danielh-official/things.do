<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { CalendarMonthSolid } from 'flowbite-svelte-icons';
	import { SvelteDate } from 'svelte/reactivity';

	let {
		openedTask = $bindable(),
		editingStartDateForTaskId = $bindable()
	}: {
		openedTask: Item | null;
		editingStartDateForTaskId: number | null;
	} = $props();

	function toggleStartDatePickerForTask(taskId: number) {
		if (editingStartDateForTaskId === taskId) {
			editingStartDateForTaskId = null;
			return;
		}

		editingStartDateForTaskId = taskId;
	}

	function setStartDateForTask(event: Event) {
		const dateValue = (event.target as HTMLInputElement).value;

		// Set to UTC timezone
		const selectedDate = dateValue ? new SvelteDate(dateValue + 'T23:59:59Z') : null;

		if (openedTask) {
			// Make sure the start date is saved with time set to 00:00:00
			if (selectedDate) {
				selectedDate.setHours(0, 0, 0, 0);
			}

			db.items.update(openedTask.id, {
				start_date: selectedDate,
				start: selectedDate ? null : openedTask.start, // Clear start if setting start_date, since start_date takes precedence
				updated_at: new SvelteDate()
			});

			openedTask.start_date = selectedDate;
		}
		editingStartDateForTaskId = null;
	}

	function getStartDateRelativeText(deadline: Date | null): string {
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

<button
	class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600"
	onclick={() => openedTask && toggleStartDatePickerForTask(openedTask.id)}
>
	<CalendarMonthSolid class="h-6 w-6 shrink-0" />
</button>

{#if openedTask && openedTask.start_date}
	<div class="content-center text-sm text-gray-500">
		{getStartDateRelativeText(openedTask.start_date)}
	</div>
{/if}

{#if openedTask && editingStartDateForTaskId === openedTask.id}
	<input
		type="date"
		class="ml-4 rounded border border-gray-300 p-2"
		value={openedTask.start_date?.toISOString().split('T')[0]}
		onchange={setStartDateForTask}
	/>
{/if}
