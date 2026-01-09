---
applyTo: "**"
---

# Copilot Instructions for Web Todo Application

<Goals>Build web todo app like Things 3; sync todos/projects; local storage + IndexedDB (Dexie).</Goals>

## Project Overview

I am trying to build a web todo applications which handles things like individual to-dos and projects, akin to Things 3 by Cultured Code.

It should have the ability to sync to-dos and projects back and forth.

The application is currently client-side only, with data being persisted within the browser's local storage and IndexedDB, the latter being managed by Dexie for more complex data handling.

## Dependencies

<TechStack>SvelteKit 2 / Svelte 5 ($state, no $:, onclick), Tailwind + light custom CSS, pnpm.</TechStack>

The frontend library used is Sveltekit 2 with Svelte 5.

Svelte 5 introduces various changes over Svelte 4, such as the use of $state for reactive state management and the removal of the $: reactive statement in favor of a more streamlined approach. This means that when writing Svelte components, you should use $state to manage your component's state and avoid using the old $: syntax for reactive statements. Additionally, be mindful of the new features and changes in Svelte 5 to ensure that your code is up-to-date and follows the latest best practices.

Furthermore, element methods have been updated in Svelte 5, so when working with DOM elements, make sure to use the new syntax and methods provided by Svelte 5. This includes changes to how you access and manipulate DOM elements within your components. Always refer to the latest Svelte documentation for guidance on the updated element methods to ensure that your code is compatible with Svelte 5. For instance, rather than using on:click, onclick is the new way to attach event listeners in Svelte 5. This change is part of the effort to align Svelte's syntax more closely with standard HTML and JavaScript practices. When you want to add an event listener to an element, simply use the standard HTML attribute for that event, such as onclick for click events, instead of the previous Svelte-specific on:click syntax. This makes your code more intuitive and easier to read, especially for developers who are familiar with traditional HTML and JavaScript. Always ensure that you are using the correct syntax for event listeners in Svelte 5 to avoid any issues with your components' interactivity.

For CSS, we primarily use Tailwind for utility-first styling, but we also have some custom CSS for specific components and layouts. When writing styles, prefer using Tailwind classes for common styling needs, but feel free to write custom CSS when you need more specific or complex styles that Tailwind doesn't cover. This approach allows us to maintain a consistent design system while also giving us the flexibility to create unique styles when necessary. Always consider the maintainability and readability of your styles, and try to keep them organized and modular for easier management as the project grows.

We use pnpm for package management. Make sure to use pnpm when installing dependencies or running scripts related to package management. This ensures that the project remains consistent and that all team members are using the same package manager, which can help avoid issues with dependency resolution and version conflicts. When adding new packages, always use pnpm add <package-name> to ensure that the package is properly added to the project and that the lockfile is updated accordingly. Additionally, when running scripts defined in package.json, use pnpm run <script-name> to execute them, as this will ensure that the correct environment and dependencies are used for the script execution. Using pnpm consistently across the project helps maintain a smooth development workflow and keeps the project organized.

## Code Style

<CodePreferences>Prettier, ESLint; duplicate first, abstract later.</CodePreferences>

Prettier is the formatter, and eslint is the linter. Code should be formatted before being committed.

When making components, don't go out of your way to abstract early. Feel free to duplicate code from existing components if it makes sense or make them from scratch if the requirements are different enough from what already exist. We can abstract the code into components and external functions later if need be, but we need an initial birds eye view of the functionality to determine how we can most efficiently abstract and structure the code.

## Testing

<Testing>Vitest for units; Playwright on stable routes; prefer data-testid.</Testing>

We use Vitest for testing units, and for browser testing, we use Playwright. Browser testing is more comprehensive but wasted on UI that we haven't solidified yet. Unit tests have higher staying power but do not cover the full user experience. When working with experimental UI, we'll pick out the especially complicated unit logic and write tests for those. For more established UI components and features, we will focus more on writing comprehensive Playwright tests to ensure that the user experience is consistent and that all interactions work as expected. As the project evolves, we can gradually increase our test coverage for both unit tests and browser tests to maintain a high level of quality and reliability in our application. Always consider the balance between testing effort and the stability of the code when deciding which tests to write, especially in the early stages of development.

### Playwright Testing

When repairing failing tests, prefer to:

- Use data-testid for getting elements instead of relying on text content or class names, as these are more resilient to changes in the UI and styling.
- Target failing tests when running them to see if they pass, and once all tests are passing, run the full suite to ensure that everything is working as expected and that no new issues have been introduced.
  - By full test suite, unless specified to be the entire test suite, just assume that we're talking about the tests in the file(s) we're currently working on.

Feel free to proactively add Playwright tests for new or existing features, improvements or bugfixes in the following routes (based on the requirements I give or the comments existing in the code):

- /focusing
- /later
- /logbook
- /trash
- /projects
- /projects/[id]
- /tags
- /settings

As said previously, if tests fail, target only the failing tests when attempting to repair. Once the failing tests pass, determine--based on what changes were made--whether to run all tests or just tests related to the code that was changed. If the changes were minor and only affected a small portion of the code, it may be sufficient to run just the tests related to that code. However, if the changes were more significant or had the potential to impact other parts of the application, it would be prudent to run the full test suite to ensure that everything is still functioning correctly and that no new issues have been introduced. Always use your judgment to determine the appropriate level of testing based on the scope and impact of the changes made.

## References

<Reference>See AGENTS.md for detailed, tool-agnostic guidance (MCP tools, Svelte/SvelteKit docs usage, and autofixer rules).</Reference>

## Svelte

Since we are using Svelte, make sure to use Svelte's reactivity features effectively. Svelte provides reactive versions of various built-ins like Map, Set and URL that can be used just like their native counterparts, as well as a handful of additional utilities for handling reactivity.

```
import {
	MediaQuery,
	SvelteDate,
	SvelteMap,
	SvelteSet,
	SvelteURL,
	SvelteURLSearchParams,
	createSubscriber
} from 'svelte/reactivity';
```

Link: https://svelte.dev/docs/svelte/svelte-reactivity
