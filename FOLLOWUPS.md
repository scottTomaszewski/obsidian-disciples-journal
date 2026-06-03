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

## `BookNames.normalize` partial-matches too greedily

- **Identified:** 2026-06-02, while adding the test harness.
- **What:** `normalize` falls back to a `startsWith` scan over all book
  names/abbreviations, so any unknown string that begins with a registered token is
  silently accepted — e.g. `normalize("Hobbiton")` → `"Hosea"` (via the `ho`
  abbreviation), and `parse("Hobbiton 1:1")` returns a Hosea reference instead of
  `null`.
- **Why:** Surprising false-positives; a typo'd book can resolve to the wrong book.
- **Context:** `src/services/BookNames.ts` `normalize` (the `for (const [key, value]
  ... startsWith` loop). The test suite sidesteps this by using `"Xylophone"` (shares
  no prefix with any book) for its unknown-book cases — see
  `test/BibleReference.test.ts`. A fix likely needs anchored/whole-token matching, but
  must preserve legitimate abbreviation lookups; verify against the format matrix.
- **Effort:** S

## Finish pop-out window styling

- **Identified:** 2026-05-31, funky-logic sweep.
- **What:** Styles aren't fully ported into freshly created pop-out windows.
- **Why:** Passages render unstyled in pop-outs; a known rough edge.
- **Context:** `DisciplesJournalPlugin.updateBibleStyles` (`:131-158`) flags this in a
  comment; see [docs/gotchas.md](docs/gotchas.md). Tracked upstream in an Obsidian
  Discord thread linked in the code.
- **Effort:** M
