<script lang="ts">
	import { db, type Item as Task } from '$lib/db';
	import { onMount } from 'svelte';
	import ItemComponent from '$lib/components/ItemComponent.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let loading = $state(true);

	let items = $state<Task[]>([]);

	onMount(async () => {
		setTimeout(() => {
			loading = false;
		}, 500);

		window.addEventListener('keydown', processKeydownEvent);

		const allItems = await db.items.toArray();

		items = allItems.filter((item) => item.start === 'inbox').sort((a, b) => a.order - b.order);
	});

	async function addTask(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const item = input.value.trim();
		if (item) {
			db.items.add({
				things_id: null,
				title: item,
				notes: '',
				start_date: null,
				deadline: null,
				start: 'inbox',
				tags: [],
				created_at: new Date(),
				updated_at: new Date(),
				is_blocked_by: null,
				checklist: [],
				logged_at: null,
				logged_status: null,
				order: items.length > 0 ? Math.max(...items.map((t) => t.order)) + 1 : 1
			});

			input.value = '';

			const allItems = await db.items.toArray();

			items = allItems.filter((item) => item.start === 'inbox').sort((a, b) => a.order - b.order);
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
		const allItems = await db.items.toArray();
		items = allItems.filter((item) => item.start === 'inbox').sort((a, b) => a.order - b.order);
		clearHighlightsForAllTasks();
	}

	let highlightedTasks = $state<Set<number>>(new Set());
	let draggingTaskId = $state<number | null>(null);

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

	function handleDragStart(event: DragEvent, taskId: number) {
		draggingTaskId = taskId;
		event.dataTransfer?.setData('text/plain', String(taskId));
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	async function handleDrop(event: DragEvent, targetTaskId: number) {
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

		await Promise.all(
			currentTasks.map((task, index) => {
				if (task.id == null) return Promise.resolve();
				return db.items.update(task.id, {
					order: index + 1,
					updated_at: new Date()
				});
			})
		);

		resetDragState();
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
</script>

<svelte:head>
	<title>Inbox | Things.do</title>
</svelte:head>

<div>
	{#if loading}
		<p>Loading tasks...</p>
	{:else}
		<div>
			<input
				class="w-full rounded border border-gray-300 p-2"
				type="text"
				id="new-task-input"
				placeholder="Enter task..."
				onfocus={() => (addingNewTask = true)}
				onblur={() => (addingNewTask = false)}
			/>
			{#if items?.length > 0}
				<ul class="mt-4 space-y-2">
					{#each items as task (task.id)}
						<ItemComponent
							{task}
							bind:openedTask
							{openTask}
							{highlightTask}
							handleDragStart={(event: DragEvent) => handleDragStart(event, task.id!)}
							handleDragOver={(event: DragEvent) => handleDragOver(event)}
							handleDrop={(event: DragEvent) => handleDrop(event, task.id!)}
							{handleDragEnd}
						/>
					{/each}
				</ul>
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
	{/if}
</div>
