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
> Currently, only todos are being processed. This functionality will be expanded upon.

All data is currently on the frontend, with no plans to store it in the backend. As such, transferring data via API POST requests is currently not possible.

## Two-Way Sync (Proof of Concept)

In this [video](https://www.youtube.com/watch?v=dz38ET7uqqM):

1. I create a "Test" todo.
2. I select the todo and click "Sync To Things 3", which sends it to the Inbox in my Things 3 app.
3. To ensure the task is linked, an "x-success" callback (which contains the path to my "success" page and query params) is passed in the URL, prompting my Things 3 app to send the value of x-success back to my browser (**note**: I'm using OpenIn, so I have to manually click the dialog box to select Google Chrome).
4. My browser processes the query params on the `/success` page and connects the todo on my Things 3 app to its equivalent on Things.do.
5. When I make an update to "Test" by renaming it to "Test 2" and then click "Sync To Things 3" again, the title is updated on its equivalent in my Things 3 app.
6. I then make a change to the title on my Things 3 app by renaming it to "Test 3", select it, and then call this [Apple Shortcut](https://www.icloud.com/shortcuts/c41e4c26697243f78ea9d25d79301876) to open a URL on Google Chrome that takes the selected Things todo and updates the data back on its equivalent Things.do todo.

And this is one such way that two-way sync can be achieved between Things 3 and a web application.

> [!IMPORTANT]
> Since this is client-side, I would not transfer especially sensitive Things 3 tasks back to Things.do, using this method, because the URL usage is captured in my browser's history and can expose such information to lunchtime attacks within public spaces.

On a hypothetical version of this app that uses a backend server to process data, I would implement an API endpoint to process data back from Things.do and make it so that my shortcut makes a POST call to that endpoint instead of passing a URL to Google Chrome or some other browser.

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
