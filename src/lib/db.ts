// db.ts
import Dexie, { type EntityTable } from 'dexie';
import type { SvelteDate } from 'svelte/reactivity';

export interface Tag {
	id: number;
	name: string;
	parent_tag_id: number | null; // For hierarchical tags
	order: number; // For ordering tags within the same parent

	created_at: SvelteDate;
	updated_at: SvelteDate;
}

export type LogStatus = null | 'completed' | 'canceled';

// Define your entity interface
export interface Item {
	id: number;
	parent_id: number | null; // The ID of the parent item in our DB (not Things ID). This should only be valid if the parent is a project or area. Furthermore, a project can only have a parent area. And an area cannot have a parent.
	parent_things_id: string | null; // The Things ID of the parent project or area.
	things_id: string | null; // The unique identifier from Things app.
	type: 'task' | 'project' | 'area';
	title: string;
	notes: string | null;
	// If it's null without a start date, it's inbox. If it has a start date, that takes precedence.
	start: null | 'anytime' | 'someday';
	start_date: SvelteDate | null;
	deadline: SvelteDate | null;
	checklist: { title: string; logged: boolean; logged_status: LogStatus }[];
	order: number;
	tags: number[];
	evening: boolean;

	created_at: SvelteDate;
	updated_at: SvelteDate;
	deleted_at: SvelteDate | null;

	logged_at: SvelteDate | null;
	logged_status: LogStatus;

	blocked_by: Array<number>; // Array of item IDs that block this task. This functionality is not native to Things 3.
	later: boolean; // Indicates if the item is postponed to a later time. Not native to Things 3.
}

const db = new Dexie('ThingsDoDB') as Dexie & {
	items: EntityTable<Item, 'id'>;
	tags: EntityTable<Tag, 'id'>;
};

// Schema declaration:
db.version(1).stores({
	items: '++id, parent_id, type, order',
	tags: '++id, parent_tag_id, order'
});

export { db };
