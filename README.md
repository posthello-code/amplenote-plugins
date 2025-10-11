# What's this repo for?

Used for building amplenote plugins!
It also contains all of the plugins I've built for amplenote.

# Plugin List

---

Bulk Actions:

- A plugin to do bulk actions tasks/notes etc
- Currently can remove all overdue tasks from schedule

## That's it for now, but more to come.

# Installation

`yarn install`

# Testing

Run `yarn test` to run the tests.

# Building plugins

Run `yarn build`

## Publishing

Once your plugin is ready to test within Amplenote, you can build and test it within Amplenote by following these steps:

1. [Install the Github Developers Plugin](https://www.amplenote.com/plugins/FZf22PXCKTRTB1tJwta1Nepq).
2. Commit the resulting file (default location: `build/compiled.js`) to your git repo (e.g., `git add build/compiled.js && git commit -m "Compiled plugin"`)
3. Push your changes to GitHub (`git push`)
4. Choose "Github Plugin Builder: Refresh" from the note options menu in your plugin note
