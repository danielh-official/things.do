<script lang="ts">
	import type { Tag } from '$lib/db';
	import Self from './TagNode.svelte';

	interface Props {
		tag: Tag;
		getChildren: (id: number | null) => Tag[];
	}

	let { tag, getChildren }: Props = $props();

	let children = $derived(getChildren(tag.id));
</script>

<li>
	<div>{tag.name}</div>
	{#if children.length > 0}
		<ul>
			{#each children as child (child.id)}
				<Self tag={child} {getChildren} />
			{/each}
		</ul>
	{/if}
</li>

<style>
	li {
		margin-bottom: 0.5rem;
	}

	div {
		cursor: pointer;
	}

	div:hover {
		text-decoration: underline;
	}

	ul {
		list-style: none;
		padding-left: 1.5rem;
		margin-top: 0.5rem;
		margin-bottom: 0;
	}
</style>
