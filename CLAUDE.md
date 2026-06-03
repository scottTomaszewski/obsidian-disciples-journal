# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo. Keep this file small —
it is a map, not a manual. Detailed content lives in the docs it points to.

## What this is

**Disciples Journal** is an Obsidian plugin that renders Bible references and
passages inside notes (inline hover previews + full `bible` code blocks) and can
download passages on demand from the ESV API. See `README.md` for the user-facing
feature tour and `manifest.json` for plugin metadata.

## Design ethos

**Non-intrusive by default.** People use this plugin during devotion, prayer, and small
group. Features must never distract, frustrate, or shake the user out of an intimate time
with God. Default to quiet: nothing new appears, moves, or interrupts until the user
deliberately asks for it. No text shifting, no surprise popups, no persistent chrome. When
in doubt, do less.

## Where to look

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how the plugin is wired: services,
  components, data flow, and the lifecycle from `main.ts` to rendered verses.
  Read this before making structural changes.
- **[docs/](docs/)** — focused references:
  - [docs/index.md](docs/index.md) — table of contents for the docs folder
  - [docs/gotchas.md](docs/gotchas.md) — cross-cutting funky logic (listener lifecycle, pop-outs, cache, scroll)
  - [docs/esv-api.md](docs/esv-api.md) — ESV API integration, note storage, frontmatter
  - [docs/reference-formats.md](docs/reference-formats.md) — supported reference syntax + parsing
  - [docs/build-and-release.md](docs/build-and-release.md) — build, lint, and the `just release` flow
  - [docs/testing.md](docs/testing.md) — test harness, how to run tests, build/release gating
- **[FOLLOWUPS.md](FOLLOWUPS.md)** — small deferred findings captured during other
  tasks. Add an entry here instead of silently dropping out-of-scope work.
- **[ROADMAP.md](ROADMAP.md)** — larger planned / in-flight efforts.
- **[CHANGELOG.md](CHANGELOG.md)** — released changes per version.
- **[docs/handoffs/](docs/handoffs/)** — session "you are here" state (owned by the
  creating-handoffs skill); empty until work is handed off mid-flight.

## Conventions

- TypeScript, bundled with esbuild. Source lives in `src/`; `main.ts` is just the
  entry shim that re-exports `src/core/DisciplesJournalPlugin.ts`.
- This repo follows the **obsidian-plugin-development** skill (ESLint rules from
  `eslint-plugin-obsidianmd`). Invoke that skill when touching plugin APIs.
- Before committing: `npm run build` (runs `tsc -noEmit` + `npm test` + esbuild) and
  `npx eslint .` must both pass with zero errors/warnings. Tests live in `test/`
  (`npm test` / `devbox run test`) — see [docs/testing.md](docs/testing.md).
- `main.js` is a generated/bundled artifact — never edit it by hand.

## Working agreements

Keep the docs true — they only save the next agent time if they're trusted. When you
change the code, update the matching doc in the same change:

- **Add/rename/remove a source file or service** → update the module map in
  `ARCHITECTURE.md`.
- **Change a build/lint/release command** → update `CLAUDE.md` + `docs/build-and-release.md`.
- **Add or change ESV API behavior or note storage** → update `docs/esv-api.md`.
- **Add a new reference format or change parsing** → update `docs/reference-formats.md`.
- **Introduce a workaround, magic number, or non-obvious behavior** → give it a home:
  a precise inline comment if local, a `docs/gotchas.md` entry if cross-cutting.
- **Ship a user-facing change** → add a bullet under `## Unreleased` in `CHANGELOG.md`.
- **Hit a small in-scope tangent** (worth fixing, but it'd derail the current task) →
  add a numbered `## N.` section to `FOLLOWUPS.md`, and clear it before the next feature.
- **Plan a new feature or larger effort** → add a numbered `## N.` section to
  `ROADMAP.md` (and a plan doc once work starts). `FOLLOWUPS.md` and `ROADMAP.md` serve
  different lifespans — don't fold one into the other.
