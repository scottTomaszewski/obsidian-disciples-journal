# Architecture

How Disciples Journal is put together. This is the orientation doc — read it before
making structural changes. For user-facing features see `README.md`; for narrow
topics see [docs/](docs/).

## Big picture

The plugin hooks into Obsidian's markdown pipeline in three places and turns Bible
references into rich content:

1. **Inline references** — an inline code span like `` `John 3:16` `` becomes a
   styled span with a hover popup showing the verse text.
2. **Full passages** — a fenced ` ```bible ` code block renders the whole passage
   inline, with navigation and a clickable heading.
3. **Chapter notes** — clicking a reference opens (or creates) a markdown note for
   that chapter under the configured Bible content folder.

Content is resolved from local notes first, then downloaded from the **ESV API** on
demand (when enabled and a token is configured). Downloaded passages are persisted
as markdown notes whose frontmatter holds the raw API response, so they double as
the cache and the source of truth.

## Entry point and lifecycle

- `main.ts` is a thin shim that re-exports the real plugin class.
- `src/core/DisciplesJournalPlugin.ts` (`DisciplesJournalPlugin extends Plugin`) is
  the composition root. `onload()`:
  - loads settings (`loadSettings` merges saved data over `DEFAULT_SETTINGS`),
  - constructs the services and components (wiring described below),
  - registers the markdown processors, the Live Preview editor extension, the
    `Open Bible` + `Update frontmatter` commands, a ribbon icon, the settings tab,
    and an `active-leaf-change` handler that re-applies styles.
- The hover-preview event handler is added via `addChild(...)` so its global
  document listeners/timers are unloaded with the plugin (avoids leaks).

## Layers

Source is organized under `src/` by responsibility:

### `core/` — plugin wiring and domain model

- **`DisciplesJournalPlugin.ts`** — the `Plugin` subclass / composition root
  (settings, command registration, style refresh, `openChapterNote`,
  `updateAllBibleNoteFrontmatter`).
- **`BibleReference.ts`** — the central value object: `{ book, chapter, verse?,
  endVerse?, endChapter? }`. `BibleReference.parse(str)` understands the supported
  formats; the constructor normalizes the book name via `BookNames` and throws on
  an unknown book. See [docs/reference-formats.md](docs/reference-formats.md).
- **`BibleMarkupProcessor.ts`** — the two registered markdown callbacks
  (`processBibleCodeBlock`, `processInlineBibleReferences`). It checks the relevant
  display setting, then delegates to the renderer and handles errors.
- **`BibleEventHandlers.ts`** — the single, plugin-owned hover/popup lifecycle
  (mouseover/mouseout, show/hide timing). Loaded as a child component.
- **`VerseSelection.ts`** — pure value object: a verse set within one book →
  contiguous `BibleReference[]` runs + a display label (`Genesis 1:2-3, 5`).
- **`VerseSelectionService.ts`** — plugin-owned (`addChild`) holder of the *single*
  active verse selection across panes + its owning controller; notifies subscribers.

### `services/` — content resolution and storage

- **`BibleContentService.ts`** — the resolution funnel. `getBibleContent(ref)`
  returns a `BibleApiResponse`, trying in order: in-memory cache → local note
  frontmatter → ESV API download (only if `downloadOnDemand`).
- **`ESVApiService.ts`** — talks to `api.esv.org` via Obsidian's `requestUrl`.
  Converts raw API responses to `BibleApiResponse` (`toBibleApiResponse`, also
  reused when re-reading a saved note) and persists responses as markdown notes
  (`saveESVApiResponseAsMdNote`). Details in [docs/esv-api.md](docs/esv-api.md).
- **`BibleFiles.ts`** — path/file resolution for chapter & passage notes
  (static helpers) plus opening/creating notes and scroll-to-verse behavior
  (instance methods). Filenames: `Book N.md` for chapters, `Book NvV[-E].md` for
  verse ranges, under `<bibleContentVaultPath>/<version>/<Book>/`.
- **`BookNames.ts`** — canonical book-name normalization and per-book chapter
  counts (used e.g. to work around an ESV API single-chapter-book quirk).

### `components/` — rendering and UI

- **`BibleReferenceRenderer.ts`** — builds the DOM for inline references
  (`processInlineCodeBlocks`), full passages (`processFullBiblePassage`), and the
  hover popup (`showVersePreview`). HTML from the API is inserted via
  `sanitizeHTMLToDom`, never raw `innerHTML`.
- **`BibleReferenceInlineExtension.ts`** — CodeMirror editor extension that makes
  references work in Live Preview (edit mode), not just reading mode.
- **`BibleNavigation.ts`** — prev/next chapter navigation elements + navigation.
- **`BibleStyles.ts`** — injects/refreshes themed CSS per document (each popout
  window has its own `Document`, so styles are applied per-doc).
- **`BookSuggest.ts`**, **`OpenBibleModal.ts`** — the `Open Bible` modal and its
  book autocomplete.
- **`VerseWrapper.ts`** — `wrapPassageVerses(passageEl)`: wraps each rendered verse in a
  `.dj-verse` span (idempotent) so verses are selectable/highlightable.
- **`VerseSelectionController.ts`** — one per rendered passage: wraps verses, binds
  gestures (desktop tap/shift, mobile long-press-drag), reflects the service's selection
  (highlight) and owns the action bar.
- **`VerseActionBar.ts`** — floating bar shown while verses are selected; renders the
  Copy / Insert (and optional Append) actions with the configurable `split`/`toggle`/
  `submenu` format chooser.
- **`VerseActions.ts`** — turns a selection + format into the payload and performs Copy
  (clipboard), Insert (Editor API), or Append (`Vault.process`); extracts verse text for
  the blockquote format from the passage's own document.
- **`InsertTargetModal.ts`** — `FuzzySuggestModal<TFile>` note picker for "Append to note…".

### `utils/` — small helpers

- **`BibleApiResponse.ts`** — result type wrapping either a `BiblePassage` or an
  error with an `ErrorType` (auth, bad response, forbidden, …).
- **`BiblePassage.ts`** — `{ reference, html }` pairing for resolved content.
- **`BibleApiResponse`/`BiblePassage`** are what flow back out of the content
  service to the renderer.
- **`VerseId.ts`** — `parseVerseId(id)`: ESV marker id (`v01001002-1`) → `{chapter, verse}`.
- **`VerseFormatter.ts`** — pure builders for the three insert formats (inline reference,
  `bible` code block, blockquote-with-text + citation).
- **`FrontmatterUtil.ts`** — apply user-configured custom frontmatter to Bible
  notes (`getCustomFrontmatterForReference`, `applyCustomFrontmatter`).

### `settings/`

- **`DisciplesJournalSettings.ts`** — the settings interface, `DEFAULT_SETTINGS`,
  and the `DisciplesJournalSettingsTab` UI (display toggles, fonts/colors, content
  vault path, ESV token + download-on-demand).

## Data flow: rendering an inline reference

```
note renders
  → BibleMarkupProcessor.processInlineBibleReferences   (registered post-processor)
    → BibleReferenceRenderer.processInlineCodeBlocks
      → BibleReference.parse(text)
      → BibleContentService.getBibleContent(ref)
          ├─ in-memory passageCache?            → return
          ├─ local note exists? read frontmatter→ ESVApiService.toBibleApiResponse
          └─ downloadOnDemand? ESV API download → save note + cache
      → build span; on hover → BibleEventHandlers → showVersePreview popup
