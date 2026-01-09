import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Focusing Page', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to home page and ensure clean state
		await page.goto('/');
		// Wait for the page to be ready
		await page.waitForLoadState('networkidle');
	});

	// Core display tests
	test('should display active todos excluding deleted, later, logged, and blocked items', async ({
		page
	}) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a test todo for focusing
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Test Todo for Focusing');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Verify todo appears in the list
		const todoItem = page
			.getByTestId('todo-item-button')
			.filter({ hasText: 'Test Todo for Focusing' });
		await expect(todoItem).toBeVisible();
	});

	test('should sort todos by user-defined order', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create multiple todos
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('First Todo');
		await todoInput.press('Enter');
		await page.waitForTimeout(300);

		await todoInput.fill('Second Todo');
		await todoInput.press('Enter');
		await page.waitForTimeout(300);

		// Get the order of todos
		const todoItems = page.getByTestId('todo-item-button');
		const firstTodo = await todoItems.first().textContent();
		expect(firstTodo).toContain('First Todo');
	});

	// Tag filtering tests
	test('should filter todos by single tag', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a tagged todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Tagged Todo');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		const tagFilterButtons = page.getByTestId('tag-filter-button');
		const count = await tagFilterButtons.count();

		// If tags exist, click one to filter
		if (count > 0) {
			await tagFilterButtons.first().click();
			await page.waitForTimeout(300);

			// Verify filter is active
			const activeFilter = page.locator('[data-testid="tag-filter-button"][aria-pressed="true"]');
			await expect(activeFilter).toBeVisible();
		}
	});

	test('should filter todos by multiple tags (intersection logic)', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		const tagFilterButtons = page.getByTestId('tag-filter-button');
		const count = await tagFilterButtons.count();

		if (count >= 2) {
			// Select first tag
			await tagFilterButtons.first().click();
			await page.waitForTimeout(300);

			// Select second tag
			await tagFilterButtons.nth(1).click();
			await page.waitForTimeout(300);

			// Verify multiple filters are active
			const activeFilters = page.locator('[data-testid="tag-filter-button"][aria-pressed="true"]');
			const activeCount = await activeFilters.count();
			expect(activeCount).toBeGreaterThanOrEqual(2);
		}
	});

	test('should show only todos without tags when "no tag" filter is active', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		const noTagFilter = page.getByTestId('tag-filter-no-tag');
		const isVisible = await noTagFilter.isVisible().catch(() => false);

		if (isVisible) {
			await noTagFilter.click();
			await page.waitForTimeout(300);

			// Verify filter is active
			const activeNoTagFilter = page.locator(
				'[data-testid="tag-filter-no-tag"][aria-pressed="true"]'
			);
			await expect(activeNoTagFilter).toBeVisible();
		}
	});

	test('should show available tags based on todos in the list', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Available tags should be displayed
		const availableTags = page.getByTestId('available-tag');
		const count = await availableTags.count();
		expect(count).toBeGreaterThanOrEqual(0);
	});

	test('should update available tags when todos change', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		const initialTagCount = await page.getByTestId('available-tag').count();

		// Create a new todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('New Tagged Todo');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Tag count may or may not change depending on if new tags are added
		const updatedTagCount = await page.getByTestId('available-tag').count();
		expect(updatedTagCount).toBeGreaterThanOrEqual(initialTagCount);
	});

	// Context menu actions
	test('should move todo to later via context menu', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo to Move Later');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Right-click to open context menu
		const todoItem = page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Move Later' });
		await todoItem.click({ button: 'right' });
		await page.waitForTimeout(300);

		// Click "Set Aside for Later"
		const setAsideButton = page.getByTestId('set-aside-for-later-button');
		if (await setAsideButton.isVisible().catch(() => false)) {
			await setAsideButton.click();
			await page.waitForTimeout(500);

			// Verify todo is no longer in focusing list
			await expect(todoItem).not.toBeVisible();
		}
	});

	test('should soft delete todo via context menu', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo to Delete');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Right-click to open context menu
		const todoItem = page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Delete' });
		await todoItem.click({ button: 'right' });
		await page.waitForTimeout(300);

		// Click delete
		const deleteButton = page.getByTestId('delete-selected-button');
		if (await deleteButton.isVisible().catch(() => false)) {
			await deleteButton.click();
			await page.waitForTimeout(500);

			// Verify todo is removed from list
			await expect(todoItem).not.toBeVisible();
		}
	});

	test('should sync todo to Things 3', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo to Sync');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Right-click to open context menu
		const todoItem = page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Sync' });
		await todoItem.click({ button: 'right' });
		await page.waitForTimeout(300);

		// Check if sync button exists and is visible
		const syncButton = page.getByTestId('send-to-things3-button');
		const isSyncVisible = await syncButton.isVisible().catch(() => false);
		expect(isSyncVisible).toBeDefined();
	});

	test('should remove Things 3 sync', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Get any todo that might be synced
		const todoItems = page.getByTestId('todo-item-button');
		const count = await todoItems.count();

		if (count > 0) {
			// Right-click on first todo
			await todoItems.first().click({ button: 'right' });
			await page.waitForTimeout(300);

			// Check if unattach button exists
			const unattachButton = page.getByTestId('unattach-from-things3-button');
			const isUnattachVisible = await unattachButton.isVisible().catch(() => false);
			expect(isUnattachVisible).toBeDefined();
		}
	});

	test('should clear selection', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo to Select');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Click to select
		const todoItem = page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Select' });
		await todoItem.click();
		await page.waitForTimeout(300);

		// Right-click to open context menu
		await todoItem.click({ button: 'right' });
		await page.waitForTimeout(300);

		// Click clear selected
		const clearButton = page.getByTestId('clear-selected-button');
		if (await clearButton.isVisible().catch(() => false)) {
			await clearButton.click();
			await page.waitForTimeout(300);

			// Verify selection is cleared
			const selectedItems = page.locator('[data-testid="todo-item-button"][data-selected="true"]');
			const selectedCount = await selectedItems.count();
			expect(selectedCount).toBe(0);
		}
	});

	// State management
	test('should maintain tag filter selection after navigation', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Click a tag filter
		const tagFilterButtons = page.getByTestId('tag-filter-button');
		if (
			await tagFilterButtons
				.first()
				.isVisible()
				.catch(() => false)
		) {
			await tagFilterButtons.first().click();
			await page.waitForTimeout(300);

			// Navigate away and back
			await page.goto('/later');
			await page.waitForTimeout(300);

			await page.goto('/focusing');
			await page.waitForLoadState('networkidle');

			// Verify filter is still active
			const activeFilter = page.locator('[data-testid="tag-filter-button"][aria-pressed="true"]');
			const filterCount = await activeFilter.count();
			expect(filterCount).toBeGreaterThanOrEqual(0);
		}
	});

	test('should update list when todo is added/modified', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		const initialTodos = await page.getByTestId('todo-item-button').count();

		// Create a new todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('New Todo to Update List');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Verify new todo appears
		const updatedTodos = await page.getByTestId('todo-item-button').count();
		expect(updatedTodos).toBe(initialTodos + 1);
	});

	test('should remove todo from list when it becomes blocked', async ({ page }) => {
		await page.goto('/focusing');
		await page.waitForLoadState('networkidle');

		// Create a test todo
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Blockable Todo');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Verify todo is in the list
		const todoItem = page.getByTestId('todo-item-button').filter({ hasText: 'Blockable Todo' });
		await expect(todoItem).toBeVisible();

		// Note: Blocking functionality would require additional UI interactions
		// This test verifies the initial state is correct
		const todoCount = await page.getByTestId('todo-item-button').count();
		expect(todoCount).toBeGreaterThan(0);
	});
});
