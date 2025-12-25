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
	things_id: string | null; // The unique identifier from Things app.
	title: string;
	notes: string;
	start_date: SvelteDate | null; // If start date is today, shows in today. If start date is upcoming, shows in upcoming. If no start date, shows in anytime.
	evening: boolean; // If true, the item would show under "This Evening" section in Today view.
	// TODO: A possible addition to Things functionality could be to let it show for This Evening in other start dates as well.
	deadline: SvelteDate | null;
	start: 'inbox' | 'someday' | null; // If start has value, it overrides start_date rules. Someday tasks go in someday, and inbox tasks go in inbox. Null means it follows start_date rules.
	tags: number[]; // Array of tag IDs associated with the task.
	checklist: { title: string; logged: boolean; logged_status: LogStatus }[]; // Checklist items within the task.
	order: number; // For ordering tasks within a list.

	created_at: SvelteDate;
	updated_at: SvelteDate;

	// Open tasks are not in logbook. Completed and canceled tasks are in logbook. Any task in logbook overrides rules for start_date and start. Logbook tasks are grouped by logged date.
	logged_at: SvelteDate | null;
	logged_status: LogStatus; // If logged_at is not null, this field indicates whether the task was completed or canceled.

	blocked_by: Array<number>; // Array of item IDs that block this task. This functionality is not native to Things 3.
}

const db = new Dexie('ThingsDoDB') as Dexie & {
	items: EntityTable<Item, 'id'>;
	tags: EntityTable<Tag, 'id'>;
};

// Schema declaration:
db.version(1).stores({
	items: '++id, things_id, order',
	tags: '++id, parent_tag_id, order'
});

export { db };
