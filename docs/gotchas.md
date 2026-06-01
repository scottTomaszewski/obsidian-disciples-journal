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
