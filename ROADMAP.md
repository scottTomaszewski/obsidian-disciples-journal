# Roadmap

New features and larger planned / in-flight efforts, tracked as numbered `## N.`
sections. For small in-scope tangents to clear before the next feature see
[FOLLOWUPS.md](FOLLOWUPS.md); for released history see [CHANGELOG.md](CHANGELOG.md).

> Entries below are **observations** about likely directions, inferred from the
> code — not committed plans. When work actually starts, promote the item to a real
> plan/spec doc and add a `## Status` line here. Mark a shipped item
> `**Status:** done`; prune and renumber on a periodic cleanup pass.

Each item carries a **Lens** (User-facing / Technical health / Growth & ecosystem)
and an **Effort** tag: XS (<1 h) · S (1–4 h) · M (1 day) · L (multi-day).

## 1. Multiple Bible versions

- **Lens:** User-facing · **Effort:** L
- The storage path scheme is already
  `<bibleContentVaultPath>/<preferredBibleVersion>/...` and settings expose a
  "preferred version", but `BookNames`, `ESVApiService`, and rendering assume ESV
  end-to-end. The headline feature; needs a version-agnostic content-source seam.

## 2. Bundled offline public-domain version (KJV/WEB)

- **Lens:** User-facing · **Effort:** M
- Today the plugin is inert without an ESV API token. Shipping a public-domain
  translation bundled in the plugin means it works on install with zero setup — a big
  onboarding win and a natural first consumer of the multi-version seam (#1).

## 3. Copy / export passage with attribution

- **Lens:** User-facing · **Effort:** S
- A "copy passage" action that emits clean markdown/text and auto-appends the required
  ESV copyright line. Serves the journaling use case and respects the copyright
  obligation noted in `README.md`.

## 4. Touch / mobile interaction

- **Lens:** User-facing · **Effort:** M
- `isDesktopOnly` is `false`, but the core interaction is hover-to-preview, which
  doesn't exist on touch. Define a tap/long-press affordance so the plugin is actually
  usable on mobile.

## 5. Reading plans / daily reading

- **Lens:** User-facing · **Effort:** M
- A code block or command that surfaces a day's passage from a plan (e.g. M'Cheyne,
  chronological). Leans on existing passage rendering; turns the plugin from a
  reference tool into a daily-habit tool.

## 6. Expand the test harness

- **Lens:** Technical health · **Effort:** M
- `BibleReference.parse` is covered; extend to `BookNames` normalization, `BibleFiles`
  path/filename logic, and the `BibleContentService` resolution funnel
  (cache → note → API). The highest-leverage safety net before the multi-version
  refactor (#1). See [docs/testing.md](docs/testing.md).

## 7. Multi-source content seam

- **Lens:** Technical health · **Effort:** L
- Decouple "where content comes from" from ESV specifically (bible-api.com, local
  USFM/USX import, etc.). Pairs with multiple versions (#1) but is the *source* axis
  rather than the *version* axis; enables offline import workflows.

## 8. Rendering robustness: finish pop-out styling + large-passage perf

- **Lens:** Technical health · **Effort:** M
- Promote the pop-out styling gap tracked in [FOLLOWUPS.md](FOLLOWUPS.md), and address
  rendering very long passages (lazy/virtualized render, cache eviction) so whole-book
  blocks don't jank.

## 9. Community plugin store submission

- **Lens:** Growth & ecosystem · **Effort:** S–M
- The repo already follows `eslint-plugin-obsidianmd` and gates on lint/tests. Getting
  listed in Obsidian's community catalog is the single biggest distribution lever and
  mostly a compliance/review task.

## 10. Clickable cross-references & footnotes

- **Lens:** Growth & ecosystem · **Effort:** M
- The ESV HTML already carries footnotes and cross-references (rendered today as static
  text). Making cross-refs clickable to open/preview the target passage turns rendered
  passages into a navigable study surface.
