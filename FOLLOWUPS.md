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

## Remove (or wire up) dead `BibleCodeblockFormatter`

- **Identified:** 2026-05-31, funky-logic sweep while documenting the repo.
- **What:** `src/utils/BibleCodeblockFormatter.ts` has no callers and carries a
  `// TODO - this probably belongs somewhere else`. Decide: delete it, or use it.
- **Why:** Dead code misleads the next agent into thinking it's part of the flow.
- **Context:** Confirmed unused via `grep -rn BibleCodeblockFormatter src/`.
- **Effort:** XS

## Remove vestigial `ESV` / `ESVVerse` globals

- **Identified:** 2026-05-31, funky-logic sweep.
- **What:** `src/types.d.ts` declares `interface ESVVerse` and
  `declare const ESV: ESVVerse[]`. The `ESV` global appears unused at runtime —
  verify, then drop the declaration if so.
- **Why:** A declared global with no backing implementation is a trap.
- **Context:** Only the declaration shows up in `src/`; confirm no consumer before removing.
- **Effort:** XS

## Add a test harness, starting with `BibleReference.parse`

- **Identified:** 2026-05-31, repo documentation pass.
- **What:** No automated tests exist. Add a lightweight runner and cover
  `BibleReference.parse` first.
- **Why:** `parse` is pure, pattern-heavy, and the riskiest logic to refactor blind.
- **Context:** `src/core/BibleReference.ts`; format matrix in `docs/reference-formats.md`.
- **Effort:** S

## Finish pop-out window styling

- **Identified:** 2026-05-31, funky-logic sweep.
- **What:** Styles aren't fully ported into freshly created pop-out windows.
- **Why:** Passages render unstyled in pop-outs; a known rough edge.
- **Context:** `DisciplesJournalPlugin.updateBibleStyles` (`:131-158`) flags this in a
  comment; see [docs/gotchas.md](docs/gotchas.md). Tracked upstream in an Obsidian
  Discord thread linked in the code.
- **Effort:** M
