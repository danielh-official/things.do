<script lang="ts">
	import { db, type Task } from '$lib/db';
	import { onMount } from 'svelte';
	import { CalendarMonthSolid, FlagSolid } from 'flowbite-svelte-icons';
	import { clickOutside } from '$lib';

	let loading = $state(true);

	let tasks = $state<Task[]>([]);

	onMount(async () => {
		setTimeout(() => {
			loading = false;
		}, 500);

		window.addEventListener('keydown', processKeydownEvent);

		const allTasks = await db.tasks.toArray();

		tasks = allTasks.filter((task) => task.start === 'inbox').sort((a, b) => a.order - b.order);
	});

	async function addTask(event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;
		const task = input.value.trim();
		if (task) {
			db.tasks.add({
				things_id: null,
				title: task,
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
				order: tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) + 1 : 1
			});

			input.value = '';

			const allTasks = await db.tasks.toArray();

			tasks = allTasks.filter((task) => task.start === 'inbox').sort((a, b) => a.order - b.order);
		}
	}

	let openedTask: Task | null = $state(null);

	function openTask(event: MouseEvent) {
		clearHighlightsForAllTasks();

		const li = event.currentTarget as HTMLLIElement;

		openedTask =
			tasks.filter((task: Task) => task.id === parseInt(li.getAttribute('data-id') || '', 10))[0] ||
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
			await db.tasks.delete(taskId);
		});
		const allTasks = await db.tasks.toArray();
		tasks = allTasks.filter((task) => task.start === 'inbox').sort((a, b) => a.order - b.order);
		clearHighlightsForAllTasks();
	}

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

	let highlightedTasks = $state<Set<number>>(new Set());

	function highlightTask(event: MouseEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const taskId = parseInt(button.getAttribute('data-id') || '', 10);

		const newHighlightedTasks = new Set(highlightedTasks);

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
		highlightedTasks = new Set();

		tasks.forEach((task: Task) => {
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
			{#if tasks?.length > 0}
				<ul class="mt-4 space-y-2">
					{#each tasks as task (task.id)}
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
									<div>
										<button
											class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600"
										>
											<CalendarMonthSolid class="h-6 w-6 shrink-0" />
										</button>
										{#if task.deadline}
											<div class="mt-2 flex flex-col md:mt-0 md:flex-row md:items-center">
												<div class="flex">
													<button
														class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600"
														onclick={() => openedTask && toggleDeadlinePickerForTask(openedTask.id)}
													>
														<FlagSolid class="h-6 w-6 shrink-0" />
														<span class="ml-2 text-gray-700">
															{task.deadline.toDateString()}
														</span>
													</button>
													<div class="content-center text-sm text-gray-500">
														{getDeadlineRelativeText(task.deadline)}
													</div>
												</div>
												{#if editingDeadlineForTaskId === openedTask.id}
													<input
														type="date"
														class="ml-4 rounded border border-gray-300 p-2"
														value={openedTask.deadline?.toISOString().split('T')[0]}
														onchange={setDeadlineForTask}
													/>
												{/if}
											</div>
										{/if}
									</div>
									{#if !task.deadline}
										<button
											class="flex cursor-pointer items-center rounded px-3 py-2 hover:text-gray-600"
											onclick={() => openedTask && toggleDeadlinePickerForTask(openedTask.id)}
										>
											<FlagSolid class="h-6 w-6 shrink-0" />
										</button>
										{#if editingDeadlineForTaskId === openedTask.id}
											<input
												type="date"
												class="ml-4 rounded border border-gray-300 p-2"
												value={openedTask.deadline?.toISOString().split('T')[0]}
												onchange={setDeadlineForTask}
											/>
										{/if}
									{/if}
								</div>
							</li>
						{:else}
							<div class="flex items-center" data-id={task.id}>
								<!-- TODO: Button with functionality where if if clicked once, shows check (completed), clicked twice shows X (cancelled), and clicked after X makes it open again (there should be a timeout from when the log is done to when the task is moved to logbook to allow the user the chance to change to cancelled or open) -->
								<button
									class="w-full cursor-pointer rounded bg-white p-2 text-left hover:bg-gray-50"
									ondblclick={openTask}
									data-id={task.id}
									onclick={highlightTask}
								>
									{task.title}
								</button>
							</div>
						{/if}
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
					<button
						class="cursor-pointer rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
						onclick={deleteHighlightedTasks}>Delete Selected</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
