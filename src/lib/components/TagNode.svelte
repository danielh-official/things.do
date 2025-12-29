<script lang="ts">
	import type { Tag } from '$lib/db';
	import Self from './TagNode.svelte';
	import { tick } from 'svelte';

	interface Props {
		tag: Tag;
		getChildren: (id: number | null) => Tag[];
		isSelected: (id: number) => boolean;
		toggleSelection: (id: number, additive: boolean) => void;
		ensureDragSelection: (id: number) => void;
		handleDrop: (targetId: number | null, position: 'before' | 'after' | 'inside') => void;
		editingId: number | null;
		nameDrafts: Map<number, string>;
		beginRename: (id: number, currentName: string) => void;
		updateDraft: (id: number, value: string) => void;
		onSaveRename: (id: number) => void;
		onCancelRename: (id?: number) => void;
		onDeleteTag: (id: number) => void;
	}

	let {
		tag,
		getChildren,
		isSelected,
		toggleSelection,
		ensureDragSelection,
		handleDrop,
		editingId,
		nameDrafts,
		beginRename,
		updateDraft,
		onSaveRename,
		onCancelRename,
		onDeleteTag
	}: Props = $props();

	let children = $derived(getChildren(tag.id));
	let draft = $derived(nameDrafts.get(tag.id) ?? tag.name);
	let isEditing = $derived(editingId === tag.id);
	let dropZone = $state<'none' | 'before' | 'after' | 'inside'>('none');
	let hasChildren = $derived(children.length > 0);
	let isCollapsed = $state(false);
	let collapseInitialized = $state(false);

	$effect(() => {
		if (!hasChildren) {
			isCollapsed = false;
			collapseInitialized = false;
			return;
		}

		if (hasChildren && !collapseInitialized) {
			isCollapsed = true; // default collapsed on first render with children
			collapseInitialized = true;
		}
	});

	function toggleCollapse() {
		if (!hasChildren) return;
		isCollapsed = !isCollapsed;
	}

	function onClick(event: MouseEvent) {
		const additive = event.metaKey || event.ctrlKey || event.shiftKey;
		toggleSelection(tag.id, additive);
	}

	function onDragStart(event: DragEvent) {
		ensureDragSelection(tag.id);
		event.dataTransfer?.setData('text/plain', String(tag.id));
		event.dataTransfer?.setData('application/x-tag-ids', 'move');
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
		event.dataTransfer?.setDragImage(event.currentTarget as HTMLElement, 10, 10);
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}

		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const y = event.clientY - rect.top;
		const height = rect.height;

		// Top 30%: before, Bottom 40%: after, Middle 30%: inside (parent)
		// Larger "after" zone makes it easier to reorder below tags with children
		if (y < height * 0.3) {
			dropZone = 'before';
		} else if (y > height * 0.6) {
			dropZone = 'after';
		} else {
			dropZone = 'inside';
		}
	}

	function onDragEnter(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	function onDragLeave(event: DragEvent) {
		const target = event.currentTarget as HTMLElement;
		const related = event.relatedTarget as HTMLElement | null;

		// Only reset if we're actually leaving this element, not just entering a child
		if (!related || !target.contains(related)) {
			dropZone = 'none';
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		const zone = dropZone;
		dropZone = 'none';

		if (zone === 'inside') {
			handleDrop(tag.id, 'inside');
		} else if (zone === 'before') {
			handleDrop(tag.id, 'before');
		} else if (zone === 'after') {
			handleDrop(tag.id, 'after');
		}
	}

	function onDoubleClick() {
		beginRename(tag.id, tag.name);
		tick().then(() => {
			const input = document.querySelector<HTMLInputElement>(`[data-tag-input="tag-${tag.id}"]`);
			input?.focus();
			input?.select();
		});
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			onSaveRename(tag.id);
		}
		if (event.key === 'Escape') {
			event.stopPropagation();
			onCancelRename(tag.id);
		}
	}
</script>

<li class="node">
	<div
		class="row"
		role="group"
		class:drop-inside={dropZone === 'inside'}
		class:drop-before={dropZone === 'before'}
		class:drop-after={dropZone === 'after'}
		draggable={!isEditing}
		ondragstart={onDragStart}
		ondragenter={onDragEnter}
		ondragleave={onDragLeave}
		ondragover={onDragOver}
		ondrop={onDrop}
	>
		{#if hasChildren}
			<button
				type="button"
				class="chevron"
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					toggleCollapse();
				}}
			>
				{isCollapsed ? '▸' : '▾'}
			</button>
		{:else}
			<span class="chevron-placeholder" aria-hidden="true">•</span>
		{/if}
		<button
			class:selected={isSelected(tag.id)}
			type="button"
			onclick={onClick}
			ondblclick={onDoubleClick}
			draggable={!isEditing}
			ondragstart={onDragStart}
		>
			{#if isEditing}
				<input
					value={draft}
					data-tag-input={`tag-${tag.id}`}
					onkeydown={onKeydown}
					oninput={(e: { target: HTMLInputElement }) =>
						updateDraft(tag.id, (e.target as HTMLInputElement).value)}
					onblur={() => onSaveRename(tag.id)}
					draggable={false}
				/>
			{:else}
				<span>{tag.name}</span>
			{/if}
		</button>

		<button
			class="trash"
			aria-label={`Delete ${tag.name}`}
			type="button"
			onclick={() => onDeleteTag(tag.id)}
		>
			🗑
		</button>
	</div>
	{#if hasChildren && !isCollapsed}
		<ul>
			{#each children as child (child.id)}
				<Self
					tag={child}
					{getChildren}
					{isSelected}
					{toggleSelection}
					{ensureDragSelection}
					{handleDrop}
					{editingId}
					{nameDrafts}
					{beginRename}
					{updateDraft}
					{onSaveRename}
					{onCancelRename}
					{onDeleteTag}
				/>
			{/each}
		</ul>
	{/if}
</li>

<style>
	li {
		margin-bottom: 0.5rem;
	}

	.node > div {
		cursor: pointer;
	}

	.selected {
		background: #eef6ff;
		border-radius: 4px;
	}

	.node {
		display: block;
	}

	.node > div {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		padding: 0.15rem 0.35rem;
	}

	.row {
		cursor: move;
	}

	.chevron {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.1rem;
		line-height: 1;
		font-size: 0.9rem;
	}

	.chevron-placeholder {
		opacity: 0;
		width: 0.9rem;
	}

	.row.drop-inside {
		background: #dbeafe;
		outline: 2px solid #3b82f6;
		border-radius: 4px;
	}

	.row.drop-before {
		border-top: 3px solid #3b82f6;
		margin-top: -2px;
	}

	.row.drop-after {
		border-bottom: 3px solid #3b82f6;
		margin-bottom: -2px;
	}

	.trash {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0.1rem;
	}

	.row > .trash {
		margin-left: auto;
	}

	ul {
		list-style: none;
		padding-left: 1.5rem;
		margin-top: 0.5rem;
		margin-bottom: 0;
	}
</style>
