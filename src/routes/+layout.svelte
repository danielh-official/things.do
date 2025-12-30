<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getBlockedItems, getFocusingItems, getLaterItems, getTags, getTrashedItems } from '$lib';
	import { liveQuery } from 'dexie';
	import {
		ClockOutline,
		CloseCircleSolid,
		EyeOutline,
		TagOutline,
		TrashBinOutline
	} from 'flowbite-svelte-icons';

	let { children } = $props();

	let focusingItems = liveQuery(() => getFocusingItems());
	let laterItems = liveQuery(() => getLaterItems());
	let blockedItems = liveQuery(() => getBlockedItems());
	let trashedItems = liveQuery(() => getTrashedItems());
	let tags = liveQuery(() => getTags());

	let focusingItemsCount = $derived($focusingItems?.length ?? 0);
	let laterItemsCount = $derived($laterItems?.length ?? 0);
	let blockedItemsCount = $derived($blockedItems?.length ?? 0);
	let trashedItemsCount = $derived($trashedItems?.length ?? 0);
	let tagsCount = $derived($tags?.length ?? 0);
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
						<EyeOutline class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75" />
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
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/later'
							}}
						>
							<ClockOutline
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Later</span>
						</a>
					</li>
				{/if}
				{#if blockedItemsCount > 0}
					<li>
						<a
							href={resolve('/blocked')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/blocked'
							}}
						>
							<CloseCircleSolid
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Blocked</span>
						</a>
					</li>
				{/if}
				{#if trashedItemsCount > 0}
					<li>
						<a
							href={resolve('/trash')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/trash'
							}}
						>
							<TrashBinOutline
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
							<span class="ms-3 flex-1 whitespace-nowrap">Trash</span>
						</a>
					</li>
				{/if}
				<hr class="my-2 border-t border-gray-300 dark:border-gray-600" />
				{#if tagsCount > 0}
					<li>
						<a
							href={resolve('/tags')}
							class={{
								'text-body rounded-base group flex items-center px-2 py-1.5': true,
								'bg-gray-300 dark:bg-gray-600': page.url.pathname === '/tags'
							}}
						>
							<TagOutline
								class="group-hover:text-fg-brand h-5 w-5 shrink-0 transition duration-75"
							/>
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
