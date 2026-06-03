# Testing

## Running the tests

```
npm test          # or: devbox run test
```

Tests also run automatically as part of `npm run build` and `just release` (see
below) — a failing test blocks both.

## Layout & runner

- Tests live in `test/`, one `*.test.ts` file per unit under test
  (e.g. `test/BibleReference.test.ts`).
- The runner is **Node's built-in test runner** (`node:test` + `node:assert/strict`),
  with **`tsx`** transpiling TypeScript on the fly — no separate config file.
- The npm script is `tsx --test test/*.test.ts`. The single-`*` glob is expanded by
  the shell (so it works on Node 20 and 22 alike); keep test files flat in `test/`
  rather than nested.
- `@types/node` is pinned to a v22 line so `node:test` typings are available to
  `tsc` and eslint (which type-check `**/*.ts`, including the tests).

## What's covered

- `BibleReference` — `parse` (the full format matrix from
  [reference-formats.md](reference-formats.md), book-name variants, normalization,
  null cases), `toString` round-trips, and the value-object helpers.

This is the first suite; extend it as other pure logic becomes test-worthy.

## Gating

- `npm run build` runs `tsc` → `npm test` → esbuild, so tests must pass before a
  bundle is produced (and before you commit, per [../CLAUDE.md](../CLAUDE.md)).
- `just release` runs `npm test` before bumping versions, so a failing test aborts
  the release before anything is mutated. See [build-and-release.md](build-and-release.md).
