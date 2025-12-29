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
		handleDrop: (targetId: number) => void;
		editingId: number | null;
		nameDrafts: Map<number, string>;
		beginRename: (id: number, currentName: string) => void;
		updateDraft: (id: number, value: string) => void;
		onSaveRename: (id: number) => void;
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
		onDeleteTag
	}: Props = $props();

	let children = $derived(getChildren(tag.id));
	let draft = $derived(nameDrafts.get(tag.id) ?? tag.name);
	let isEditing = $derived(editingId === tag.id);

	function onClick(event: MouseEvent) {
		const additive = event.metaKey || event.ctrlKey || event.shiftKey;
		toggleSelection(tag.id, additive);
	}

	function onDragStart(event: DragEvent) {
		ensureDragSelection(tag.id);
		event.dataTransfer?.setData('text/plain', String(tag.id));
		event.dataTransfer?.setData('application/x-tag-ids', 'move');
		event.dataTransfer?.setDragImage(event.currentTarget as HTMLElement, 10, 10);
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		handleDrop(tag.id);
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
		}
	}
</script>

<li class="node" draggable ondragstart={onDragStart} ondragover={onDragOver} ondrop={onDrop}>
	<div class="row">
		<button
			class:selected={isSelected(tag.id)}
			type="button"
			onclick={onClick}
			ondblclick={onDoubleClick}
		>
			{#if isEditing}
				<input
					bind:value={draft}
					data-tag-input={`tag-${tag.id}`}
					onkeydown={onKeydown}
					oninput={(e: { target: HTMLInputElement }) =>
						updateDraft(tag.id, (e.target as HTMLInputElement).value)}
					onblur={() => onSaveRename(tag.id)}
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
	{#if children.length > 0}
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

	.node > div:hover {
		text-decoration: underline;
	}

	.selected {
		background: #eef6ff;
		border-radius: 4px;
	}

	.node {
		display: block;
	}

	.node > div {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.15rem 0.35rem;
	}

	.trash {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0.1rem;
	}

	ul {
		list-style: none;
		padding-left: 1.5rem;
		margin-top: 0.5rem;
		margin-bottom: 0;
	}
</style>
