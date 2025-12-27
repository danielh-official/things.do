<script lang="ts">
	import { db } from '$lib/db';
	import type { Tag } from '$lib/db';
	import { onMount } from 'svelte';
	import TagNode from '$lib/components/TagNode.svelte';

	let rootTags = $state<Tag[]>([]);
	let tagMap = $state<Map<number | null, Tag[]>>(new Map());

	onMount(async () => {
		const allTags = await db.tags.toArray();

		// Group tags by parent_tag_id
		const mapByParent = new Map<number | null, Tag[]>();
		for (const tag of allTags) {
			const parentId = tag.parent_tag_id;
			if (!mapByParent.has(parentId)) {
				mapByParent.set(parentId, []);
			}
			mapByParent.get(parentId)!.push(tag);
		}

		// Sort each group by order
		for (const tags of mapByParent.values()) {
			tags.sort((a, b) => a.order - b.order);
		}

		rootTags = mapByParent.get(null) || [];
		tagMap = mapByParent;
	});

	function getChildren(parentId: number | null): Tag[] {
		return tagMap.get(parentId) || [];
	}
</script>

<svelte:head>
	<title>Tags | Things.do</title>
</svelte:head>

{#if rootTags.length === 0}
	<p>No tags yet.</p>
{:else}
	<ul>
		{#each rootTags as tag (tag.id)}
			<TagNode {tag} {getChildren} />
		{/each}
	</ul>
{/if}

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
</style>
