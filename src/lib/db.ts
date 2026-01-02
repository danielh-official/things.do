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
	sent_to_things_at?: SvelteDate | null; // Timestamp of when the item was last sent to Things app.
	title: string;
	notes: string | null;
	// If it's null without a start date, it's inbox. If it has a start date, that takes precedence.
	start: null | 'anytime' | 'someday';
	start_date: SvelteDate | null;
	deadline: SvelteDate | null;
	checklist: { title: string; logged: boolean; logged_status: LogStatus }[];
	order: number;
	tag_ids: number[];
	evening: boolean;

	created_at: SvelteDate;
	updated_at: SvelteDate;
	deleted_at: SvelteDate | null;

	logged_at: SvelteDate | null;
	logged_status: LogStatus;

	blocked_by: Array<number>; // Array of item IDs that block this task. This functionality is not native to Things 3.
	later: boolean; // Indicates if the item is postponed to a later time. Not native to Things 3.
}

export type Project = Omit<Item, 'checklist'>;

export type Todo = Item;

const db = new Dexie('ThingsDoDB') as Dexie & {
	tags: EntityTable<Tag, 'id'>;
	projects: EntityTable<Project, 'id'>;
	todos: EntityTable<Todo, 'id'>;
};

// Schema declaration:
db.version(5).stores({
	projects:
		'++id, parent_id, order, things_id, parent_things_id, start_date, deadline, deleted_at, sent_to_things_at',
	todos:
		'++id, parent_id, order, things_id, parent_things_id, start_date, deadline, deleted_at, sent_to_things_at',
	tags: '++id, &name, parent_tag_id, order'
});

export { db };
