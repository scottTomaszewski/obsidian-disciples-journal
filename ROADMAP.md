# Roadmap

Larger planned or in-flight efforts. For small deferred findings see
[FOLLOWUPS.md](FOLLOWUPS.md); for released history see [CHANGELOG.md](CHANGELOG.md).

> Entries below are **observations** about likely directions, inferred from the
> code — not committed plans. Promote one to a real plan/spec doc (and a
> `## Status` section) when work actually starts.

## No efforts currently in flight.

## Observed future directions

- **Multiple Bible versions.** The storage path scheme is already
  `<bibleContentVaultPath>/<preferredBibleVersion>/...` and settings expose a
  "preferred version", but `BookNames`, `ESVApiService`, and rendering assume ESV
  end-to-end. Generalizing would mean a version-agnostic content-source seam.
- **A test harness.** There are no automated tests. `BibleReference.parse` (pure,
  pattern-heavy, highest-risk logic) is the natural first target. See
  [FOLLOWUPS.md](FOLLOWUPS.md).
