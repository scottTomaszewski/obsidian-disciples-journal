# Gotchas & funky logic

Non-obvious behavior that would cost the next agent grep-time or cause a wrong
"fix." API-specific quirks (the ESV `1-999` single-chapter workaround, the
frontmatter-as-cache model, `:`→`v` filename encoding) live in
[esv-api.md](esv-api.md); this file covers the cross-cutting runtime ones.

## Hover-listener lifecycle is Component-owned (don't re-add global listeners)

`BibleEventHandlers` is a **single, long-lived** instance added via
`this.addChild(...)` in `DisciplesJournalPlugin.onload`. That registration is what
loads its document listeners/timer and, crucially, tears them down on plugin
unload. A previous version leaked global `document` listeners; do **not** reintroduce
per-render or per-reference global listeners — route hover behavior through this one
handler. (`DisciplesJournalPlugin.ts:60-65`, `BibleEventHandlers.ts`.)

## Pop-out windows: styles don't fully carry over (known-incomplete)

Each Obsidian pop-out window is a separate `Document`, so `updateBibleStyles`
iterates all leaves and applies styles per-document. A code comment flags that this
**still doesn't fully work** — a freshly created pop-out doesn't get the style
vars ported over. If you touch styling and a pop-out looks unstyled, this is why,
not your change. (`DisciplesJournalPlugin.ts:131-158`.)

## The passage cache is keyed by object identity — it effectively never hits

`BibleContentService.passageCache` is a `Map<BibleReference, BiblePassage>`. It's
**set** with the canonical `passage.reference` from an API response and **looked
up** with the inbound (freshly parsed) `ref`. Two equal-but-distinct
`BibleReference` objects are different map keys, so cross-call lookups essentially
always miss; the real cache is the saved note on disk. Harmless today, but if you
ever rely on this in-memory cache, key it by `ref.toString()` instead.
(`BibleContentService.ts:14,72-80`.)

## scrollToVerse watches the DOM instead of guessing a delay

After `openFile`, a note body renders asynchronously, so `BibleFiles.scrollToVerse`
uses a `MutationObserver` to scroll the instant the `.verse-N` element appears,
with a **5000 ms** fallback that disconnects the observer if it never does (wrong
ref, or an edit mode that produces no verse elements). Don't replace this with a
fixed `setTimeout`. (`BibleFiles.ts:118-145`.)

## Verse selection: wrapping, gestures, and bar lifecycle

Verse selection is layered onto rendered passages by `VerseSelectionController` (one per
full `bible` passage, attached in `BibleReferenceRenderer.processFullBiblePassage`). A few
non-obvious things:

- **Verses aren't pre-wrapped.** ESV HTML marks a verse only with a
  `<b class="verse-num|chapter-num" id="vBBCCCVVV-N">`; the verse's text then runs as loose
  inline nodes until the next marker, sometimes across `<p>` boundaries.
  `wrapPassageVerses` (`VerseWrapper.ts`) walks each block and wraps each verse's run in a
  `<span class="dj-verse" data-chapter data-verse>`. It's **idempotent** (bails if a
  `.dj-verse` already exists) and a verse split across paragraphs yields two spans sharing
  the same `data-verse` — both highlight together. `parseVerseId` ignores the book digits;
  the book comes from the passage's canonical reference.
- **Mobile selection vs. scroll.** Touch uses a long-press threshold (`LONG_PRESS_MS`): a
  quick swipe scrolls normally; only a deliberate long-press engages drag-select (which
  then calls `preventDefault` on `touchmove`). A short tap toggles a single verse. Don't
  remove the threshold or you'll hijack scrolling.
- **One selection, globally.** `VerseSelectionService` (plugin-owned, `addChild`) holds a
  single active selection + its owning controller. Only the owner renders highlight and the
  action bar, so selecting in one passage clears another.
- **The action bar is per-`Document` and bottom-center docked.** It's appended to the
  passage's own `doc.body` (popout-safe). It's docked at the bottom-center of the viewport
  via CSS — **not** anchored to the passage — because a full chapter is taller than the
  viewport, so anchoring to the passage's `getBoundingClientRect().bottom` rendered the bar
  off-screen. Blockquote text is extracted from the owner's `sourceEl` (its own document) so
  popouts stay correct — never query the global `document`.
- **Selection clears when its passage unloads.** `controller.onunload` calls
  `service.clearIfOwner(this)`, so a note re-render or pane close drops a stale selection
  and its bar.
- **"Insert" doesn't target the active pane.** When you click a verse, the active pane
  *is* the passage's pane — usually a generated note under the Bible content folder, which
  is the last place you want the verse inserted. So the plugin tracks the last active
  **editable, non-generated** markdown note (`DisciplesJournalPlugin.handleActiveLeafChange`
  → `lastEditableLeaf`, filtered by `isBibleContentFile`) and `resolveInsertTarget()`
  returns it. There's no public "leaves in MRU order" API — this `active-leaf-change`
  tracking is the stand-in. Insert does **not** steal focus; it drops the text in and shows
  a `Passage … inserted into note …` notice (important when the target pane is in the
  background). The right-click "Insert here" path is unaffected — it always uses the clicked
  editor.
