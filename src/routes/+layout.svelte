<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db';
	import { page } from '$app/state';

	let { children } = $props();

	let inboxTasks = liveQuery(() =>
		db.tasks.toArray().then((allTasks) =>
			allTasks
				.filter((task) => {
					if (task.start !== 'inbox') {
						return false;
					}

					if (task.logged_at !== null) {
						return false;
					}

					if (task.start_date) {
						return false;
					}

					return true;
				})
				.sort((a, b) => a.order - b.order)
		)
	);

	let inboxTasksCount = $derived.by(() => {
		return $inboxTasks?.length ?? 0;
	});

	let startDateTodayTasks = liveQuery(() =>
		db.tasks.toArray().then((allTasks) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			return allTasks
				.filter((task) => {
					if (task.start_date === null) {
						return false;
					}

					const taskStartDate = new Date(task.start_date);
					taskStartDate.setHours(0, 0, 0, 0);

					return taskStartDate.getTime() === today.getTime();
				})
				.sort((a, b) => a.order - b.order);
		})
	);

	let startDateTodayTasksCount = $derived.by(() => {
		return $startDateTodayTasks?.length ?? 0;
	});

	let deadlineTodayTasks = liveQuery(() =>
		db.tasks.toArray().then((allTasks) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			return allTasks
				.filter((task) => {
					if (task.deadline === null) {
						return false;
					}

					const taskDeadline = new Date(task.deadline);
					taskDeadline.setHours(0, 0, 0, 0);

					return taskDeadline.getTime() === today.getTime();
				})
				.sort((a, b) => a.order - b.order);
		})
	);

	let deadlineTodayTasksCount = $derived.by(() => {
		return $deadlineTodayTasks?.length ?? 0;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<aside
	id="default-sidebar"
	class="fixed top-0 left-0 z-40 h-full w-64 sm:translate-x-0"
	aria-label="Sidebar"
>
	<div class="border-default h-full overflow-y-auto border-e px-3 py-4">
		<ul class="space-y-2 font-medium">
			<li class="mb-5">
				<a
					href={'/'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 13h3.439a.991.991 0 0 1 .908.6 3.978 3.978 0 0 0 7.306 0 .99.99 0 0 1 .908-.6H20M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6M4 13l2-9h12l2 9M9 7h6m-7 3h8"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Inbox</span>
					{#if inboxTasksCount > 0}
						<span
							class="text-fg-danger-strong bg-danger-soft border-danger-subtle ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
							>{inboxTasksCount}</span
						>
					{/if}
				</a>
			</li>
			<li>
				<a
					href={'/today'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/today'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 2.5 14.59 8.26 20.9 9.27 16.45 13.59 17.59 19.9 12 16.77 6.41 19.9 7.55 13.59 3.1 9.27 9.41 8.26 12 2.5Z"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Today</span>
					{#if startDateTodayTasksCount > 0}
						<span
							class="text-fg-danger-strong bg-danger-soft border-danger-subtle ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
							>{startDateTodayTasksCount}</span
						>
					{/if}
					{#if deadlineTodayTasksCount > 0}
						<span
							class="text-fg-danger-strong bg-danger-soft border-danger-subtle ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
							>{deadlineTodayTasksCount}</span
						>
					{/if}
				</a>
			</li>
			<li>
				<a
					href={'/upcoming'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/upcoming'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 8h18M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 0h6"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Upcoming</span>
				</a>
			</li>
			<li>
				<a
					href={'/anytime'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/anytime'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-6h2Zm0-8h-2V7h2Z"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Anytime</span>
				</a>
			</li>
			<li>
				<a
					href={'/someday'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/someday'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Zm1-13h-2v6h2Zm0 8h-2v2h2Z"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Someday</span>
				</a>
			</li>
			<li class="mt-5">
				<a
					href={'/logbook'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/logbook'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 5h18M8 9h8M4 13h16M10 17h4"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Logbook</span>
				</a>
			</li>
            <hr class="mt-6 mb-3 border-gray-300 dark:border-gray-600" />
			<li>
				<a
					href={'/deadlines'}
					class={{
						'text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group flex items-center px-2 py-1.5': true,
						'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/deadlines'
					}}
				>
					<svg
						class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
						><path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-6h2Zm0-8h-2V7h2Z"
						/></svg
					>
					<span class="ms-3 flex-1 whitespace-nowrap">Deadlines</span>
				</a>
			</li>
            <hr class="mt-3 mb-6 border-gray-300 dark:border-gray-600" />
		</ul>
	</div>
</aside>

<main class="p-4 md:mx-auto md:max-w-lg">
	{@render children()}
</main>
