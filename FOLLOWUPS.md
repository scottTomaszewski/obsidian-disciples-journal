# Follow-ups

In-scope tangents found while working — important to fix, but they'd derail the task
at hand. Add a numbered `## N.` section below instead of chasing them now, and
**clear these before starting a new feature.** New features and larger efforts go in
[ROADMAP.md](ROADMAP.md), not here.

Mark a finished item with a `**Status:** done` line rather than deleting it; completed
items get pruned and the rest renumbered on a periodic cleanup pass. Each entry
carries the repo's standard fields (Identified / What / Why / Context / Effort), where
Effort is sized XS (<1 h) · S (1–4 h) · M (1 day) · L (multi-day).

<!-- Template — copy for each item, numbering sequentially:
## N. Short title
**Status:** open
- **Identified:** YYYY-MM-DD, the work it came up in.
- **What:** brief description of the change.
- **Why:** the motivation / what value it adds.
- **Context:** file paths, gotchas, anything that saves the next person grep time.
- **Effort:** XS | S | M | L
-->

## 1. Finish pop-out window styling

**Status:** open

- **Identified:** 2026-05-31, funky-logic sweep.
- **What:** Styles aren't fully ported into freshly created pop-out windows.
- **Why:** Passages render unstyled in pop-outs; a known rough edge.
- **Context:** `DisciplesJournalPlugin.updateBibleStyles` (`:219-246`) flags this in a
  comment; see [docs/gotchas.md](docs/gotchas.md). Tracked upstream in an Obsidian
  Discord thread linked in the code.
- **Effort:** M
