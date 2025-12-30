import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './focusing/+page.svelte';

describe('/+page.svelte', () => {
	it('renders', async () => {
		render(Page, {});

		expect(true).toBe(true);
	});
});
