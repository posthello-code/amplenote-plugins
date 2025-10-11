# Amplenote Plugin - Bulk actions

Easy way to make bulk edits to tasks/notes.

- Remove all overdue tasks from schedule
- Hide many tasks at once
- Etc

## Installation

`yarn install`

## Testing

Run `yarn test` to run the tests.

## Building and Publishing

Once your plugin is ready to test within Amplenote, you can build and test it within Amplenote by following these steps:

1. [Install the Github Developers Plugin](https://www.amplenote.com/plugins/FZf22PXCKTRTB1tJwta1Nepq).
2. Compile your plugin using `npm run build` or `node esbuild.js` from the root folder for your project
3. Commit the resulting file (default location: `build/compiled.js`) to your git repo (e.g., `git add build/compiled.js && git commit -m "Compiled plugin"`)
4. Push your changes to GitHub (`git push`)
5. Choose "Github Plugin Builder: Refresh" from the note options menu in your plugin note
