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
	let bulkDeleting = $state(false);

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

		if (draggingIds.length === 0) {
			draggingIds = [tagId];
			selectedIds.add(tagId);
		}
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
			cancelRename(id);
			return;
		}
		await db.tags.update(id, { name: draft });
		editingId = null;
		await refreshTags();
	}

	function cancelRename(id?: number) {
		if (id !== undefined) {
			nameDrafts.delete(id);
		}
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

	function clearSelections() {
		selectedIds.clear();
		draggingIds = [];
		editingId = null;
	}

	async function deleteSelectedTags() {
		if (selectedIds.size < 2) return;
		const idsToDelete = new SvelteSet<number>();
		for (const id of selectedIds) {
			collectDescendants(id, tagMap).forEach((desc) => idsToDelete.add(desc));
		}

		if (!confirm(`Delete ${idsToDelete.size} selected tags and their sub-tags?`)) {
			return;
		}

		bulkDeleting = true;
		await db.tags.bulkDelete([...idsToDelete]);
		clearSelections();
		await refreshTags();
		bulkDeleting = false;
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
				onCancelRename={(id: number | undefined) => cancelRename(id)}
			/>
		{/each}
	</ul>

	{#if selectedIds.size > 1}
		<div class="selection-bar">
			<div>{selectedIds.size} tags selected</div>
			<div class="actions">
				<button type="button" class="secondary" onclick={clearSelections}>
					Clear Selections
				</button>
				<button type="button" class="danger" onclick={deleteSelectedTags} disabled={bulkDeleting}>
					{bulkDeleting ? 'Deleting…' : 'Delete Tags'}
				</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	.tree {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.selection-bar {
		position: sticky;
		bottom: 0;
		background: #f8fafc;
		border-top: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		gap: 1rem;
	}

	.selection-bar .actions {
		display: flex;
		gap: 0.5rem;
	}

	.selection-bar button {
		border: 1px solid #cbd5e1;
		background: #fff;
		padding: 0.35rem 0.8rem;
		border-radius: 6px;
		cursor: pointer;
	}

	.selection-bar button.secondary:hover {
		background: #e2e8f0;
	}

	.selection-bar button.danger {
		border-color: #ef4444;
		color: #b91c1c;
	}

	.selection-bar button.danger:hover {
		background: #fee2e2;
	}
</style>