```

Full passages follow the same resolution path through `getBibleContent`, but render
the whole passage inline (`processFullBiblePassage`) with navigation + heading. Non-
contiguous references (`Genesis 1:2-3, 5`) resolve via `getBibleContentList`, which parses
the list with `BibleReference.parseList` and concatenates each run's HTML.

## Verse selection

After a full passage renders, `processFullBiblePassage` wraps its verses
(`wrapPassageVerses` → `.dj-verse` spans) and attaches a `VerseSelectionController`.
Selecting verses (tap/shift on desktop, long-press-drag on mobile) updates a per-passage
`VerseSelection` and pushes it to the plugin-owned `VerseSelectionService`, which holds the
single active selection. The owning controller highlights its verses and shows a
`VerseActionBar`; Copy / Insert / Append (and the editor `Insert … here` menu + commands)
run through `VerseActions`, formatting via `VerseFormatter`. See
[docs/gotchas.md](docs/gotchas.md) for the wrapping/gesture/bar-lifecycle details.

## Storage model

Downloaded passages are markdown notes whose **frontmatter holds the raw ESV API
JSON** (`query`, `canonical`, `parsed`, `passage_meta`, `passages`) plus any custom
frontmatter the user configured. The note body is a `bible` code block of the
canonical reference. Because the frontmatter is the cache, re-opening a chapter
reuses `toBibleApiResponse` on the stored data instead of re-hitting the API. See
[docs/esv-api.md](docs/esv-api.md).

## Tests

`test/` holds the test suites (Node's built-in `node:test` runner via `tsx`), one
`*.test.ts` per unit — currently `BibleReference`, `BookNames`, `VerseFormatter`,
`VerseId`, and `VerseSelection`. Run with `npm test` (or `devbox run test`); they
also gate `npm run build` and `just release`. See [docs/testing.md](docs/testing.md).

## Build

esbuild bundles `main.ts` → `main.js` (CJS, `es2018`); `obsidian`, `electron`, and
CodeMirror packages are externalized. `npm run build` type-checks and runs tests
first. See [docs/build-and-release.md](docs/build-and-release.md).
