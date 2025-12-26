<script lang="ts">
	import { db, type Item as Task } from '$lib/db';
	import { onMount } from 'svelte';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';

	let items = $state<Task[]>([]);

	// Grouped items by local date (YYYY-MM-DD) for start_date and/or deadline
	let groupedItemsByDate = $state<Record<string, Task[]>>({});
	let groupDateKeys = $state<string[]>([]);
	let draggingTaskId = $state<number | null>(null);

	function startOfDay(date: Date) {
		const d = new SvelteDate(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function getTomorrowStart(): SvelteDate {
		const t = new SvelteDate();
		t.setHours(0, 0, 0, 0);
		t.setDate(t.getDate() + 1);
		return t;
	}

	function isUpcomingDate(date?: Date | null): boolean {
		if (!date) return false;
		return startOfDay(date).getTime() >= getTomorrowStart().getTime();
	}

	function toDateKey(date: Date): string {
		const d = startOfDay(date);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function formatDateFromKey(key: string): string {
		const [y, m, d] = key.split('-').map((s) => parseInt(s, 10));
		const date = new SvelteDate(y, m - 1, d);
		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	function dateFromKey(key: string): SvelteDate {
		const [y, m, d] = key.split('-').map((s) => parseInt(s, 10));
		const t = new SvelteDate(y, m - 1, d);
		t.setHours(0, 0, 0, 0);
		return t;
	}

	onMount(async () => {
		await updateItemsState();
	});

	async function updateItemsState() {
		const allItems = await db.items.toArray();

		// Upcoming shows items that are relevant tomorrow or later
		const filtered = allItems.filter((item) => {
			if (item.start === 'inbox' || item.start === 'someday') {
				return false;
			}

			if (item.logged_at !== null && item.logged_status !== null) {
				return false;
			}

			const startUpcoming = isUpcomingDate(item.start_date ?? null);
			const deadlineUpcoming = isUpcomingDate(item.deadline ?? null);

			// Include tasks that have either upcoming start_date or upcoming deadline
			return startUpcoming || deadlineUpcoming;
		});

		items = filtered.sort((a, b) => a.order - b.order);

		// Build date groupings for start_date and deadline (future-only)
		const groups: Record<string, Task[]> = {};
		for (const item of items) {
			const addedKeys = new SvelteSet<string>();

			if (isUpcomingDate(item.start_date ?? null)) {
				const key = toDateKey(item.start_date!);
				if (!groups[key]) groups[key] = [];
				groups[key].push(item);
				addedKeys.add(key);
			}

			if (isUpcomingDate(item.deadline ?? null)) {
				const key = toDateKey(item.deadline!);
				// Avoid duplicate insertion if start and deadline are same day
				if (!addedKeys.has(key)) {
					if (!groups[key]) groups[key] = [];
					groups[key].push(item);
				}
			}
		}

		// Sort tasks within each group by order
		Object.keys(groups).forEach((key) => {
			groups[key] = groups[key].slice().sort((a, b) => a.order - b.order);
		});

		groupedItemsByDate = groups;
		groupDateKeys = Object.keys(groups).sort();
	}

	async function addTask(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item) {
			db.items.add({
				things_id: null,
				title: item,
				notes: '',
				// Should be tomorrow's date
				start_date: (() => { const t = new SvelteDate(); t.setHours(0,0,0,0); t.setDate(t.getDate() + 1); return t; })(),
				deadline: null,
				start: null,
				tags: [],
				created_at: new SvelteDate(),
				updated_at: new SvelteDate(),
				blocked_by: [],
				evening: false,
				checklist: [],
				logged_at: null,
				logged_status: null,
				order: items.length > 0 ? Math.max(...items.map((t) => t.order)) + 1 : 1
			});

			input.value = '';

			updateItemsState();
		}
	}

	let openedTask: Task | null = $state(null);

	function openTask(event: MouseEvent) {
		clearHighlightsForAllTasks();

		const li = event.currentTarget as HTMLLIElement;

		openedTask =
			items.filter((task: Task) => task.id === parseInt(li.getAttribute('data-id') || '', 10))[0] ||
			null;
	}

	function closeOpenedTask() {
		openedTask = null;
	}

	let addingNewTask = $state(false);

	function processKeydownEvent(event: KeyboardEvent) {
		if (event.code === 'Enter' && addingNewTask) {
			addTask(event);
			return;
		}

		if (event.code === 'Space' && !openedTask && !addingNewTask) {
			const input = document.querySelector('input#new-task-input') as HTMLInputElement;
			if (input) {
				event.preventDefault();
				input.focus();
			}
			return;
		}

		if (event.key === 'Escape' && openedTask) {
			closeOpenedTask();
			return;
		}

		if (event.key === 'Backspace' && highlightedTasks.size > 0) {
			deleteHighlightedTasks();
			return;
		}
	}

	async function deleteHighlightedTasks() {
		if (
			!confirm(
				`Are you sure you want to delete ${highlightedTasks.size} selected task(s)? This action cannot be undone.`
			)
		) {
			return;
		}

		highlightedTasks.forEach(async (taskId) => {
			await db.items.delete(taskId);
		});
		updateItemsState();
		clearHighlightsForAllTasks();
	}

	let highlightedTasks = $state<Set<number>>(new Set());
	// draggingTaskId declared above alongside grouped state

	function highlightTask(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const taskId = parseInt(button.getAttribute('data-id') || '', 10);

		const newHighlightedTasks = new SvelteSet(highlightedTasks);

		const buttons = document.querySelectorAll<HTMLButtonElement>(`button[data-id='${taskId}']`);
		if (newHighlightedTasks.has(taskId)) {
			newHighlightedTasks.delete(taskId);
			buttons.forEach((btn) => {
				btn.classList.add('bg-white');
				btn.classList.add('hover:bg-gray-50');
				btn.classList.remove('bg-blue-200');
				btn.classList.remove('hover:bg-blue-300');
			});
		} else {
			newHighlightedTasks.add(taskId);
			buttons.forEach((btn) => {
				btn.classList.remove('bg-white');
				btn.classList.remove('hover:bg-gray-50');
				btn.classList.add('bg-blue-200');
				btn.classList.add('hover:bg-blue-300');
			});
		}

		highlightedTasks = newHighlightedTasks;
	}

	function handleDragStart(event: DragEvent, taskId: number, _sourceDateKey?: string) {
		draggingTaskId = taskId;
		event.dataTransfer?.setData('text/plain', String(taskId));
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	async function handleDrop(event: DragEvent, targetTaskId: number, targetDateKey: string) {
		event.preventDefault();

		const sourceId =
			draggingTaskId ?? parseInt(event.dataTransfer?.getData('text/plain') || '', 10);
		if (!sourceId || sourceId === targetTaskId) {
			resetDragState();
			return;
		}

		const currentTasks = [...items];
		const fromIndex = currentTasks.findIndex((task) => task.id === sourceId);
		const toIndex = currentTasks.findIndex((task) => task.id === targetTaskId);

		if (fromIndex === -1 || toIndex === -1) {
			resetDragState();
			return;
		}

		const [movedTask] = currentTasks.splice(fromIndex, 1);
		currentTasks.splice(toIndex, 0, movedTask);

		items = currentTasks;

		// If dropping into a different date group, set start_date to that date
		const targetDate = dateFromKey(targetDateKey);
		const currentStartKey = movedTask.start_date ? toDateKey(movedTask.start_date) : null;
		const shouldSetStartDate = !currentStartKey || currentStartKey !== targetDateKey;

		await Promise.all(
			currentTasks.map((task, index) => {
				if (task.id == null) return Promise.resolve();
				const update: Partial<Task> = {
					order: index + 1,
					updated_at: new SvelteDate()
				};
				if (shouldSetStartDate && task.id === sourceId) {
					(update as any).start_date = targetDate;
				}
				return db.items.update(task.id, update);
			})
		);

		resetDragState();
		// Recompute groups after updates
		await updateItemsState();
	}
	function handleDropOnGroup(event: DragEvent, targetDateKey: string) {
		event.preventDefault();
		const sourceId =
			draggingTaskId ?? parseInt(event.dataTransfer?.getData('text/plain') || '', 10);
		if (!sourceId) {
			resetDragState();
			return;
		}

		const currentTasks = [...items];
		const fromIndex = currentTasks.findIndex((task) => task.id === sourceId);
		if (fromIndex === -1) {
			resetDragState();
			return;
		}

		// Determine insertion index as end of target group in global order
		const targetGroup = groupedItemsByDate[targetDateKey] ?? [];
		let insertIndex = currentTasks.length;
		if (targetGroup.length > 0) {
			const lastId = targetGroup[targetGroup.length - 1].id;
			const idx = currentTasks.findIndex((t) => t.id === lastId);
			insertIndex = idx === -1 ? currentTasks.length : idx + 1;
		}

		const [movedTask] = currentTasks.splice(fromIndex, 1);
		currentTasks.splice(insertIndex, 0, movedTask);

		items = currentTasks;

		const targetDate = dateFromKey(targetDateKey);

		Promise.all(
			currentTasks.map((task, index) => {
				if (task.id == null) return Promise.resolve();
				const update: Partial<Task> = {
					order: index + 1,
					updated_at: new SvelteDate()
				};
				if (task.id === sourceId) {
					(update as any).start_date = targetDate;
				}
				return db.items.update(task.id, update);
			})
		)
			.then(async () => {
				resetDragState();
				await updateItemsState();
			});
	}

	function handleDragEnd() {
		resetDragState();
	}

	function resetDragState() {
		draggingTaskId = null;
	}

	function clearHighlightsForAllTasks() {
		highlightedTasks = new SvelteSet();

		items.forEach((task: Task) => {
			const taskId = task.id;
			const buttons = document.querySelectorAll<HTMLButtonElement>(`button[data-id='${taskId}']`);
			buttons.forEach((button) => {
				button.classList.add('bg-white');
				button.classList.add('hover:bg-gray-50');
				button.classList.remove('bg-blue-200');
				button.classList.remove('hover:bg-blue-300');
			});
		});
		highlightedTasks.clear();
	}

	function loggedStatusChanged() {
		updateItemsState();
	}
</script>

<svelte:head>
	<title>Upcoming | Things.do</title>
</svelte:head>

<svelte:window onkeydown={processKeydownEvent} />

<div>
	<input
		class="w-full rounded border border-gray-300 p-2"
		type="text"
		id="new-task-input"
		placeholder="Enter task..."
		onfocus={() => (addingNewTask = true)}
		onblur={() => (addingNewTask = false)}
	/>
	{#if groupDateKeys.length > 0}
		{#each groupDateKeys as dateKey (dateKey)}
			<h2 class="mt-6 text-sm font-semibold text-gray-700">{formatDateFromKey(dateKey)}</h2>
			<ul class="mt-2 space-y-2" ondragover={handleDragOver} ondrop={(event) => handleDropOnGroup(event, dateKey)}>
				{#each groupedItemsByDate[dateKey] as task (task.id)}
					<ItemComponent
						{task}
						bind:openedTask
						{openTask}
						{highlightTask}
						handleDragStart={(event: DragEvent) => handleDragStart(event, task.id!, dateKey)}
						handleDragOver={(event: DragEvent) => handleDragOver(event)}
						handleDrop={(event: DragEvent) => handleDrop(event, task.id!, dateKey)}
						{handleDragEnd}
						{loggedStatusChanged}
					/>
				{/each}
			</ul>
		{/each}
	{/if}
</div>
<div>
	<!-- Box for showing options for showing controls for selected tasks. -->
	{#if highlightedTasks.size > 0}
		<div
			class="fixed bottom-4 left-1/2 flex -translate-x-1/2 transform flex-col space-x-4 gap-y-4 rounded border border-gray-300 bg-white p-4 shadow-lg"
		>
			<p>{highlightedTasks.size} task(s) selected</p>
			<div class="flex space-x-4">
				<button
					class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
					onclick={deleteHighlightedTasks}
				>
					Delete Selected Tasks
				</button>
				<button
					class="cursor-pointer rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
					onclick={clearHighlightsForAllTasks}
				>
					Clear Selected
				</button>
			</div>
		</div>
	{/if}
</div>
