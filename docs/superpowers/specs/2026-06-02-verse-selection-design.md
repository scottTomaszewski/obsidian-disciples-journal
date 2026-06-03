# Verse Selection & Insert-into-Note — Design

## Context

Today the plugin renders Bible passages (full `bible` code blocks) but offers no way
to *act* on the verses inside them. The user wants to select one or more verses from a
rendered passage and pull them into a note — fluidly, the way they journal (inline
reference mid-sentence), study (full code block), or share (blockquote with the actual
text). This must work across multiple open notes/windows, on desktop **and** mobile,
and must never feel intrusive: users are often in devotion, prayer, or small group, and
the feature should stay completely invisible until they choose to act.

This is also the **foundation** for a future feature ("select verses → find all notes
that reference them"), so verse selection is being designed as a clean, reusable
primitive with a small action registry, not a one-off.

## Design ethos (new, to be recorded in CLAUDE.md)

A `## Design ethos` section will be added inline to `CLAUDE.md`:

> **Non-intrusive by default.** People use this plugin during devotion, prayer, and
> small group. Features must never distract, frustrate, or shake the user out of an
> intimate time with God. Default to quiet: nothing new appears, moves, or interrupts
> until the user deliberately asks for it. No text shifting, no surprise popups, no
> persistent chrome. When in doubt, do less.

Every decision below follows from this: selection adds zero visible chrome until a verse
is tapped; the action bar exists only while a selection exists; insertion never happens
automatically.

## Interaction model

**Selection (inside a rendered `bible` passage):**
- **Desktop tap / click a verse** → toggles that verse (non-contiguous by default: tap
  v2 then v5 selects exactly 2 and 5). Selected verses get a subtle inline highlight
  that follows the text across line wraps (verses share lines, so the highlight is on an
  inline run, not a line).
- **Desktop Shift+click a verse** → selects the contiguous range from the anchor (last
  toggled verse) through the clicked verse.
- **Mobile short tap** → toggles a single verse.
- **Mobile long-press (≈400 ms) then drag** → initiates a range selection and extends it
  as the finger moves. A press threshold guards against hijacking normal scrolling; a
  quick swipe scrolls as usual, only a deliberate long-press enters selection-drag.
- Selection **persists** across panes/windows until explicitly cleared (the bar's ✕, the
  `Esc` key, or a "Clear selection" command). Inserting does **not** auto-clear, so the
  user can insert the same selection in several places. Selection clears if its passage
  element is destroyed/re-rendered.

**Acting on a selection — same actions surfaced in three places:**
1. **Floating action bar** — appears (anchored near the selection; bottom-docked on
   narrow/mobile layouts) only while ≥1 verse is selected. Carries the reference label,
   a ✕, and the **Copy** and **Insert** actions (plus **Append to note…** *only when the
   user enables it* — see below). Same on desktop and mobile (the bar is the primary
   surface on mobile, which has no right-click). **How format is chosen on the bar is
   configurable** (`formatChooserStyle` setting) — all three presentations are implemented
   and the user picks one:
   - **`split`** (default) — split buttons `[Copy ▾] [Insert ▾]`; the body uses the
     default format, the ▾ chevron opens the other two.
   - **`toggle`** — a segmented format toggle `[ Ref | Block | Quote ]` plus plain action
     buttons `[Copy] [Insert]`; pick the format once, then an action.
   - **`submenu`** — plain action buttons, each of which opens a format submenu.
2. **Desktop right-click on the passage** → context menu with the same Copy / Insert
   actions (plus Append to note… when enabled), each with a format submenu.
3. **Desktop right-click inside any editor** (while a selection exists) → an
   "Insert `<ref>` here" entry that inserts at the click point — the precise, reverse-flow
   path that sidesteps the multi-window problem because the user placed their own cursor.

**Locations for insertion:**
- **Insert at cursor** — drops into the last-focused markdown editor at its cursor (bar
  button + a hotkey-able command). Primary path.
- **Right-click in editor → "Insert `<ref>` here"** — inserts at the exact click point.
- **Append to note…** *(optional, off by default)* — a fuzzy note-picker (`FuzzySuggestModal`
  over markdown `TFile`s) → appends to the end of the chosen note. This overlaps with
  Insert-at-cursor, so it ships disabled and is enabled via `enableAppendToNote`; only then
  does it appear on the bar / context menu and as a command.

**Three output formats (chosen per-insert; a configurable default sets the button body):**
- **Inline reference** — `` `Genesis 1:2-3, 5` `` (renders with the existing hover preview).
- **`bible` code block** — fenced block of the same reference (renders as the full passage).
- **Blockquote with text** — the actual verse text as a markdown blockquote ending in a
  `— Genesis 1:2-3, 5 (ESV)` citation; self-contained / portable to other apps.

## Non-contiguous references

`BibleReference` (`src/core/BibleReference.ts`) models only a single contiguous range and
its `parse` rejects comma lists. Because non-contiguous is the default selection behavior,
we need to represent and render `Genesis 1:2-3, 5`:

- **Selection state** is a set of `{chapter, verse}` within the passage. A new
  `VerseSelection` value object collapses the set into **contiguous runs**, each a normal
  `BibleReference`, plus a combined display label (`"Genesis 1:2-3, 5"`,
  cross-chapter-aware). This keeps `BibleReference` single-range — a multi-run selection is
  just `BibleReference[]`.
- **Blockquote** needs no parser change: verse text is extracted from the already-rendered
  DOM verse-spans (see wrapping below); citation uses the combined label.
- **Inline reference & code block** must round-trip render. Extend the parse/resolve path
  to accept a comma-separated verse list within a chapter → `BibleReference[]`, and have
  the content service resolve each run (ESV API `q=` accepts comma lists; runs can also be
  resolved/concatenated individually from cache). Documented in `docs/reference-formats.md`.

## Architecture

**Verse wrapping (the enabling primitive).** ESV HTML marks verses only with
`<b class="verse-num" id="v01001002-1">` (and `chapter-num` for the first verse); a verse's
text runs as loose inline nodes until the next marker, sometimes across `<p>` boundaries.
After `processFullBiblePassage` builds `passageEl`
(`src/components/BibleReferenceRenderer.ts:134`), a new pass walks each paragraph's child
nodes, opens a new `<span class="dj-verse" data-book data-chapter data-verse>` at each
verse-num/chapter-num marker, and collects following siblings until the next marker. The id
(`v BB CCC VVV -N`) is parsed to book/chapter/verse (ignore the `-N` suffix). A verse split
across paragraphs yields two spans sharing the same `data-verse`; both highlight together.
This same `data-*` tagging is what the future "find referencing notes" feature will key on.

**New modules (`src/`):**
- `core/VerseSelectionService.ts` — plugin-owned (added via `addChild`), holds the current
  `VerseSelection`, emits change events, exposes clear(). Single source of truth across panes.
- `core/VerseSelection.ts` — value object: verse set → contiguous `BibleReference[]` runs +
  combined label; pure, unit-tested.
- `components/VerseSelectionController.ts` — attached per rendered passage: does the verse
  wrapping, binds pointer/click/keyboard gestures (desktop tap/shift, mobile long-press+drag
  with scroll guard), applies/removes highlight classes, reflects the service's selection.
- `components/VerseActionBar.ts` — the floating bar; shown/hidden by the service's
  selection state; per-`Document` aware (popout windows each have their own doc, like
  `BibleStyles`). Renders its format chooser in whichever mode `formatChooserStyle`
  selects (`split` / `toggle` / `submenu`) — all three implemented.
- `components/InsertTargetModal.ts` — `FuzzySuggestModal<TFile>` note picker for the
  optional "Append to note…" action (only used when `enableAppendToNote` is on).
- `utils/VerseFormatter.ts` — turns a `VerseSelection` into each of the three output strings
  (inline ref, code block, blockquote+citation); pure, unit-tested.

**Touch points (existing):**
- `components/BibleReferenceRenderer.ts` — invoke wrapping + attach a
  `VerseSelectionController` in `processFullBiblePassage`.
- `core/DisciplesJournalPlugin.ts` (`onload`) — construct `VerseSelectionService`
  (`addChild`); `registerEvent(workspace.on('editor-menu', …))` for "Insert `<ref>` here";
  add commands: *Insert selected verses at cursor*, *Copy selected verses*,
  *Clear verse selection*; pass the service into the renderer.
- `settings/DisciplesJournalSettings.ts` — new settings (below); **reorganize the settings
  tab into clearly headed sections** for navigation (e.g. *Display*, *Typography & colors*,
  *Bible content & storage*, *ESV API*, *Verse selection*) using section headings
  (`new Setting(containerEl).setHeading()`), grouping the existing settings under them.
- `components/BibleStyles.ts` — styles for `.dj-verse`, `.dj-verse-selected`, the action bar.

## Settings
New settings (grouped under a *Verse selection* heading in the reorganized tab):
- `enableVerseSelection: boolean` (default `true`).
- `defaultInsertFormat: 'inline' | 'codeblock' | 'blockquote'` (default `'inline'`); also
  remembers the last-used format per session for the split-button body.
- `formatChooserStyle: 'split' | 'toggle' | 'submenu'` (default `'split'`) — which of the
  three (all-implemented) format-chooser presentations the action bar uses.
- `enableAppendToNote: boolean` (default `false`) — surfaces the optional "Append to note…"
  action on the bar / context menu / commands.

The settings tab itself is reorganized into headed sections (see touch points) so the
growing list stays navigable.

## Docs to update (per the repo's working agreements)
- **CLAUDE.md** — add the `## Design ethos` section (above).
- **ARCHITECTURE.md** — add the new modules to the module map + a short "verse selection"
  data-flow note.
- **docs/reference-formats.md** — document comma-list (non-contiguous) references.
- **docs/gotchas.md** — the verse-wrapping approach, mobile long-press-vs-scroll handling,
  per-Document action bar in popouts, selection lifecycle/clear-on-rerender.
- **docs/esv-api.md** — ESV attribution requirement note for reproduced verse text
  (blockquote includes `(ESV)`; document the copyright-notice obligation).
- **CHANGELOG.md** — a bullet under `## Unreleased`.

## Extensibility
The action surfaces (bar, passage menu) are populated from a small in-memory list of
"verse-selection actions" `{ id, label, run(selection), enabled? }`. Copy / Insert (and the
optional Append-to-note) are the first registrations; the future "find notes referencing
these verses" is added by registering one more action — no UI rework.

## Risks / things to watch
- **Mobile long-press vs. scroll** — the highest-risk UX. Press threshold + cancel-on-move
  before threshold. Fallback if janky: mobile uses tap-toggle only and relies on the bar.
- **Non-contiguous round-trip rendering** — the comma-list parser/resolve extension is the
  largest code change; blockquote works without it, so it can land slightly later than the
  text format.
- **Live Preview** — enable selection on rendered passages in reading mode and the
  live-preview rendered widget; do not interfere with source editing.
- **Popout windows** — wrap/bar/styles are per-`Document` (follow the `BibleStyles` pattern).
- **ESV licensing** — honor attribution on reproduced text.

## Implementation phases
1. **Wrapping + selection state**: `VerseSelection` (+ tests), verse-id parsing & DOM
   wrapping in the renderer, `VerseSelectionService`, highlight styles. Desktop tap-toggle
   + shift-range working; selection persists.
2. **Action surfaces**: `VerseActionBar` (all three format-chooser styles +
   `formatChooserStyle` setting), passage right-click menu, editor `editor-menu`
   "Insert here", and the three commands.
3. **Formats + locations**: `VerseFormatter` (+ tests) for all three formats; Copy
   (clipboard) and Insert-at-cursor (last-focused editor). Optional `InsertTargetModal`
   append behind `enableAppendToNote`.
4. **Non-contiguous round-trip**: extend parse/resolve for comma lists; reference-formats doc.
5. **Mobile gestures**: long-press-to-initiate + drag-to-extend with scroll guard.
6. **Settings (incl. tab reorganization into headed sections), docs, CHANGELOG, ethos
   section**; build + lint gating.

## Verification
- `npm run build` (tsc + `npm test` + esbuild) and `npx eslint .` pass clean.
- Unit tests: `VerseSelection` run-collapsing (contiguous, non-contiguous, cross-chapter),
  `VerseFormatter` output for all three formats, comma-list `BibleReference` parse round-trip.
- Manual in the demo vault (`disciples-journal-demo`):
  - Open a note with a `bible` block (e.g. Genesis 1). Tap v2 and v5 → both highlight, bar
    shows "Genesis 1:2, 5". Shift+click → contiguous range. ✕/Esc clears.
  - Each action × each format → correct Copy (paste-check) and Insert-at-cursor output,
    including the non-contiguous case. With `enableAppendToNote` on, the optional
    "Append to note…" picker appends to the chosen note.
  - Right-click in a second note → "Insert Genesis 1:2, 5 here" inserts at cursor.
  - Inserted inline ref and code block render correctly (incl. non-contiguous).
  - Mobile emulation: long-press initiates selection, drag extends, normal swipe scrolls.
  - Popout window: selection + bar work in the popped-out doc.
