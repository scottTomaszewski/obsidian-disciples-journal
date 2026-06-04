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

Releases go through the `justfile` (`just release <version>`). Accumulate user-facing
changes under `## Unreleased` in [../CHANGELOG.md](../CHANGELOG.md) as you work — the
recipe promotes that section to the release version for you (no manual rename needed).
The recipe:

1. Normalizes the version (strips a leading `v`) and rejects anything that isn't semver
   (e.g. `1.0.1` or `1.0.1-rc.1`).
2. Refuses to run if `git status` is not clean, or if the tag already exists.
3. Syncs the version into `manifest.json`, `package.json`, and `versions.json` (via
   `jq`) — `versions.json` maps the new version to the current `minAppVersion`.
4. Promotes `## Unreleased` → `## <version>` in `CHANGELOG.md` and uses that section's
   body as the GitHub release notes (falls back to `Release <version>` if empty).
5. Builds with `npm run build` (type-check + tests + production esbuild) — a failing
   type-check or test aborts the release after the file edits but before commit/push.
6. Commits (`Prepares for release '<version>'`) the four metadata/changelog files and
   pushes the current branch (`git push -u origin HEAD`).
7. Creates a GitHub release with `gh`, targeting the just-pushed branch and uploading
   `main.js`, `manifest.json`, and `styles.css` as assets.

### gh token note

devbox bundles its own `gh` (from nixpkgs) that can't read the host keyring where
`gh auth login` stored the token. The `_gh-token` recipe works around this by
falling back to the host `/usr/bin/gh auth token`. If it prints nothing, `gh` uses
its own auth.

## Release artifacts

Obsidian loads three files from a release: `manifest.json`, `main.js`, and
`styles.css`. `versions.json` maps plugin versions to the minimum Obsidian version.
