// db.ts
import Dexie, { type EntityTable } from 'dexie';

export interface Tag {
	id: number;
	name: string;
	parent_tag_id: number | null; // For hierarchical tags
	order: number; // For ordering tags within the same parent

	created_at: Date;
	updated_at: Date;
}

// Define your entity interface
export interface Item {
	id: number;
	things_id: string | null; // The unique identifier from Things app.
	title: string;
	notes: string;
	start_date: Date | null; // If start date is today, shows in today. If start date is upcoming, shows in upcoming. If no start date, shows in anytime.
	deadline: Date | null;
	start: 'inbox' | 'someday' | null; // If start has value, it overrides start_date rules. Someday tasks go in someday, and inbox tasks go in inbox. Null means it follows start_date rules.
	tags: number[]; // Array of tag IDs associated with the task.
	checklist: { title: string; logged: boolean; logged_status: 'completed' | 'canceled' | null }[]; // Checklist items within the task.
	order: number; // For ordering tasks within a list.

	created_at: Date;
	updated_at: Date;

	// Open tasks are not in logbook. Completed and canceled tasks are in logbook. Any task in logbook overrides rules for start_date and start. Logbook tasks are grouped by logged date.
	logged_at: Date | null;
	logged_status: 'completed' | 'canceled' | null; // If logged_at is not null, this field indicates whether the task was completed or canceled.

	// Below this are properties that aren't native to Things app, but are used for additional functionality.

	is_blocked_by: number | null; // If the task is blocked by another task, this field contains the id of that task.
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
