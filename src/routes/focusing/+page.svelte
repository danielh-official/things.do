<script lang="ts">
	import { db, type Item } from '$lib/db';
	import { getFocusingTodos } from '$lib';
	import { liveQuery } from 'dexie';
	import TodoList from '$lib/components/List.Todo.component.svelte';
	import DeleteSelected from '$lib/components/Buttons/Todo/DeleteSelected.todo.button.component.svelte';
	import ClearSelected from '$lib/components/Buttons/ClearSelected.button.component.svelte';
	import SendToThings3 from '$lib/components/Buttons/Todo/SendToThings3.todo.button.component.svelte';
	import UnattachFromThings3 from '$lib/components/Buttons/Todo/UnattachFromThings3.todo.button.component.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import SetAsideForLater from '$lib/components/Buttons/Todo/SetAsideForLater.todo.button.component.svelte';
	import TagFilter from '$lib/components/TagFilter.component.svelte';

	let allTodos = liveQuery(() => getFocusingTodos());
	let tags = liveQuery(() => db.tags.toArray());

	let selectedTagIds = $state<number[]>([]);
	let showNoTagFilter = $state(false);

	// Collect tags used by current items
	let availableTags = $derived.by(() => {
		if (!$allTodos || !$tags) return [];
		
		const usedTagIds = new Set<number>();
		for (const todo of $allTodos) {
			if (todo.tag_ids) {
				for (const tagId of todo.tag_ids) {
					usedTagIds.add(tagId);
				}
			}
		}
		
		return $tags.filter(tag => usedTagIds.has(tag.id)).sort((a, b) => a.name.localeCompare(b.name));
	});

	// Filter todos based on selected tags - using $effect to create filtered liveQuery
	let todos = $state(allTodos);
	
	$effect(() => {
		if (selectedTagIds.length === 0 && !showNoTagFilter) {
			todos = allTodos;
		} else if (showNoTagFilter) {
			// Show only items without tags
			todos = liveQuery(async () => {
				const items = await getFocusingTodos();
				return items.filter((todo: Item) => !todo.tag_ids || todo.tag_ids.length === 0);
			});
		} else {
			// Create a new liveQuery that depends on the current filter (intersection logic)
			const filterIds = [...selectedTagIds];
			todos = liveQuery(async () => {
				const items = await getFocusingTodos();
				return items.filter((todo: Item) => 
					todo.tag_ids && filterIds.every(tagId => todo.tag_ids.includes(tagId))
				);
			});
		}
	});
</script>

<svelte:head>
	<title>Focusing | Things.do</title>
</svelte:head>

<TagFilter bind:availableTags bind:selectedTagIds bind:showNoTagFilter />

<TodoList
	{todos}
	{tags}
	defaultTodoAdditionParams={{
		notes: '',
		start_date: null,
		deadline: null,
		start: null,
		tag_ids: [],
		blocked_by: [],
		evening: false,
		checklist: [],
		logged_at: null,
		logged_status: null,
		deleted_at: null,
		later: false,
		parent_id: null,
		parent_things_id: null
	}}
>
	{#snippet contextMenu(highlightedItems, clearHighlightsForAllItems, showMenu, menuX, menuY)}
		<ContextMenu show={showMenu} x={menuX} y={menuY}>
			<SetAsideForLater {highlightedItems} {clearHighlightsForAllItems} />

			<DeleteSelected {highlightedItems} {clearHighlightsForAllItems} />

			<ClearSelected {clearHighlightsForAllItems} />

			<SendToThings3 {highlightedItems} />

			<UnattachFromThings3 {highlightedItems} />
		</ContextMenu>
	{/snippet}
</TodoList>
