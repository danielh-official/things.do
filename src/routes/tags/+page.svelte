<script lang="ts">
	import { db } from '$lib/db';
	import type { Tag } from '$lib/db';
	import { onMount } from 'svelte';
	import TagNode from '$lib/components/TagNode.component.svelte';
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
	let expandedIds = $state(new SvelteSet<number>());

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

		expandedIds = pruneExpanded(allTags, expandedIds);
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

	async function handleDrop(targetId: number | null, position: 'before' | 'after' | 'inside') {
		if (draggingIds.length === 0) return;
		if (targetId === null) return;

		// Prevent dropping into self or descendants
		const invalidTargets = new SvelteSet<number>();
		for (const id of draggingIds) {
			collectDescendants(id, tagMap).forEach((desc) => invalidTargets.add(desc));
		}

		if (invalidTargets.has(targetId)) {
			return;
		}

		if (position === 'inside') {
			// Move as children of target
			await moveTagsToParent(draggingIds, targetId);
		} else {
			// Reorder as siblings - find target's parent and insert before/after target
			const allTags = await db.tags.toArray();
			const targetTag = allTags.find((t) => t.id === targetId);
			if (!targetTag) return;

			const newParentId = targetTag.parent_tag_id;
			await reorderTags(draggingIds, newParentId, targetId, position);
		}

		draggingIds = [];
	}

	async function moveTagsToParent(ids: number[], newParentId: number | null) {
		const siblings = tagMap.get(newParentId) || [];
		const baseOrder = siblings.length;
		await Promise.all(
			ids.map((id, index) =>
				db.tags.update(id, { parent_tag_id: newParentId, order: baseOrder + index })
			)
		);
		await refreshTags();
	}
	async function reorderTags(
		ids: number[],
		newParentId: number | null,
		targetId: number,
		position: 'before' | 'after'
	) {
		// Get all current siblings, excluding the ones being moved
		const allTags = await db.tags.toArray();
		const currentSiblings = allTags.filter(
			(tag) => tag.parent_tag_id === newParentId && !ids.includes(tag.id)
		);
		currentSiblings.sort((a, b) => a.order - b.order);

		// Find where to insert
		const targetIndex = currentSiblings.findIndex((t) => t.id === targetId);
		if (targetIndex === -1) return;

		const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

		// Get the tags being moved
		const movedTags = allTags.filter((tag) => ids.includes(tag.id));

		// Build new sibling order: siblings before insert point + moved tags + siblings after
		const newOrder = [
			...currentSiblings.slice(0, insertIndex),
			...movedTags,
			...currentSiblings.slice(insertIndex)
		];

		// Update all tags with their new parent and sequential order
		await Promise.all(
			newOrder.map((tag, index) =>
				db.tags.update(tag.id, { parent_tag_id: newParentId, order: index })
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
		const hasSubtags = (tagMap.get(id) || []).length > 0;
		if (hasSubtags) {
			if (!confirm('Are you sure you want to delete this tag and all its sub-tags?')) {
				return;
			}
		} else {
			if (!confirm('Are you sure you want to delete this tag?')) {
				return;
			}
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

		if (!confirm(`Delete ${idsToDelete.size} selected tags (subtags are included in deletion)?`)) {
			return;
		}

		bulkDeleting = true;
		await db.tags.bulkDelete([...idsToDelete]);
		clearSelections();
		await refreshTags();
		bulkDeleting = false;
	}

	function pruneExpanded(allTags: Tag[], current: SvelteSet<number>) {
		const validIds = new SvelteSet(allTags.map((t) => t.id));
		const next = new SvelteSet<number>();
		for (const id of current) {
			if (validIds.has(id)) {
				next.add(id);
			}
		}
		return next;
	}

	function toggleExpanded(id: number, hasChildren: boolean) {
		if (!hasChildren) return;
		const next = new SvelteSet(expandedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expandedIds = next;
	}

	async function createNewTag() {
		const name = prompt('New tag name?')?.trim();
		if (!name) return;

		const allTags = await db.tags.toArray();
		const exists = allTags.some((t) => t.name.trim().toLowerCase() === name.toLowerCase());
		if (exists) {
			alert('A tag with that name already exists.');
			return;
		}

		const order = rootTags.length;
		const now = new Date() as unknown as Tag['created_at'];
		await db.tags.add({ name, parent_tag_id: null, order, created_at: now, updated_at: now });
		await refreshTags();
	}

	function expandAll() {
		const allIds: number[] = [];
		for (const tags of tagMap.values()) {
			for (const t of tags) {
				allIds.push(t.id);
			}
		}
		expandedIds = new SvelteSet(allIds);
	}

	function collapseAll() {
		expandedIds = new SvelteSet();
	}
</script>

<svelte:head>
	<title>Tags | Things.do</title>
</svelte:head>

{#if error}
	<p>{error}</p>
{:else}
	<div class="actions-bar">
		<div class="actions-left">
			<button type="button" onclick={createNewTag}>Create New Tag</button>
		</div>
		<div class="actions-right">
			<button type="button" onclick={expandAll}>Expand All</button>
			<button type="button" onclick={collapseAll}>Collapse All</button>
		</div>
	</div>
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
				{expandedIds}
				{toggleExpanded}
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

	.actions-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 0 0 0.75rem 0;
		gap: 0.5rem;
	}

	.actions-bar button {
		border: 1px solid #cbd5e1;
		background: #fff;
		padding: 0.35rem 0.8rem;
		border-radius: 6px;
		cursor: pointer;
	}

	.actions-bar button:hover {
		background: #e2e8f0;
	}
</style>
