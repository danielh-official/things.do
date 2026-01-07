import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testDir: 'e2e',
	timeout: 10000, // 10 seconds per test
	maxFailures: process.env.CI ? 1 : undefined // Stop after first failure in CI
});
