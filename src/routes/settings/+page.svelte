<script lang="ts">
	import { onMount } from 'svelte';
	import { addToast } from '$lib/toastStore';

	const STORAGE_KEY = 'things3_auth_token';

	let authToken = $state('');
	let savedToken = $state('');

	onMount(() => {
		if (typeof localStorage === 'undefined') return;
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			authToken = stored;
			savedToken = stored;
		}
	});

	function saveToken() {
		if (typeof localStorage === 'undefined') return;
		const trimmed = authToken.trim();
		localStorage.setItem(STORAGE_KEY, trimmed);
		savedToken = trimmed;
		addToast('Things 3 auth token saved.', { type: 'success' });
	}

	let hasUnsavedChanges = $derived(authToken.trim() !== savedToken.trim());
</script>

<svelte:head>
	<title>Settings | Things.do</title>
</svelte:head>

<section class="space-y-6">
	<header>
		<h1 class="mb-2 text-2xl font-semibold">Settings</h1>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			Configure how Things.do connects with Things 3.
		</p>
	</header>

	<div class="space-y-2">
		<label class="block text-sm font-medium text-gray-700 dark:text-gray-200" for="auth-token">
			Things 3 auth token
		</label>
		<input
			id="auth-token"
			class="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
			type="password"
			bind:value={authToken}
			autocomplete="off"
			spellcheck={false}
		/>
		<p class="text-xs text-gray-600 dark:text-gray-400">
			For updating Things 3 items directly from Things.do, you need to provide an auth token. To get
			your auth token:
		</p>
		<ol class="list-decimal space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-400">
			<li>Open Things</li>
			<li>Open Settings (can be found in the menu bar under Things)</li>
			<li>Under General, check "Enable Things Url" if not already checked and click "Manage"</li>
			<li>Click "Generate New Token" if you don't have one already, then copy the token</li>
			<li>Paste the token into the field above and click "Save"</li>
		</ol>
	</div>

	<div class="flex gap-3">
		<button
			type="button"
			onclick={saveToken}
			class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={!hasUnsavedChanges}
		>
			Save
		</button>

		{#if !authToken.trim()}
			<p class="self-center text-xs text-red-600 dark:text-red-400">
				No auth token saved yet. You won't be able to send updates for existing Things 3 items. <span
					class="underline">You will be able to add new items though.</span
				>
			</p>
		{:else}
			<p class="self-center text-xs text-gray-600 dark:text-gray-400">
				Auth token is stored only in this browser and used to send updates for existing Things 3
				items.
			</p>
		{/if}
	</div>
</section>
