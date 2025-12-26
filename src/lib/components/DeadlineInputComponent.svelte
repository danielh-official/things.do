<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { FlagSolid } from 'flowbite-svelte-icons';
	import { SvelteDate } from 'svelte/reactivity';

	let {
		openedItem = $bindable(),
		editingDeadlineForItemId = $bindable()
	}: {
		openedItem: Item | null;
		editingDeadlineForItemId: number | null;
	} = $props();

	function toggleDeadlinePickerForItem(itemId: number) {
		if (editingDeadlineForItemId === itemId) {
			editingDeadlineForItemId = null;
			return;
		}

		editingDeadlineForItemId = itemId;
	}

	function setDeadlineForItem(event: Event) {
		const dateValue = (event.target as HTMLInputElement).value;

		// Set to UTC timezone
		const selectedDate = dateValue ? new SvelteDate(dateValue + 'T23:59:59Z') : null;

		if (openedItem) {
			// Make sure the deadline is saved with time set to 00:00:00
			if (selectedDate) {
				selectedDate.setHours(0, 0, 0, 0);
			}

			db.items.update(openedItem.id, {
				deadline: selectedDate,
				updated_at: new SvelteDate()
			});

			openedItem.deadline = selectedDate;
		}
		editingDeadlineForItemId = null;
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

<div class="flex items-center space-x-2">
	<button
		class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600"
		onclick={() => openedItem && toggleDeadlinePickerForItem(openedItem.id)}
	>
		<FlagSolid class="h-6 w-6 shrink-0" />
	</button>

	{#if openedItem && openedItem.deadline}
		<div class="content-center text-sm text-gray-500">
			{getDeadlineRelativeText(openedItem.deadline)}
		</div>
	{/if}

	{#if openedItem && editingDeadlineForItemId === openedItem.id}
		<input
			type="date"
			class="ml-4 rounded border border-gray-300 p-2"
			value={openedItem.deadline?.toISOString().split('T')[0]}
			onchange={setDeadlineForItem}
		/>
	{/if}
</div>
