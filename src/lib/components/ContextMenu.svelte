<!-- ContextMenu.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';

	// Props to control visibility and position
	let {
		show,
		x,
		y,
		children
	}: {
		show: boolean;
		x: number;
		y: number;
		children: () => any;
	} = $props();

	function handleClick(handler: () => void) {
		handler();
		show = false; // Close menu after an item is clicked
	}

	// Close the menu if the user clicks anywhere else
	function handleGlobalClick() {
		show = false;
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		window.addEventListener('click', handleGlobalClick);
	});

	onDestroy(() => {
		if (!browser) {
			return;
		}

		window.removeEventListener('click', handleGlobalClick);
	});
</script>

{#if show}
	<div class="context-menu flex flex-col gap-y-2" style:top={`${y}px`} style:left={`${x}px`}>
		{@render children()}
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		background: white;
		border: 1px solid #ccc;
		box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
		z-index: 1000;
		padding: 20px;
		border-radius: 4px;
	}

	@media (prefers-color-scheme: dark) {
		.context-menu {
			background: #1e1e1e;
			border: 1px solid #444;
			color: #ddd;
		}
	}
</style>
