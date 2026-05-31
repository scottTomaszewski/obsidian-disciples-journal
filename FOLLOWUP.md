# Follow-up work

This file tracks known issues that were **intentionally deferred** during the
0.13.0 standards/compliance pass. The codebase currently passes `npx eslint .`
and `npm run build` with zero errors/warnings; the items below are silenced with
scoped `eslint-disable` comments (each referencing this file) so the deferral is
explicit rather than hidden.

Scope decision at the time: do the "safe subset" of standards fixes and leave the
file-API internals and the event-handler internals **functionally unchanged**.

---

## 1. Hover-preview event listeners leak (highest priority) — ✅ RESOLVED

**Files:** `src/core/BibleEventHandlers.ts`, `src/components/BibleReferenceRenderer.ts`,
`src/components/BibleReferenceInlineExtension.ts`, `src/core/DisciplesJournalPlugin.ts`

**What was wrong:** `BibleEventHandlers` was instantiated on every
`mouseover`/`mouseout`, and each constructor added `mousemove`/`click` listeners to
the global `document` that were only removed by a `cleanup()` that was never called
(empty `onunload`), so listeners leaked for the app session. It also used bare
`document` and `setInterval`, breaking pop-out windows.

**Fix applied:** `BibleEventHandlers` now extends `Component` and is a single,
plugin-owned instance created in `onload` and registered with `addChild(...)`. Its
document listeners are attached via `registerDomEvent` (lazily per document, deduped
through a `WeakSet`, so pop-out windows are tracked too) and the close-poll runs on a
single `registerInterval` timer — all torn down automatically on unload. The hover
callbacks reuse the shared instance instead of constructing new ones. The file-level
`eslint-disable` banner (`obsidianmd/prefer-active-doc`,
`obsidianmd/prefer-window-timers`, `@typescript-eslint/no-deprecated`) was removed.

---

## 2. File access via `vault.adapter` instead of the Vault/FileManager APIs — ✅ RESOLVED

**Files:** `src/services/ESVApiService.ts`, `src/services/BibleFiles.ts`,
`src/core/DisciplesJournalPlugin.ts`

**What was wrong (Obsidian guideline rules 19–22):**
- `vault.adapter.write(...)` was used to create/overwrite notes
  (`ESVApiService.saveESVApiResponseAsMdNote`, `DisciplesJournalPlugin.updateAllBibleNoteFrontmatter`).
- `vault.adapter.exists` / `vault.adapter.mkdir` were used for existence checks
  and directory creation.
- `BibleFiles.clearData` used `vault.adapter.rmdir(...)`, bypassing the user's
  trash settings.
- Paths were built by string concatenation without `normalizePath()`.

**Fix applied:**
- `ESVApiService.saveESVApiResponseAsMdNote` now creates the note body with
  `Vault.create()` (reusing the existing `TFile` when present) and writes the API
  response + custom fields via `FileManager.processFrontMatter()`. Folder creation
  goes through `Vault.getAbstractFileByPath()` / `Vault.createFolder()`.
- `DisciplesJournalPlugin.updateAllBibleNoteFrontmatter` reads `canonical` from
  `metadataCache` and updates frontmatter via `FileManager.processFrontMatter()`.
- The manual YAML string builders in `FrontmatterUtil.ts`
  (`buildFrontmatterString` / `mergeCustomFrontmatterIntoExisting`) were replaced
  by a single `applyCustomFrontmatter(fm, customYaml)` that mutates the
  frontmatter object handed to `processFrontMatter` (dropping the
  `stringifyYaml` round-tripping).
- `BibleFiles.fileExistsForPassage` uses `getAbstractFileByPath` (now synchronous),
  and `BibleFiles.clearData` deletes through `FileManager.trashFile()`.
- All passage/content paths run through `normalizePath()`.

---

## 3. Rendering ESV HTML via `innerHTML` — ✅ RESOLVED

**File:** `src/components/BibleReferenceRenderer.ts` (4 sites)

