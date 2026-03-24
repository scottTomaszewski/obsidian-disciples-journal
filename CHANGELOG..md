# Changelog

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
