<script lang="ts">
	import { db, type Item as Task } from '$lib/db';
	import { onMount } from 'svelte';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	let items = $state<Task[]>([]);

	let groupedBlocks = $state<Array<{ key: string; title: string; tasks: Task[] }>>([]);

	function startOfDay(date: Date) {
		const d = new SvelteDate(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function getTodayStart(): SvelteDate {
		const t = new SvelteDate();
		t.setHours(0, 0, 0, 0);
		return t;
	}

	function getTomorrowStart(): SvelteDate {
		const t = getTodayStart();
		t.setDate(t.getDate() + 1);
		return t;
	}

	function monthKey(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		return `${y}-${m}`;
	}

	function monthTitle(date: Date): string {
		const currentYear = new SvelteDate().getFullYear();
		const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(date);
		const y = date.getFullYear();
		return y === currentYear ? monthName : `${monthName} ${y}`;
	}

	onMount(async () => {
		await updateItemsState();
	});

	async function updateItemsState() {
		const allItems = await db.items.toArray();

		items = allItems.filter((item) => {
			if (item.deadline === null) {
				return false;
			}

			if (item.logged_at !== null && item.logged_status !== null) {
				return false;
			}

			return true;
		});

		// Build deadline-based groups: Overdue, Today, Tomorrow, future months
		const overdue: Task[] = [];
		const today: Task[] = [];
		const tomorrow: Task[] = [];
		const futureMonths: Record<string, { title: string; tasks: Task[] }> = {};

		const todayStart = getTodayStart();
		const tomorrowStart = getTomorrowStart();

		for (const item of items) {
			const d = startOfDay(item.deadline!);
			if (d.getTime() < todayStart.getTime()) {
				overdue.push(item);
				continue;
			}
			if (d.getTime() === todayStart.getTime()) {
				today.push(item);
				continue;
			}
			if (d.getTime() === tomorrowStart.getTime()) {
				tomorrow.push(item);
				continue;
			}

			const key = monthKey(d);
			if (!futureMonths[key]) {
				futureMonths[key] = { title: monthTitle(d), tasks: [] };
			}
			futureMonths[key].tasks.push(item);
		}

		// Sort tasks within each group by order
		const byOrder = (a: Task, b: Task) => a.order - b.order;
		overdue.sort(byOrder);
		today.sort(byOrder);
		tomorrow.sort(byOrder);
		Object.keys(futureMonths).forEach((k) => {
			futureMonths[k].tasks.sort(byOrder);
		});

		// Build grouped blocks in required order
		const blocks: Array<{ key: string; title: string; tasks: Task[] }> = [];
		if (overdue.length > 0) blocks.push({ key: 'overdue', title: 'Overdue', tasks: overdue });
		if (today.length > 0) blocks.push({ key: 'today', title: 'Today', tasks: today });
		if (tomorrow.length > 0) blocks.push({ key: 'tomorrow', title: 'Tomorrow', tasks: tomorrow });
		const sortedMonthKeys = Object.keys(futureMonths).sort();
		sortedMonthKeys.forEach((k) => {
			blocks.push({ key: k, title: futureMonths[k].title, tasks: futureMonths[k].tasks });
		});

		groupedBlocks = blocks;
	}

	async function addTask(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item) {
			db.items.add({
				things_id: null,
				title: item,
				notes: '',
				start_date: null,
				deadline: new SvelteDate(),
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

	$effect(() => {
		openedTask;

		updateItemsState();
	});

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

	function highlightTask(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const taskId = parseInt(button.getAttribute('data-id') || '', 10);

		const newHighlightedTasks = new SvelteSet(highlightedTasks);

		if (newHighlightedTasks.has(taskId)) {
			newHighlightedTasks.delete(taskId);
			button.classList.add('bg-white');
			button.classList.add('hover:bg-gray-50');
			button.classList.remove('bg-blue-200');
			button.classList.remove('hover:bg-blue-300');
		} else {
			newHighlightedTasks.add(taskId);
			button.classList.remove('bg-white');
			button.classList.remove('hover:bg-gray-50');
			button.classList.add('bg-blue-200');
			button.classList.add('hover:bg-blue-300');
		}

		highlightedTasks = newHighlightedTasks;
	}

	function clearHighlightsForAllTasks() {
		highlightedTasks = new SvelteSet();

		items.forEach((task: Task) => {
			const taskId = task.id;

			const button = document.querySelector(`button[data-id='${taskId}']`) as HTMLButtonElement;
			if (button) {
				button.classList.add('bg-white');
				button.classList.add('hover:bg-gray-50');
				button.classList.remove('bg-blue-200');
				button.classList.remove('hover:bg-blue-300');
			}
		});
		highlightedTasks.clear();
	}

	function loggedStatusChanged() {
		updateItemsState();
	}
</script>

<svelte:head>
	<title>Deadlines | Things.do</title>
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
	{#if groupedBlocks.length > 0}
		{#each groupedBlocks as block (block.key)}
			<h2 class="mt-6 text-sm font-semibold text-gray-700">{block.title}</h2>
			<ul class="mt-2 space-y-2">
				{#each block.tasks as task (task.id)}
					<ItemComponent
						{task}
						bind:openedTask
						{openTask}
						{highlightTask}
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
