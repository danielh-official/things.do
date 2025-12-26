<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getFocusingTasks as getFocusingItems } from '$lib';
	import { onMount } from 'svelte';

	let { children } = $props();

	let focusingItemsCount = $state<number>(0);

	onMount(() => {
		getFocusingItems().then((tasks) => {
			focusingItemsCount = tasks.length;
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
						<span class="ms-3 flex-1 whitespace-nowrap">Focusing</span>
						{#if focusingItemsCount > 0}
							<span
								class="ms-2 inline-flex h-4.5 w-4.5 items-center justify-center text-xs font-medium"
								>{focusingItemsCount}</span
							>
						{/if}
					</a>
				</li>
			</ul>
		</div>
	</aside>

	<main class="w-full max-w-xl p-4 md:mx-auto">
		{@render children()}
	</main>
</div>
