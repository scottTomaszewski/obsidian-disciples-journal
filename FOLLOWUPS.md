# Workspace Follow-Ups

Lightweight tracking for tasks identified during other work that weren't tackled in the original scope. These are intentionally deferred — captured here so they don't get lost.

Add new entries at the top. Remove entries when done (commit message can reference them).

## Entry format

Each entry should include:

- **Identified:** YYYY-MM-DD and the work it came up in
- **What:** brief description of the change
- **Why:** the motivation / what value it adds
- **Context:** background, file paths, gotchas, anything that would save the next person 10 minutes of grepping
- **Effort:** rough sizing — XS (<1 h), S (1–4 h), M (1 day), L (multi-day)

---

## Finish pop-out window styling

- **Identified:** 2026-05-31, funky-logic sweep.
- **What:** Styles aren't fully ported into freshly created pop-out windows.
- **Why:** Passages render unstyled in pop-outs; a known rough edge.
- **Context:** `DisciplesJournalPlugin.updateBibleStyles` (`:131-158`) flags this in a
  comment; see [docs/gotchas.md](docs/gotchas.md). Tracked upstream in an Obsidian
  Discord thread linked in the code.
- **Effort:** M