**What was wrong:** passage HTML returned by the ESV API was injected with
`element.innerHTML = passage.html`. Flagged by `no-unsanitized/property` and
`@microsoft/sdl/no-inner-html`.

**Fix applied:** all four sites now run the passage HTML through Obsidian's
`sanitizeHTMLToDom()` and append the returned `DocumentFragment`, so no raw HTML
string is written to the DOM. The verse-preview extraction (`showVersePreview`)
parses into the sanitized fragment and queries/clones paragraphs off of it
instead of a temporary `innerHTML` div. The inline `eslint-disable` comments at
each site were removed.

---

## 4. `setTimeout` for scroll-to-verse — ✅ RESOLVED

**File:** `src/services/BibleChapterFiles.ts`

**What was wrong:** scroll-to-verse used a fixed `window.setTimeout(..., 300)`
to wait for the note to render before querying for the verse element — a magic
delay that could fire before a slow render finished (missing the scroll) or
needlessly late on a fast one.

**Fix applied:** `openChapterNote` now delegates to a `scrollToVerse(leaf, verse)`
helper that scrolls immediately if the verse element is already present
(cached note) and otherwise watches `leaf.view.containerEl` with a
`MutationObserver`, scrolling the instant `.verse-N` is rendered and then
disconnecting. A bounded `win.setTimeout(..., 5000)` fallback (using the leaf's
`WorkspaceContainer.win` for pop-out correctness) disconnects the observer if
the verse never appears, so it can't linger.

---

## 5. Smaller cleanups noticed in passing — ✅ RESOLVED

**Files:** `src/services/BibleContentService.ts`, `src/services/ESVApiService.ts`,
`src/services/BibleFiles.ts`, `src/services/BibleChapterFiles.ts` (removed),
`src/core/DisciplesJournalPlugin.ts`, `src/components/OpenBibleModal.ts`,
`src/components/BibleNavigation.ts`, `src/components/BibleReferenceRenderer.ts`

**What was wrong:**
- `BibleContentService` and `ESVApiService` each had their own copy of the
  ESV-response → `BiblePassage` conversion (parse `canonical`, take `passages[0]`),
  flagged by matching `// TODO` notes.
- `BibleChapterFiles` carried a `// TODO - logic in this class needs to move to
  BibleFiles` note while `BibleFiles` had placeholder TODOs for `openChapterNote` /
  `openPassageNote` — the two classes were the same responsibility split in half.
- `openChapterNote` took a `string` and re-parsed it via `BibleReference.parse`,
  even though every call site already had (or trivially built) a `BibleReference`.
- `BibleChapterFiles` also had a dead `getFullContentPath()` duplicating the one in
  `BibleFiles`, and `ESVApiService.downloadFromESVApi` had a stale "should take a
  `BibleReference`" TODO (it already did).

**Fix applied:**
- The conversion now lives in one place: `ESVApiService.toBibleApiResponse(data, ref)`
  (a static helper accepting the loosely-typed shape from both a fresh API response
  and a note's parsed frontmatter). `downloadFromESVApi` and
  `BibleContentService.getBibleContent` both call it; the duplicate private method
  and both TODOs are gone.
- `BibleChapterFiles` was merged into `BibleFiles` and deleted. `BibleFiles` now
  owns both the static path/file lookups (unchanged) and instance methods
  `openChapterNote` / `createChapterNote` / `scrollToVerse` (constructed once in
  `onload` with the content service). The static lookup split keeps
  `BibleContentService` / `ESVApiService` free of a circular dependency (the type-only
  `BibleContentService` import is erased at runtime).
- `openChapterNote` now takes a `BibleReference`; the modal, navigation, renderer,
  and plugin call sites pass one directly (no more `toString()` → re-parse round-trip),
  and its invalid-string guard is gone since the type guarantees validity.
- The dead `getFullContentPath()` and the stale `downloadFromESVApi` TODO were removed.
