---
applyTo: '**'
---

# Copilot Instructions for Web Todo Application

<Goals>Build web todo app like Things 3; sync todos/projects; local storage + IndexedDB (Dexie).</Goals>

## Quick Reference

**Essential Rules:**

- Use `$state` for reactivity; avoid `$:` reactive statements
- Use `onclick` instead of `on:click` for event listeners
- Prefer Tailwind CSS; use custom CSS only when necessary
- Use `pnpm` for all package management
- Use `data-testid` in Playwright tests
- Duplicate first, abstract later; avoid premature optimization
- Format with Prettier, lint with ESLint before committing
- Run tests targeting specific files, then full suite if changes are significant

## Project Overview

I am trying to build a web todo applications which handles things like individual to-dos and projects, akin to Things 3 by Cultured Code.

It should have the ability to sync to-dos and projects back and forth.

The application is currently client-side only, with data being persisted within the browser's local storage and IndexedDB, the latter being managed by Dexie for more complex data handling.

## Dependencies

<TechStack>SvelteKit 2 / Svelte 5 ($state, no $:, onclick), Tailwind + light custom CSS, pnpm.</TechStack>

## Code Style & Naming Conventions

<CodePreferences>Prettier, ESLint; duplicate first, abstract later.</CodePreferences>

Prettier is the formatter, and eslint is the linter. Code should be formatted before being committed.

When making components, don't go out of your way to abstract early. Feel free to duplicate code from existing components if it makes sense or make them from scratch if the requirements are different enough from what already exist. We can abstract the code into components and external functions later if need be, but we need an initial birds eye view of the functionality to determine how we can most efficiently abstract and structure the code.

### Naming Conventions

**Files:**

- Component files: `ComponentName.svelte` or `ComponentName.component.svelte` (PascalCase)
- Button components: `ComponentName.button.component.svelte`
- Utility/library files: `camelCase.ts` or `camelCase.js`
- Store files: `store.ts` or `storeType.store.ts`
- Test files: `file.spec.ts` or `file.test.ts`

**Variables & Functions:**

- Use `camelCase` for variables and functions
- Use `SCREAMING_SNAKE_CASE` for constants
- Prefix boolean variables with `is`, `has`, `can`, `should` (e.g., `isVisible`, `hasError`)
- Use descriptive names; avoid single-letter variables except in loops

**Database (Dexie):**

- Table names: `camelCase` (e.g., `todos`, `projects`, `tags`)
- Primary keys: `id` (auto-incrementing)
- Foreign keys: `parentId`, `projectId` (descriptive + Id suffix)
- Timestamps: `createdAt`, `updatedAt`, `completedAt`

**CSS Classes & IDs:**

- Use kebab-case for CSS classes (e.g., `todo-item`, `project-header`)
- Avoid inline styles; use Tailwind utilities or component-scoped styles
- For custom CSS, use BEM methodology when appropriate

## Testing

<Testing>Vitest for units; Playwright on stable routes; prefer data-testid.</Testing>

We use Vitest for testing units, and for browser testing, we use Playwright. Browser testing is more comprehensive but wasted on UI that we haven't solidified yet. Unit tests have higher staying power but do not cover the full user experience. When working with experimental UI, we'll pick out the especially complicated unit logic and write tests for those. For more established UI components and features, we will focus more on writing comprehensive Playwright tests to ensure that the user experience is consistent and that all interactions work as expected. As the project evolves, we can gradually increase our test coverage for both unit tests and browser tests to maintain a high level of quality and reliability in our application. Always consider the balance between testing effort and the stability of the code when deciding which tests to write, especially in the early stages of development.

### Playwright Testing

When repairing failing tests, prefer to:

- Use data-testid for getting elements instead of relying on text content or class names, as these are more resilient to changes in the UI and styling.
- Target failing tests when running them to see if they pass, and once all tests are passing, run the full suite to ensure that everything is working as expected and that no new issues have been introduced.
  - By full test suite, unless specified to be the entire test suite, just assume that we're talking about the tests in the file(s) we're currently working on.

Add Playwright tests for new or significant features, improvements, and bugfixes on these established routes:

- /focusing
- /later
- /blocked
- /logbook
- /trash
- /projects
- /projects/[id]
- /tags
- /settings

Focus tests on main user workflows and interactions rather than edge cases. Don't add tests to experimental features—wait until the UI stabilizes.

## State Management

State should be managed using Svelte 5's `$state` rune for reactive state. Always prefer `$state` over reactive declarations.

```javascript
let count = $state(0);
let user = $state({ name: '', email: '' });
```

Pass state down to child components via props for parent-to-child communication. Use `$state` for component-local state, temporary UI state (filters, expanded panels), and derived data.

Always use `let` with `$state` for reactive variables, not `const`.

Use Svelte's reactive versions of common built-ins when managing complex state. Instead of Map, Set, URL, etc., use SvelteMap, SvelteSet, SvelteURL from svelte/reactivity.

## Database & Dexie

### Schema Organization

Database schema is defined in [src/lib/db.ts](src/lib/db.ts). The schema includes interfaces for Todo and Project entities, along with the AppDB class that sets up Dexie with proper table definitions and indexes.

### Query Patterns

Keep database queries organized and reusable in [src/lib/db.ts](src/lib/db.ts) or in dedicated query files. Examples include functions like `getTodosByProject()`, `getActiveTodos()`, and `updateTodo()` that handle common database operations.

### Best Practices

- Always include `createdAt` and `updatedAt` timestamps
- Use meaningful index definitions for frequently queried fields
- Keep database operations separate from UI logic
- Handle IndexedDB quota errors gracefully
- Consider fallback to localStorage for simple, non-relational data

## Error Handling

- Wrap database operations in try-catch blocks
- Display user-friendly error messages via toast notifications (use `toastStore`)
- Log technical errors to console in development
- Never expose raw error messages to users

## Component Structure

```
ComponentName.svelte
├── <script>
│   ├── Imports
│   ├── Props (interface Props { ... })
│   ├── State ($state)
│   ├── Functions
├── <div class="component">
│   {markup}
└── <style>
    {scoped styles}
```

<Reference>See AGENTS.md for detailed, tool-agnostic guidance (MCP tools, Svelte/SvelteKit docs usage, and autofixer rules).</Reference>

## Development Workflow

### Setting Up Locally

1. Install dependencies: `pnpm install`
2. Run dev server: `pnpm run dev`
3. Run tests: `pnpm run test` or `pnpm run test:e2e`
4. Build: `pnpm run build`

### Before Committing

1. Run Prettier: `pnpm run format`
2. Run ESLint: `pnpm run lint`
3. Run relevant tests to ensure no regressions
4. Verify changes work as expected in the browser

### Git Workflow

- Make focused commits with clear messages
- Include feature area in commit (e.g., "feat(todo): add due date picker", "fix(ui): resolve modal spacing")
- Test your changes before pushing
