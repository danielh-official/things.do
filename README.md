# Things.do

A web app for doing a few extra things and then sending the rest to Things (Cultured Code).

Demo: [https://thingsdotdo.netlify.app/](https://thingsdotdo.netlify.app/)

## Why?

The purpose of this app is not to replace Things 3 (by Cultured Code) but to extend it for solo work tasks at the desk (like coding or writing).

The only intended extra features right now are:

- Setting todos/projects as blockers of other todos/projects
- Writing dated entries on todos/projects

This is not intended to be a mobile application, so less stress will be placed on making it reactive to smaller screens, nor are there any plans for iOS/Android apps.

For bugs and feature requests, report them in [issues](https://github.com/danielh-official/things.do/issues).

Syncing to things is handled via Things 3 callback url scheme (see: [send to things 3](./src/lib/components/SendToThings3.button.component.svelte) and [success](./src/routes/success/+page.svelte)) and syncing back from things is handled by inputting a url (see: [process](./src/routes/process/+page.svelte)).

For processing your selected Things items, you may use this [Apple Shortcut](https://www.icloud.com/shortcuts/c41e4c26697243f78ea9d25d79301876) to build the url and open it in Google Chrome.

> [!NOTE]
> Currently, only todos are being processed. This functionality will be expanded.

All data is currently on the frontend, with no plans to store in the backend. As such, transferring data via API POST requests is currently not possible.

## Developing

Install dependencies with `pnpm install`.

Start a development server:

```sh
pnpm dev
```

### Building

To create a production version of your app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.
