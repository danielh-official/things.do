<script lang="ts">
	import { db } from '$lib/db';
	import type { Tag } from '$lib/db';
	import { onMount } from 'svelte';
	import TagNode from '$lib/components/TagNode.svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	let rootTags = $state<Tag[]>([]);
	let tagMap = new SvelteMap<number | null, Tag[]>();
	let selectedIds = new SvelteSet<number>();
	let draggingIds = $state<number[]>([]);
	let editingId = $state<number | null>(null);
	let nameDrafts = new SvelteMap<number, string>();
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await refreshTags();
	});

	async function refreshTags() {
		loading = true;
		try {
			const allTags = await db.tags.toArray();
			buildTree(allTags);
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tags';
		} finally {
			loading = false;
		}
	}

	function buildTree(allTags: Tag[]) {
		const mapByParent = new SvelteMap<number | null, Tag[]>();
		for (const tag of allTags) {
			const parentId = tag.parent_tag_id;
			if (!mapByParent.has(parentId)) {
				mapByParent.set(parentId, []);
			}
			mapByParent.get(parentId)!.push(tag);
		}

		for (const tags of mapByParent.values()) {
			tags.sort((a, b) => a.order - b.order);
		}

		tagMap.clear();
		for (const [parentId, tags] of mapByParent) {
			tagMap.set(parentId, tags);
		}

		rootTags = mapByParent.get(null) || [];
	}

	function getChildren(parentId: number | null): Tag[] {
		return tagMap.get(parentId) || [];
	}

	function isSelected(id: number) {
		return selectedIds.has(id);
	}

	function toggleSelection(id: number, additive: boolean) {
		if (!additive) {
			selectedIds.clear();
		}

		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
	}

	function ensureDragSelection(tagId: number) {
		if (!selectedIds.has(tagId)) {
			selectedIds.clear();
			selectedIds.add(tagId);
		}
		draggingIds = [...selectedIds];
	}

	function collectDescendants(id: number, map: SvelteMap<number | null, Tag[]>) {
		const ids: number[] = [];
		const stack = [id];
		while (stack.length) {
			const current = stack.pop()!;
			ids.push(current);
			const kids = map.get(current) || [];
			for (const kid of kids) {
				stack.push(kid.id);
			}
		}
		return ids;
	}

	async function handleDrop(targetId: number) {
		if (draggingIds.length === 0) return;

		const invalidTargets = new SvelteSet<number>();
		for (const id of draggingIds) {
			collectDescendants(id, tagMap).forEach((desc) => invalidTargets.add(desc));
		}

		if (invalidTargets.has(targetId)) {
			return;
		}

		await moveTagsToParent(draggingIds, targetId);
		draggingIds = [];
	}

	async function moveTagsToParent(ids: number[], newParentId: number) {
		const siblings = tagMap.get(newParentId) || [];
		const baseOrder = siblings.length;
		await Promise.all(
			ids.map((id, index) =>
				db.tags.update(id, { parent_tag_id: newParentId, order: baseOrder + index })
			)
		);
		await refreshTags();
	}

	function beginRename(id: number, currentName: string) {
		editingId = id;
		nameDrafts.set(id, currentName);
	}

	function updateDraft(id: number, value: string) {
		nameDrafts.set(id, value);
	}

	async function saveRename(id: number) {
		const draft = nameDrafts.get(id)?.trim();
		if (!draft) {
			cancelRename();
			return;
		}
		await db.tags.update(id, { name: draft });
		editingId = null;
		await refreshTags();
	}

	function cancelRename() {
		editingId = null;
	}

	async function deleteTag(id: number) {
		if (!confirm('Are you sure you want to delete this tag and all its sub-tags?')) {
			return;
		}

		const idsToDelete = collectDescendants(id, tagMap);
		await db.tags.bulkDelete(idsToDelete);
		selectedIds.clear();
		await refreshTags();
	}
</script>

<svelte:head>
	<title>Tags | Things.do</title>
</svelte:head>

{#if loading}
	<p>Loading tags…</p>
{:else if error}
	<p>{error}</p>
{:else if rootTags.length === 0}
	<p>No tags yet.</p>
{:else}
	<ul class="tree">
		{#each rootTags as tag (tag.id)}
			<TagNode
				{tag}
				{getChildren}
				{isSelected}
				{toggleSelection}
				{ensureDragSelection}
				{handleDrop}
				{editingId}
				{nameDrafts}
				{beginRename}
				{updateDraft}
				onSaveRename={saveRename}
				onDeleteTag={deleteTag}
			/>
		{/each}
	</ul>
{/if}

<style>
	.tree {
		list-style: none;
		padding: 0;
		margin: 0;
	}
</style>
