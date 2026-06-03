# Build & release

## Toolchain

- **TypeScript** compiled/bundled with **esbuild** (`esbuild.config.mjs`).
- Entry point `main.ts` → bundled output `main.js` (CJS, target `es2018`).
  `obsidian`, `electron`, and the CodeMirror/Lezer packages are externalized.
- `main.js` is generated — **do not edit it by hand**.
- A reproducible dev shell is provided via **devbox** (`devbox.json`).

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | esbuild in watch mode (inline sourcemaps, no minify). |
| `npm run build` | `tsc -noEmit -skipLibCheck` (type-check) → `npm test` → production esbuild (minified). |
| `npm run build-no-check` | Production esbuild only — skips type-checking **and tests**. |
| `npm test` | Runs the test suite (`tsx --test test/*.test.ts`). See [testing.md](testing.md). |
| `npm run lint` | `eslint .` |
| `npm run version` | `version-bump.mjs` (syncs `manifest.json` + `versions.json`). |

**Before committing**, both of these should pass clean:

```
npm run build
npx eslint .
```

The repo follows `eslint-plugin-obsidianmd` (see `eslint.config.mjs`) and the
**obsidian-plugin-development** skill — invoke that skill when touching plugin APIs.

## Releasing

Releases go through the `justfile` (`just release <version>`), which:

1. Refuses to run if `git status` is not clean.
2. Runs `npm test` — a failing test aborts the release before any files are mutated.
3. Sets `version` in both `manifest.json` and `package.json` (via `jq`).
5. Builds with `npm run build-no-check`.
6. Commits (`Prepares for release '<version>'`) and pushes.
7. Creates a GitHub release with `gh`, uploading `main.js`, `manifest.json`, and
   `styles.css` as assets.

### gh token note

devbox bundles its own `gh` (from nixpkgs) that can't read the host keyring where
`gh auth login` stored the token. The `_gh-token` recipe works around this by
falling back to the host `/usr/bin/gh auth token`. If it prints nothing, `gh` uses
its own auth.

## Release artifacts

Obsidian loads three files from a release: `manifest.json`, `main.js`, and
`styles.css`. `versions.json` maps plugin versions to the minimum Obsidian version.
