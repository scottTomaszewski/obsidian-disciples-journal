# Docs

Focused references for working on Disciples Journal. For the high-level map start
with [../CLAUDE.md](../CLAUDE.md); for how the pieces fit together read
[../ARCHITECTURE.md](../ARCHITECTURE.md).

## Contents

- **[gotchas.md](gotchas.md)** — cross-cutting funky logic: hover-listener
  lifecycle, pop-out styling, the identity-keyed cache, scroll-to-verse.
- **[esv-api.md](esv-api.md)** — ESV API integration: requests, on-demand download,
  how passages are stored as notes, and the frontmatter-as-cache model.
- **[reference-formats.md](reference-formats.md)** — supported Bible reference
  syntax and how `BibleReference.parse` interprets it.
- **[build-and-release.md](build-and-release.md)** — building, type-checking,
  linting, and the `just release` workflow.

## See also

- [../README.md](../README.md) — user-facing feature documentation.
- [../FOLLOWUPS.md](../FOLLOWUPS.md) — deferred work.
- [../CHANGELOG.md](../CHANGELOG.md) — released changes.
