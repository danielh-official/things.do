<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getBlockedItems, getFocusingItems, getLaterItems, getTags, getTrashItems } from '$lib';
	import { onMount } from 'svelte';

	let { children } = $props();

	let focusingItemsCount = $state<number>(0);
	let laterItemsCount = $state<number>(0);
	let blockedItemsCount = $state<number>(0);
	let trashItemsCount = $state<number>(0);
	let tagsCount = $state<number>(0);

	onMount(() => {
		getFocusingItems().then((items) => {
			focusingItemsCount = items.length;
		});

		getLaterItems().then((items) => {
			laterItemsCount = items.length;
		});

		getBlockedItems().then((items) => {
			blockedItemsCount = items.length;
		});

		getTrashItems().then((items) => {
			trashItemsCount = items.length;
		});

		getTags().then((tags) => {
			tagsCount = tags.length;
		});
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
				<li>
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
						<span class="ms-3 flex-1 whitespace-nowrap">Focusing</span>
						{#if focusingItemsCount > 0}
							<span
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
								>{focusingItemsCount}</span
							>
						{/if}
					</a>
				</li>
				{#if laterItemsCount > 0}
					<li>
						<a
							href={resolve('/later')}
							class="text-body rounded-base group flex items-center px-2 py-1.5 hover:bg-gray-300 dark:hover:bg-gray-600"
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
									d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"
								/></svg
							>
							<span class="ms-3 flex-1 whitespace-nowrap">Later</span>
						</a>
					</li>
				{/if}
				{#if blockedItemsCount > 0}
					<li>
						<a
							href={resolve('/blocked')}
							class="text-body rounded-base group flex items-center px-2 py-1.5 hover:bg-gray-300 dark:hover:bg-gray-600"
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
									d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v4M12 16h.01"
								/></svg
							>
							<span class="ms-3 flex-1 whitespace-nowrap">Blocked</span>
						</a>
					</li>
				{/if}
				{#if trashItemsCount > 0}
					<li>
						<a
							href={resolve('/trash')}
							class="text-body rounded-base group flex items-center px-2 py-1.5 hover:bg-gray-300 dark:hover:bg-gray-600"
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
									d="M3 6h18M8 6v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1m3 0v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6h15Z"
								/></svg
							>
							<span class="ms-3 flex-1 whitespace-nowrap">Trash</span>
						</a>
					</li>
				{/if}
				<hr class="my-2 border-t border-gray-300 dark:border-gray-600" />
				{#if tagsCount > 0}
					<li>
						<a
							href={resolve('/tags')}
							class="text-body rounded-base group flex items-center px-2 py-1.5 hover:bg-gray-300 dark:hover:bg-gray-600"
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
									d="M5.5 12.5 12 19l6.5-6.5a3 3 0 0 0-4.243-4.243L12 10.914l-2.257-2.257a3 3 0 0 0-4.243 4.243Z"
								/></svg
							>
							<span class="ms-3 flex-1 whitespace-nowrap">Tags</span>
						</a>
					</li>
					<hr class="my-2 border-t border-gray-300 dark:border-gray-600" />
				{/if}
			</ul>
		</div>
	</aside>

	<main class="w-full max-w-xl p-4 md:mx-auto">
		{@render children()}
	</main>
</div>
