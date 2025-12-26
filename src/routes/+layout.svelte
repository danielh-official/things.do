<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db';
	import { page } from '$app/state';
	import { SvelteDate } from 'svelte/reactivity';
	import { resolve } from '$app/paths';

	let { children } = $props();

	let inboxTasks = liveQuery(() =>
		db.items.toArray().then((allItems) =>
			allItems
				.filter((item) => {
					if (item.start !== 'inbox') {
						return false;
					}

					if (item.logged_at !== null) {
						return false;
					}

					if (item.start_date) {
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
		db.items.toArray().then((allItems) => {
			const today = new SvelteDate();
			today.setHours(0, 0, 0, 0);

			return allItems
				.filter((item) => {
					if (item.start_date === null) {
						return false;
					}

					const taskStartDate = new SvelteDate(item.start_date);
					taskStartDate.setHours(0, 0, 0, 0);

					return taskStartDate.getTime() === today.getTime();
				})
				.sort((a, b) => a.order - b.order);
		})
	);

	let startDateTodayTasksCount = $derived.by(() => {
		return $startDateTodayTasks?.length ?? 0;
	});

	let deadlineTodayOrEarlierTasks = liveQuery(() =>
		db.items.toArray().then((allItems) => {
			const today = new SvelteDate();
			today.setHours(0, 0, 0, 0);

			return allItems
				.filter((item) => {
					if (item.deadline === null) {
						return false;
					}

					const taskDeadline = new SvelteDate(item.deadline);
					taskDeadline.setHours(0, 0, 0, 0);

					return taskDeadline.getTime() <= today.getTime();
				})
				.sort((a, b) => a.order - b.order);
		})
	);

	let deadlineTodayOrEarlierTasksCount = $derived.by(() => {
		return $deadlineTodayOrEarlierTasks?.length ?? 0;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex">
	<aside
		id="default-sidebar"
		class="min-h-screen w-64 bg-gray-100 transition-transform sm:translate-x-0 dark:bg-gray-800"
		aria-label="Sidebar"
	>
		<div class="border-default h-full overflow-y-auto border-e px-3 py-4">
			<ul class="space-y-2 font-medium">
				<li class="mb-5">
					<a
						href={resolve('/')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
								>{inboxTasksCount}</span
							>
						{/if}
					</a>
				</li>
				<li>
					<a
						href={resolve('/today')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
								>{startDateTodayTasksCount}</span
							>
						{/if}
						{#if deadlineTodayOrEarlierTasksCount > 0}
							<span
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center bg-red-500 text-xs font-medium text-white"
								>{deadlineTodayOrEarlierTasksCount}</span
							>
						{/if}
					</a>
				</li>
				<li>
					<a
						href={resolve('/upcoming')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
						href={resolve('/anytime')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
								d="M2 6h20M2 12h20M2 18h20"
							/></svg
						>
						<span class="ms-3 flex-1 whitespace-nowrap">Anytime</span>
					</a>
				</li>
				<li>
					<a
						href={resolve('/someday')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
								d="M3 5h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm6 7l2 2 4-4"
							/></svg
						>
						<span class="ms-3 flex-1 whitespace-nowrap">Someday</span>
					</a>
				</li>
				<li class="mt-5">
					<a
						href={resolve('/logbook')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
								d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 0v16M10 11l2 2 4-4"
							/></svg
						>
						<span class="ms-3 flex-1 whitespace-nowrap">Logbook</span>
					</a>
				</li>
				<hr class="mt-6 mb-3 border-gray-300 dark:border-gray-600" />
				<li>
					<a
						href={resolve('/deadlines')}
						class={{
							'text-body rounded-base group flex items-center px-2 py-1.5': true,
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
								d="M5 4v16M5 5h11v6H5"
							/></svg
						>
						<span class="ms-3 flex-1 whitespace-nowrap">Deadlines</span>
					</a>
				</li>
				<hr class="mt-3 mb-6 border-gray-300 dark:border-gray-600" />
			</ul>
		</div>
	</aside>

	<main class="p-4 md:mx-auto max-w-xl w-full">
		{@render children()}
	</main>
</div>
