import { expect, test } from '@playwright/test';

test.describe('Trash Page', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to home page and ensure clean state
		await page.goto('/');
		// Wait for the page to be ready
		await page.waitForLoadState('networkidle');
	});

	test('should show deleted todo and project in trash page', async ({ page }) => {
		// Navigate to focusing page and create a todo
		await page.goto('/focusing');
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Test Todo for Trash');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Create a project - set up dialog handler BEFORE clicking
		page.once('dialog', async (dialog) => {
			expect(dialog.type()).toBe('prompt');
			await dialog.accept('Test Project for Trash');
		});
		await page.getByTestId('create-project-btn').click();
		await page.waitForTimeout(500);

		// Delete the todo - click to select, then right-click for context menu
		const todoForTrash = page.getByTestId('todo-item-button').filter({ hasText: 'Test Todo for Trash' });
		await todoForTrash.click();
		await todoForTrash.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(500);

		// Delete the project
		await page.goto('/projects');
		await page.waitForTimeout(300);
		const projectForTrash = page.getByTestId('project-item-button').filter({ hasText: 'Test Project for Trash' });
		await projectForTrash.click();
		await projectForTrash.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(500);

		// Navigate to trash page
		await page.getByRole('link', { name: 'Trash' }).click();
		await page.waitForTimeout(300);

		// Verify both items are in trash
		await expect(page.locator('.trash-item-button').filter({ hasText: /test todo for trash/i })).toBeVisible();
		await expect(page.locator('.trash-item-button').filter({ hasText: /test project for trash/i })).toBeVisible();
	});

	test('should show confirmation dialog when pressing Backspace on selected items', async ({
		page
	}) => {
		// Create and delete a todo and project
		await page.goto('/focusing');
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo to Delete with Backspace');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Create a project - set up dialog handler BEFORE clicking
		page.once('dialog', async (dialog) => {
			await dialog.accept('Project to Delete with Backspace');
		});
		await page.getByTestId('create-project-btn').click();
		await page.waitForTimeout(500);

		// Delete both items
		const todoBackspace = page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Delete with Backspace' });
		await todoBackspace.click();
		await todoBackspace.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(500);

		await page.goto('/projects');
		await page.waitForTimeout(300);
		const projectBackspace = page.getByTestId('project-item-button').filter({ hasText: 'Project to Delete with Backspace' });
		await projectBackspace.click();
		await projectBackspace.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(1000);

		// Go to trash and select both items
		await page.getByRole('link', { name: 'Trash' }).click({ timeout: 10000 });
		await page.waitForTimeout(300);

		// Select both items (click first, shift+click second)
		await page.locator('.trash-item-button').filter({ hasText: /todo to delete with backspace/i }).click();
		await page.keyboard.down('Shift');
		await page.locator('.trash-item-button').filter({ hasText: /project to delete with backspace/i }).click();
		await page.keyboard.up('Shift');

		// Setup dialog handler before pressing Backspace
		let dialogShown = false;
		page.once('dialog', async (dialog) => {
			dialogShown = true;
			expect(dialog.type()).toBe('confirm');
			expect(dialog.message()).toContain('permanently delete');
			await dialog.dismiss(); // Cancel the deletion
		});

		// Press Backspace
		await page.keyboard.press('Backspace');
		await page.waitForTimeout(500);

		// Verify dialog was shown
		expect(dialogShown).toBe(true);

		// Verify items are still there (dialog was dismissed)
		await expect(
			page.locator('.trash-item-button').filter({ hasText: /todo to delete with backspace/i })
		).toBeVisible();
		await expect(
			page.locator('.trash-item-button').filter({ hasText: /project to delete with backspace/i })
		).toBeVisible();
	});

	test('should show confirmation dialog when clicking "Permanently Delete Selected Items" in context menu', async ({
		page
	}) => {
		// Create and delete items
		await page.goto('/focusing');
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo for Context Menu Delete');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Create a project - set up dialog handler BEFORE clicking
		page.once('dialog', async (dialog) => {
			await dialog.accept('Project for Context Menu Delete');
		});
		await page.getByTestId('create-project-btn').click();
		await page.waitForTimeout(500);

		const todoContext = page.getByTestId('todo-item-button').filter({ hasText: 'Todo for Context Menu Delete' });
		await todoContext.click();
		await todoContext.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(500);

		await page.goto('/projects');
		await page.waitForTimeout(300);
		const projectContext = page.getByTestId('project-item-button').filter({ hasText: 'Project for Context Menu Delete' });
		await projectContext.click();
		await projectContext.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(1000);

		// Go to trash and select both items
		await page.getByRole('link', { name: 'Trash' }).click({ timeout: 10000 });
		await page.waitForTimeout(300);

		await page.locator('.trash-item-button').filter({ hasText: /todo for context menu delete/i }).click();
		await page.keyboard.down('Shift');
		await page.locator('.trash-item-button').filter({ hasText: /project for context menu delete/i }).click();
		await page.keyboard.up('Shift');

		// Right-click to open context menu
		await page
			.locator('.trash-item-button').filter({ hasText: /todo for context menu delete/i })
			.click({ button: 'right' });
		await page.waitForTimeout(300);

		// Setup dialog handler
		let dialogShown = false;
		page.once('dialog', async (dialog) => {
			dialogShown = true;
			expect(dialog.type()).toBe('confirm');
			expect(dialog.message()).toContain('permanently delete');
			await dialog.dismiss(); // Cancel
		});

		// Click "Permanently Delete Selected Items"
		await page.getByRole('button', { name: /permanently delete selected items/i }).click();
		await page.waitForTimeout(500);

		// Verify dialog was shown
		expect(dialogShown).toBe(true);

		// Verify items still exist
		await expect(
			page.locator('.trash-item-button').filter({ hasText: /todo for context menu delete/i })
		).toBeVisible();
		await expect(
			page.locator('.trash-item-button').filter({ hasText: /project for context menu delete/i })
		).toBeVisible();
	});

	test('should restore items and hide trash link when clicking "Restore Selected Items"', async ({
		page
	}) => {
		// Create and delete items
		await page.goto('/focusing');
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo to Restore');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Create a project - set up dialog handler BEFORE clicking
		page.once('dialog', async (dialog) => {
			await dialog.accept('Project to Restore');
		});
		await page.getByTestId('create-project-btn').click();
		await page.waitForTimeout(500);

		const todoRestore = page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Restore' });
		await todoRestore.click();
		await todoRestore.click({ button: 'right' });
		await page.getByRole('button', { name: 'Delete' }).click();
		await page.waitForTimeout(500);

		await page.goto('/projects');
		await page.waitForTimeout(300);
		const projectRestore = page.getByTestId('project-item-button').filter({ hasText: 'Project to Restore' });
		await projectRestore.click();
		await projectRestore.click({ button: 'right' });
		await page.getByRole('button', { name: 'Delete' }).click();
		await page.waitForTimeout(500);

		// Go to trash and select both items
		await page.getByRole('link', { name: 'Trash' }).click();
		await page.waitForTimeout(300);

		await page.locator('.trash-item-button').filter({ hasText: /todo to restore/i }).click();
		await page.keyboard.down('Shift');
		await page.locator('.trash-item-button').filter({ hasText: /project to restore/i }).click();
		await page.keyboard.up('Shift');

		// Right-click and restore
		await page.locator('.trash-item-button').filter({ hasText: /todo to restore/i }).click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByRole('button', { name: /restore selected items/i }).click();
		await page.waitForTimeout(500);

		// Verify trash is empty (no items visible)
		await expect(page.locator('.trash-item-button').filter({ hasText: /todo to restore/i })).not.toBeVisible();
		await expect(page.locator('.trash-item-button').filter({ hasText: /project to restore/i })).not.toBeVisible();

		// Verify trash link is not visible in sidebar
		await expect(page.getByRole('link', { name: 'Trash' })).not.toBeVisible();

		// Verify todo is back in focusing
		await page.goto('/focusing');
		await page.waitForTimeout(300);
		await expect(page.getByTestId('todo-item-button').filter({ hasText: 'Todo to Restore' })).toBeVisible();

		// Verify project is back in projects list
		await page.goto('/projects');
		await page.waitForTimeout(300);
		await expect(page.getByTestId('project-item-button').filter({ hasText: 'Project to Restore' })).toBeVisible();
	});

	test('should permanently delete all items when clicking "Empty Trash" with confirmation', async ({
		page
	}) => {
		// Create and delete items
		await page.goto('/focusing');
		const todoInput = page.getByRole('textbox', { name: /enter item/i });
		await todoInput.fill('Todo for Empty Trash');
		await todoInput.press('Enter');
		await page.waitForTimeout(500);

		// Create a project - set up dialog handler BEFORE clicking
		page.once('dialog', async (dialog) => {
			await dialog.accept('Project for Empty Trash');
		});
		await page.getByTestId('create-project-btn').click();
		await page.waitForTimeout(500);

		const todoEmpty = page.getByTestId('todo-item-button').filter({ hasText: 'Todo for Empty Trash' });
		await todoEmpty.click();
		await todoEmpty.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(500);

		await page.goto('/projects');
		await page.waitForTimeout(300);
		const projectEmpty = page.getByTestId('project-item-button').filter({ hasText: 'Project for Empty Trash' });
		await projectEmpty.click();
		await projectEmpty.click({ button: 'right' });
		await page.waitForTimeout(300);
		await page.getByTestId('delete-selected-button').click();
		await page.waitForTimeout(500);

		// Go to trash
		await page.getByRole('link', { name: 'Trash' }).click();
		await page.waitForTimeout(300);

		// Verify items are there
		await expect(page.locator('.trash-item-button').filter({ hasText: /todo for empty trash/i })).toBeVisible();
		await expect(page.locator('.trash-item-button').filter({ hasText: /project for empty trash/i })).toBeVisible();

		// Setup dialog handler to accept the confirmation
		page.once('dialog', async (dialog) => {
			expect(dialog.type()).toBe('confirm');
			expect(dialog.message()).toContain('permanently delete all items');
			await dialog.accept(); // Confirm deletion
		});

		// Click "Empty Trash"
		await page.getByRole('button', { name: /empty trash/i }).first().click();
		await page.waitForTimeout(500);

		// Verify trash is empty
		await expect(page.locator('.trash-item-button').filter({ hasText: /todo for empty trash/i })).not.toBeVisible();
		await expect(page.locator('.trash-item-button').filter({ hasText: /project for empty trash/i })).not.toBeVisible();

		// Verify trash link is no longer visible in sidebar
		await expect(page.getByRole('link', { name: 'Trash' })).not.toBeVisible();
	});
});
