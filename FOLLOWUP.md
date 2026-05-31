# Follow-up work

This file tracks known issues that were **intentionally deferred** during the
0.13.0 standards/compliance pass. The codebase currently passes `npx eslint .`
and `npm run build` with zero errors/warnings; the items below are silenced with
scoped `eslint-disable` comments (each referencing this file) so the deferral is
explicit rather than hidden.

Scope decision at the time: do the "safe subset" of standards fixes and leave the
file-API internals and the event-handler internals **functionally unchanged**.

---

## 1. Hover-preview event listeners leak (highest priority)

**Files:** `src/core/BibleEventHandlers.ts`, `src/components/BibleReferenceRenderer.ts`,
`src/components/BibleReferenceInlineExtension.ts`

**What's wrong:**
- `BibleReferenceRenderer.processInlineCodeBlocks` and the CodeMirror
  `eventHandlers` in `BibleReferenceInlineExtension` create a **new
  `BibleEventHandlers` instance on every `mouseover`/`mouseout`**.
- Each `BibleEventHandlers` constructor calls `document.addEventListener('mousemove', …)`
  and `document.addEventListener('click', …)` on the **global `document`**.
- These global listeners are only removed by `cleanup()`, which is **never called** —
  `DisciplesJournalPlugin.onunload()` is empty. So listeners accumulate for the
  lifetime of the app session and are never released on plugin unload.
- It also uses `window.setInterval` / `clearInterval` and the global `document`
  rather than `activeDocument`, so hover previews don't behave correctly in
  pop-out windows.

**Rules currently disabled for this:** `obsidianmd/prefer-active-doc`,
`obsidianmd/prefer-window-timers`, `@typescript-eslint/no-deprecated`
(file-level disable at the top of `BibleEventHandlers.ts`).

**Suggested fix:**
- Make `BibleEventHandlers` a single, long-lived instance owned by the plugin
  (or make it extend `Component`), created once in `onload`.
- Register all DOM listeners with `this.registerDomEvent(...)` and the interval
  with `this.registerInterval(...)` so Obsidian tears them down automatically.
- Use `activeDocument` / `activeWindow` instead of the globals for pop-out support.
- Stop instantiating `new BibleEventHandlers(...)` inside the hover callbacks.

---

## 2. File access via `vault.adapter` instead of the Vault/FileManager APIs

**Files:** `src/services/ESVApiService.ts`, `src/services/BibleFiles.ts`,
`src/core/DisciplesJournalPlugin.ts`

**What's wrong (Obsidian guideline rules 19–22):**
- `vault.adapter.write(...)` is used to create/overwrite notes
  (`ESVApiService.saveESVApiResponseAsMdNote`, `DisciplesJournalPlugin.updateAllBibleNoteFrontmatter`).
  Prefer `Vault.create()` for new files and `Vault.process()` for background
  edits of existing files. For frontmatter specifically, `FileManager.processFrontMatter()`
  is the intended API and would remove most of the manual YAML string handling
  in `FrontmatterUtil.ts`.
- `vault.adapter.exists` / `vault.adapter.mkdir` (directory creation) should use
  `Vault.getAbstractFileByPath()` / `Vault.createFolder()`.
- `BibleFiles.clearData` uses `vault.adapter.rmdir(...)`; deletion should go
  through `FileManager.trashFile()` so it respects the user's trash settings.
- Paths are built by string concatenation; run user-configurable paths through
  `normalizePath()`.

> Note: these are **not** currently flagged by the lint config (the obsidianmd
> rules target `Vault.trash/delete`, not `adapter.*`), so there are no disable
> comments for them — but they are still non-conformant and worth migrating.

---

## 3. Rendering ESV HTML via `innerHTML`

**File:** `src/components/BibleReferenceRenderer.ts` (4 sites)

**What's wrong:** passage HTML returned by the ESV API is injected with
`element.innerHTML = passage.html`. Flagged by `no-unsanitized/property` and
`@microsoft/sdl/no-inner-html`. The content is trusted (comes from the ESV API
over HTTPS), so this is currently accepted and disabled inline at each site.

**Suggested fix:** parse the HTML and rebuild it with Obsidian DOM helpers
(`createEl`/`createDiv`), or sanitize before insertion, so no raw HTML string is
written to the DOM.

---

## 4. `setTimeout` for scroll-to-verse

**File:** `src/services/BibleChapterFiles.ts`

The scroll-to-verse uses a fixed `window.setTimeout(..., 300)` to wait for the
note to render before querying for the verse element. This was left as-is (only
prefixed with `window.` for pop-out compatibility). A more robust approach would
key off a render/layout event rather than a magic delay.

---

## 5. Smaller cleanups noticed in passing

- `src/services/BibleContentService.ts` and `src/services/ESVApiService.ts` both
  contain `// TODO` notes about duplicated ESV-response → `BiblePassage`
  conversion logic that could be unified.
- `src/services/BibleChapterFiles.ts` has a `// TODO - logic in this class needs
  to move to BibleFiles` note; `BibleFiles.ts` has TODOs for `openChapterNote` /
  `openPassageNote` helpers.
- `openChapterNote` takes a `string` and re-parses it; several call sites already
  hold a `BibleReference` and could pass it directly (existing TODO).
