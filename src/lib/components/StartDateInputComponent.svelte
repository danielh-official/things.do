<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { CalendarMonthSolid } from 'flowbite-svelte-icons';
	import { SvelteDate } from 'svelte/reactivity';

	let {
		openedItem = $bindable(),
		editingStartDateForItemId = $bindable()
	}: {
		openedItem: Item | null;
		editingStartDateForItemId: number | null;
	} = $props();

	function toggleStartDatePickerForItem(itemId: number) {
		if (editingStartDateForItemId === itemId) {
			editingStartDateForItemId = null;
			return;
		}

		editingStartDateForItemId = itemId;
	}

	function setStartDateForItem(event: Event) {
		const dateValue = (event.target as HTMLInputElement).value;

		// Set to UTC timezone
		const selectedDate = dateValue ? new SvelteDate(dateValue + 'T23:59:59Z') : null;

		if (openedItem) {
			// Make sure the start date is saved with time set to 00:00:00
			if (selectedDate) {
				selectedDate.setHours(0, 0, 0, 0);
			}

			db.items.update(openedItem.id, {
				start_date: selectedDate,
				start: null,
				updated_at: new SvelteDate()
			});

			openedItem.start_date = selectedDate;
		}
		editingStartDateForItemId = null;
	}

	function getStartDateRelativeText(startDate: Date | null): string {
		if (!startDate) return '';

		const now = new Date();
		const timeDiff = startDate.getTime() - now.getTime();
		const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

		if (dayDiff === 0) {
			return 'today';
		} else {
			return startDate.toLocaleDateString();
		}
	}

	function handleStartSelect(event: { target: HTMLSelectElement }) {
		const selectedValue = (event.target as HTMLSelectElement).value;

		if (selectedValue !== 'anytime' && selectedValue !== 'someday' && selectedValue !== '') {
			return;
		}

		if (openedItem) {
			db.items.update(openedItem.id, {
				start: selectedValue === '' ? null : selectedValue,
				start_date: selectedValue === '' ? null : openedItem.start_date,
				updated_at: new SvelteDate()
			});
			openedItem.start = selectedValue === '' ? null : selectedValue;
			if (selectedValue === '') {
				openedItem.start_date = null;
			}
		}
	}

	function capitalize(str: string | null): string {
		if (!str) return '';
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
</script>

<div class="flex flex-col space-y-2">
	<div class="flex items-center space-x-2">
		<button
			class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600"
			onclick={() => openedItem && toggleStartDatePickerForItem(openedItem.id)}
		>
			<CalendarMonthSolid class="h-6 w-6 shrink-0" />
		</button>

		{#if openedItem && openedItem.start_date}
			<div class="content-center text-sm text-gray-500">
				{getStartDateRelativeText(openedItem.start_date)}
			</div>
		{/if}

		{#if openedItem && openedItem.start && openedItem.start_date === null}
			<div class="content-center text-sm text-gray-500">{capitalize(openedItem.start)}</div>
		{/if}
	</div>

	{#if openedItem && editingStartDateForItemId === openedItem.id}
		<div class="flex flex-col items-center space-y-4">
			<input
				type="date"
				class="ml-4 rounded border border-gray-300 p-2"
				value={openedItem.start_date?.toISOString().split('T')[0]}
				onchange={setStartDateForItem}
			/>
			<div class="flex items-center">
				<label id="start-label" for="start-select">Start</label>
				<select
					id="start-select"
					class="ml-2 rounded border border-gray-300 p-2"
					onchange={handleStartSelect}
				>
					<option value="" selected={!openedItem.start}>Inbox</option>
					<option value="anytime" selected={openedItem.start === 'anytime'}>Anytime</option>
					<option value="someday" selected={openedItem.start === 'someday'}>Someday</option>
				</select>
			</div>
		</div>
	{/if}
</div>
