# Changelog

## Unreleased

- Renders ESV passage HTML through Obsidian's `sanitizeHTMLToDom()` and appends the resulting fragment, instead of assigning the raw API response to `innerHTML`
- Scrolls to a referenced verse the moment it renders by watching the view for the verse element, instead of guessing with a fixed delay (more reliable on slow loads, snappier on fast ones)

## 0.13.0

- Brings the plugin in line with current Obsidian community standards
  - Modernizes the lint toolchain (flat config, `eslint-plugin-obsidianmd`, type-aware `typescript-eslint`); the plugin now passes `eslint` and `tsc` cleanly
  - Settings UI text uses sentence case
  - Corrects the manifest description and raises `minAppVersion` to `1.6.6` to match the APIs actually used
  - Tightens type safety (removes `any`, narrows YAML/error handling) and moves remaining inline styles to `styles.css`
- Fixes a hover-preview event-listener leak: `BibleEventHandlers` is now a single plugin-owned `Component` whose `document` listeners and close-poll timer are registered through the Obsidian lifecycle (so they're released on unload) and tracked per document for correct pop-out behavior, instead of being re-created and leaked on every hover
- Surfaces a notification when opening a chapter fails instead of failing silently — e.g. opening the Bible without an ESV API token configured now explains that a token is needed (and points to the plugin settings) rather than doing nothing
- Migrates file access off `vault.adapter` onto the intended `Vault`/`FileManager` APIs: notes are created with `Vault.create()` and their frontmatter written via `FileManager.processFrontMatter()`, folders use `getAbstractFileByPath`/`createFolder`, deletions go through `FileManager.trashFile()` (respecting the user's trash settings), and paths are run through `normalizePath()`
- Known follow-ups (tracked in `FOLLOWUP.md`): ESV HTML is still rendered via `innerHTML`, and a couple of smaller cleanups remain

## 0.12.0

- Adds "Open Bible" command and ribbon icon to browse books and chapters without a reference

## 0.11.0

- Adds template variable support: `{{book}}`, `{{chapter}}`, `{{verse}}`, `{{endVerse}}`, `{{endChapter}}`, `{{reference}}`

## 0.10.0

- Adds custom frontmatter support for Bible notes
  - Separate settings for chapter notes and passage notes
  - Custom YAML frontmatter is injected on newly downloaded notes
  - New command "Update frontmatter on all Bible notes" to backfill existing notes

## 0.9.2

- Removes some extra, ugly margin

## 0.9.1

- Adds settings to hide footnotes

## 0.8.1

- Adds `cssclasses: hide-dj-passage-properties` to passage notes to hide the noise

## 0.8.0

- Corrects an issue with hover previews not vanishing properly
- Moves to a new method of persisting bible data
  - Json files are no longer used
  - Chapters and passage files are now persisted in markdown files with raw data in frontmatter
  - Passage files replace colon with `v` to allow for sync functionality
- Adds "Clear Bible Data" button in settings to clear out old data

## 0.7.0

- Adds autocompletion search for book names in nav container

## 0.6.0

- Adds support for Live-Preview mode

## 0.5.1

- Corrects parsing issue with hyphens

## 0.5.0

- Major internal refactor to clean things up
