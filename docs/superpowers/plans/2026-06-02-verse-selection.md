# Verse Selection & Insert-into-Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user select one or more verses inside a rendered `bible` passage and pull them into a note as an inline reference, a `bible` code block, or a blockquote of the actual text — non-intrusively, on desktop and mobile.

**Architecture:** A small post-render pass wraps each ESV verse in a targetable `<span class="dj-verse">`. A plugin-owned `VerseSelectionService` holds the single current selection; a per-passage `VerseSelectionController` handles gestures + highlighting and shows a `VerseActionBar`. Pure value objects (`VerseSelection`, `VerseFormatter`, `parseVerseId`, `BibleReference.parseList`) hold all the unit-testable logic; DOM/UI is thin glue verified by build + manual testing.

**Tech Stack:** TypeScript, esbuild, Obsidian plugin API, `node:test` via `tsx` (pure-logic tests only — no DOM test harness in this repo).

---

## Testing reality (read first)

This repo's tests run in **plain Node** (`npm test` → `tsx --test test/*.test.ts`). There is
**no jsdom / DOM**. So:
- **Unit-test (TDD):** `parseVerseId`, `VerseSelection`, `BibleReference.parseList`, `VerseFormatter` — pure functions/value objects.
- **Build + manual-verify (no unit test):** verse wrapping, gesture controller, action bar, modal, settings, command/menu wiring. Each such task ends with `npm run build` + `npx eslint .` clean, and an explicit manual check in the demo vault.

`npm run build` runs `tsc -noEmit` + `npm test` + esbuild, so it gates type-correctness and the unit tests together. Follow the **obsidian-plugin-development** skill for any Obsidian API usage (e.g. `requestUrl` over `fetch`, `setHeading()` sections, `Component`/`registerDomEvent` for listener cleanup).

## File structure

**Create (pure, unit-tested):**
- `src/utils/VerseId.ts` — `parseVerseId(id)`: ESV `v01001002-1` → `{chapter, verse}`.
- `src/core/VerseSelection.ts` — verse-set value object → contiguous `BibleReference[]` runs + display label.
- `src/utils/VerseFormatter.ts` — `VerseSelection`/label + text → the three output strings.
- `test/VerseId.test.ts`, `test/VerseSelection.test.ts`, `test/VerseFormatter.test.ts`, and new cases in `test/BibleReference.test.ts`.

**Create (integration, build+manual):**
- `src/core/VerseSelectionService.ts` — plugin-owned current selection + change listeners.
- `src/components/VerseWrapper.ts` — `wrapPassageVerses(passageEl)` DOM pass.
- `src/components/VerseSelectionController.ts` — per-passage gestures, highlight, owns the bar.
- `src/components/VerseActionBar.ts` — floating bar with the 3 configurable chooser styles.
- `src/components/InsertTargetModal.ts` — optional `FuzzySuggestModal<TFile>` note picker.

**Modify:**
- `src/core/BibleReference.ts` — add `static parseList(...)`.
- `src/components/BibleReferenceRenderer.ts` — wrap verses + attach controller in `processFullBiblePassage`.
- `src/core/DisciplesJournalPlugin.ts` — construct service, register commands + `editor-menu`, pass service to renderer.
- `src/settings/DisciplesJournalSettings.ts` — new settings + reorganized tab.
- `src/components/BibleStyles.ts` — `.dj-verse`, `.dj-verse-selected`, action-bar CSS.
- Docs: `CLAUDE.md`, `ARCHITECTURE.md`, `docs/reference-formats.md`, `docs/gotchas.md`, `docs/esv-api.md`, `CHANGELOG.md`.

---

## Task 1: `parseVerseId` — read the verse out of an ESV marker id

**Files:**
- Create: `src/utils/VerseId.ts`
- Test: `test/VerseId.test.ts`

ESV markers look like `<b class="verse-num" id="v01001002-1">` and (first verse of a chapter) `<b class="chapter-num" id="v01001001-1">`. The id is `v` + 2-digit book + 3-digit chapter + 3-digit verse + `-<instance>`. We only need chapter + verse (the book comes from the passage's canonical reference).

- [ ] **Step 1: Write the failing test**

```ts
// test/VerseId.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVerseId } from "../src/utils/VerseId";

test("parseVerseId", async (t) => {
	await t.test("verse-num id", () => {
		assert.deepEqual(parseVerseId("v01001002-1"), { chapter: 1, verse: 2 });
	});
	await t.test("chapter-num id (first verse)", () => {
		assert.deepEqual(parseVerseId("v01001001-1"), { chapter: 1, verse: 1 });
	});
	await t.test("multi-digit chapter and verse", () => {
		assert.deepEqual(parseVerseId("v43011035-2"), { chapter: 11, verse: 35 });
	});
	await t.test("non-matching ids return null", () => {
		assert.equal(parseVerseId("f1-1"), null);
		assert.equal(parseVerseId(""), null);
		assert.equal(parseVerseId("v123-1"), null);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test test/VerseId.test.ts`
Expected: FAIL — `Cannot find module '../src/utils/VerseId'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/VerseId.ts

/** A chapter+verse coordinate within a single book. */
export interface VerseRef {
	chapter: number;
	verse: number;
}

const VERSE_ID = /^v\d{2}(\d{3})(\d{3})-\d+$/;

/**
 * Parse an ESV passage marker id (e.g. "v01001002-1" on a `verse-num`/`chapter-num`
 * `<b>`) into its chapter and verse. Returns null for ids that aren't verse markers.
 * Book digits are ignored — callers know the book from the passage reference.
 */
export function parseVerseId(id: string): VerseRef | null {
	const m = VERSE_ID.exec(id);
	if (!m) return null;
	return { chapter: parseInt(m[1], 10), verse: parseInt(m[2], 10) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test test/VerseId.test.ts`
Expected: PASS (all subtests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/VerseId.ts test/VerseId.test.ts
git commit -m "feat: parseVerseId for ESV verse markers"
```

---

## Task 2: `VerseSelection` — verse set → runs + label

**Files:**
- Create: `src/core/VerseSelection.ts`
- Test: `test/VerseSelection.test.ts`

Holds an ordered, de-duplicated set of `VerseRef` for one book. `runs()` collapses consecutive verses **within the same chapter** into `BibleReference` ranges (cross-chapter consecutiveness is NOT merged — it needs per-chapter verse counts we don't track). `label()` renders YouVersion-style: book once, then chapter:verse runs joined by `", "`, repeating the chapter only when it changes.

- [ ] **Step 1: Write the failing test**

```ts
// test/VerseSelection.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { VerseSelection } from "../src/core/VerseSelection";

function sel(book: string, ...vs: [number, number][]): VerseSelection {
	const s = new VerseSelection(book);
	for (const [c, v] of vs) s.toggle({ chapter: c, verse: v });
	return s;
}

test("VerseSelection", async (t) => {
	await t.test("toggle adds then removes", () => {
		const s = sel("Genesis");
		s.toggle({ chapter: 1, verse: 2 });
		assert.equal(s.has({ chapter: 1, verse: 2 }), true);
		s.toggle({ chapter: 1, verse: 2 });
		assert.equal(s.has({ chapter: 1, verse: 2 }), false);
		assert.equal(s.isEmpty(), true);
	});

	await t.test("contiguous run collapses to a range label", () => {
		const s = sel("Genesis", [1, 2], [1, 3], [1, 4]);
		assert.equal(s.label(), "Genesis 1:2-4");
		const runs = s.runs();
		assert.equal(runs.length, 1);
		assert.equal(runs[0].toString(), "Genesis 1:2-4");
	});

	await t.test("non-contiguous verses join with commas (out-of-order input)", () => {
		const s = sel("Genesis", [1, 5], [1, 2], [1, 3]);
		assert.equal(s.label(), "Genesis 1:2-3, 5");
		assert.deepEqual(s.runs().map((r) => r.toString()), ["Genesis 1:2-3", "Genesis 1:5"]);
	});

	await t.test("single verse", () => {
		assert.equal(sel("John", [3, 16]).label(), "John 3:16");
	});

	await t.test("multiple chapters repeat the chapter, no cross-chapter merge", () => {
		const s = sel("Genesis", [1, 31], [2, 1]);
		assert.equal(s.label(), "Genesis 1:31, 2:1");
		assert.equal(s.runs().length, 2);
	});

	await t.test("selectRange fills verses within a chapter", () => {
		const s = new VerseSelection("Genesis");
		s.selectRange({ chapter: 1, verse: 2 }, { chapter: 1, verse: 5 });
		assert.equal(s.label(), "Genesis 1:2-5");
	});

	await t.test("verseList is sorted", () => {
		const s = sel("Genesis", [1, 5], [1, 2]);
		assert.deepEqual(s.verseList(), [
			{ chapter: 1, verse: 2 },
			{ chapter: 1, verse: 5 },
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test test/VerseSelection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/VerseSelection.ts
import { BibleReference } from "./BibleReference";
import { VerseRef } from "../utils/VerseId";

/**
 * A mutable, ordered, de-duplicated set of verses within one book. Produces
 * contiguous BibleReference runs and a human display label. Pure (no DOM / Obsidian).
 */
export class VerseSelection {
	readonly book: string;
	private verses: VerseRef[] = [];

	constructor(book: string) {
		this.book = book;
	}

	private indexOf(v: VerseRef): number {
		return this.verses.findIndex((x) => x.chapter === v.chapter && x.verse === v.verse);
	}

	has(v: VerseRef): boolean {
		return this.indexOf(v) !== -1;
	}

	isEmpty(): boolean {
		return this.verses.length === 0;
	}

	count(): number {
		return this.verses.length;
	}

	clear(): void {
		this.verses = [];
	}

	add(v: VerseRef): void {
		if (!this.has(v)) {
			this.verses.push({ chapter: v.chapter, verse: v.verse });
			this.sort();
		}
	}

	toggle(v: VerseRef): void {
		const i = this.indexOf(v);
		if (i === -1) this.add(v);
		else this.verses.splice(i, 1);
	}

	/** Add every verse from anchor..focus when they share a chapter; else just add focus. */
	selectRange(anchor: VerseRef, focus: VerseRef): void {
		if (anchor.chapter !== focus.chapter) {
			this.add(focus);
			return;
		}
		const lo = Math.min(anchor.verse, focus.verse);
		const hi = Math.max(anchor.verse, focus.verse);
		for (let v = lo; v <= hi; v++) this.add({ chapter: anchor.chapter, verse: v });
	}

	/** Sorted copy of the selected verses. */
	verseList(): VerseRef[] {
		return this.verses.map((v) => ({ chapter: v.chapter, verse: v.verse }));
	}

	private sort(): void {
		this.verses.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
	}

	/** Collapse consecutive verses within a chapter into BibleReference ranges. */
	runs(): BibleReference[] {
		const out: BibleReference[] = [];
		let start: VerseRef | null = null;
		let prev: VerseRef | null = null;

		const flush = () => {
			if (!start || !prev) return;
			const endVerse = prev.verse === start.verse ? undefined : prev.verse;
			out.push(new BibleReference(this.book, start.chapter, start.verse, endVerse));
		};

		for (const v of this.verses) {
			if (prev && v.chapter === prev.chapter && v.verse === prev.verse + 1) {
				prev = v;
				continue;
			}
			flush();
			start = v;
			prev = v;
		}
		flush();
		return out;
	}

	/** YouVersion-style label, e.g. "Genesis 1:2-3, 5" or "Genesis 1:31, 2:1". */
	label(): string {
		const runs = this.runs();
		if (runs.length === 0) return this.book;
		let lastChapter: number | null = null;
		const parts: string[] = [];
		for (const r of runs) {
			const versePart = r.endVerse !== undefined ? `${r.verse}-${r.endVerse}` : `${r.verse}`;
			parts.push(r.chapter === lastChapter ? versePart : `${r.chapter}:${versePart}`);
			lastChapter = r.chapter;
		}
		return `${this.book} ${parts.join(", ")}`;
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test test/VerseSelection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/VerseSelection.ts test/VerseSelection.test.ts
git commit -m "feat: VerseSelection value object (runs + label)"
```

---

## Task 3: `BibleReference.parseList` — parse comma-list references

**Files:**
- Modify: `src/core/BibleReference.ts` (add a static method; do not change existing `parse`)
- Test: `test/BibleReference.test.ts` (add a test block)

Inverse of `VerseSelection.label()`. The first item is a full reference via the existing `parse`; later comma-separated items may be a bare verse (`5`), a bare verse range (`5-7`) inheriting the previous book+chapter, or `chapter:verse[-end]` inheriting only the book. Returns `null` if any item fails.

- [ ] **Step 1: Write the failing test**

```ts
// Append to test/BibleReference.test.ts
test("parseList — comma/non-contiguous lists", async (t) => {
	await t.test("single ref still parses as a one-element list", () => {
		const list = BibleReference.parseList("John 3:16");
		assert.ok(list);
		assert.equal(list.length, 1);
		assert.equal(list[0].toString(), "John 3:16");
	});

	await t.test("bare verse inherits book + chapter", () => {
		const list = BibleReference.parseList("Genesis 1:2-3, 5");
		assert.ok(list);
		assert.deepEqual(list.map((r) => r.toString()), ["Genesis 1:2-3", "Genesis 1:5"]);
	});

	await t.test("chapter:verse item inherits only the book", () => {
		const list = BibleReference.parseList("Genesis 1:31, 2:1");
		assert.ok(list);
		assert.deepEqual(list.map((r) => r.toString()), ["Genesis 1:31", "Genesis 2:1"]);
	});

	await t.test("round-trips a VerseSelection label", () => {
		const list = BibleReference.parseList("Genesis 1:2-4, 7, 2:1");
		assert.ok(list);
		assert.deepEqual(list.map((r) => r.toString()), ["Genesis 1:2-4", "Genesis 1:7", "Genesis 2:1"]);
	});

	await t.test("invalid item makes the whole list null", () => {
		assert.equal(BibleReference.parseList("Genesis 1:2, banana"), null);
		assert.equal(BibleReference.parseList(""), null);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test test/BibleReference.test.ts`
Expected: FAIL — `BibleReference.parseList is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add this method to the `BibleReference` class in `src/core/BibleReference.ts` (e.g. just after `parse`):

```ts
	/**
	 * Parse a possibly non-contiguous list like "Genesis 1:2-3, 5" or "Genesis 1:31, 2:1".
	 * The first item is a full reference; later comma-separated items may be a bare verse
	 * ("5"), a bare verse range ("5-7") inheriting the prior book+chapter, or
	 * "chapter:verse[-end]" inheriting the book. Returns null if any item is invalid.
	 */
	public static parseList(reference: string): BibleReference[] | null {
		const trimmed = reference.trim();
		if (!trimmed) return null;

		const items = trimmed.split(",").map((s) => s.trim().replace(/[–—]/g, "-"));
		const out: BibleReference[] = [];

		const first = BibleReference.parse(items[0]);
		if (!first) return null;
		out.push(first);

		for (let i = 1; i < items.length; i++) {
			const prev = out[out.length - 1];
			const item = items[i];

			// "chapter:verse" or "chapter:verse-end"
			const cv = /^(\d+):(\d+)(?:-(\d+))?$/.exec(item);
			if (cv) {
				out.push(new BibleReference(prev.book, parseInt(cv[1], 10), parseInt(cv[2], 10),
					cv[3] ? parseInt(cv[3], 10) : undefined));
				continue;
			}

			// bare "verse" or "verse-end" (inherit prev chapter)
			const v = /^(\d+)(?:-(\d+))?$/.exec(item);
			if (v) {
				out.push(new BibleReference(prev.book, prev.chapter, parseInt(v[1], 10),
					v[2] ? parseInt(v[2], 10) : undefined));
				continue;
			}

			return null;
		}

		return out;
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test test/BibleReference.test.ts`
Expected: PASS (existing tests still pass, new `parseList` block passes).

- [ ] **Step 5: Commit**

```bash
git add src/core/BibleReference.ts test/BibleReference.test.ts
git commit -m "feat: BibleReference.parseList for non-contiguous references"
```

---

## Task 4: `VerseFormatter` — the three output strings

**Files:**
- Create: `src/utils/VerseFormatter.ts`
- Test: `test/VerseFormatter.test.ts`

Pure string builders. Verse text for the blockquote is passed in (the DOM extraction lives in the controller, Task 8).

- [ ] **Step 1: Write the failing test**

```ts
// test/VerseFormatter.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatInlineReference, formatCodeBlock, formatBlockquote } from "../src/utils/VerseFormatter";

test("VerseFormatter", async (t) => {
	await t.test("inline reference is backtick-wrapped", () => {
		assert.equal(formatInlineReference("Genesis 1:2-3, 5"), "`Genesis 1:2-3, 5`");
	});

	await t.test("code block is a fenced bible block", () => {
		assert.equal(formatCodeBlock("Genesis 1:2-3"), "```bible\nGenesis 1:2-3\n```");
	});

	await t.test("blockquote quotes the text and cites the reference + version", () => {
		const out = formatBlockquote("John 3:16", "For God so loved the world...", "ESV");
		assert.equal(out, "> For God so loved the world...\n>\n> — John 3:16 (ESV)");
	});

	await t.test("blockquote prefixes every wrapped line with '> '", () => {
		const out = formatBlockquote("Genesis 1:1", "line one\nline two", "ESV");
		assert.equal(out, "> line one\n> line two\n>\n> — Genesis 1:1 (ESV)");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test test/VerseFormatter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/utils/VerseFormatter.ts

/** `` `Genesis 1:2-3, 5` `` — inline reference rendered by the plugin's hover preview. */
export function formatInlineReference(label: string): string {
	return `\`${label}\``;
}

/** A fenced ```bible block the plugin renders as the full passage. */
export function formatCodeBlock(label: string): string {
	return "```bible\n" + label + "\n```";
}

/**
 * A markdown blockquote of the actual verse text, ending in a "— <ref> (<version>)"
 * citation. Every line of `text` is prefixed so multi-line quotes stay inside the quote.
 */
export function formatBlockquote(label: string, text: string, version: string): string {
	const body = text
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
	return `${body}\n>\n> — ${label} (${version})`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test test/VerseFormatter.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite + build**

Run: `npm run build`
Expected: tsc clean, all tests pass, esbuild writes `main.js`.

- [ ] **Step 6: Commit**

```bash
git add src/utils/VerseFormatter.ts test/VerseFormatter.test.ts
git commit -m "feat: VerseFormatter for the three insert formats"
```

---

## Task 5: settings — new fields + reorganized tab

**Files:**
- Modify: `src/settings/DisciplesJournalSettings.ts`

Add the four verse-selection settings, then add a *Verse selection* section to the tab. The tab already groups with `new Setting(containerEl).setName(...).setHeading()`; follow that exact pattern.

- [ ] **Step 1: Extend the settings interface and defaults**

In `DisciplesJournalSettings`, add after `passageNoteFrontmatter: string;`:

```ts
	enableVerseSelection: boolean;
	defaultInsertFormat: 'inline' | 'codeblock' | 'blockquote';
	formatChooserStyle: 'split' | 'toggle' | 'submenu';
	enableAppendToNote: boolean;
```

In `DEFAULT_SETTINGS`, add after `passageNoteFrontmatter: ''`:

```ts
	enableVerseSelection: true,
	defaultInsertFormat: 'inline',
	formatChooserStyle: 'split',
	enableAppendToNote: false,
```

- [ ] **Step 2: Add the Verse selection section to the tab**

Insert this block in `display()` immediately before `new Setting(containerEl).setName('ESV API').setHeading();`:

```ts
		new Setting(containerEl).setName('Verse selection').setHeading();

		new Setting(containerEl)
			.setName('Enable verse selection')
			.setDesc('Tap verses in a rendered passage to select them and copy/insert them into notes.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableVerseSelection)
				.onChange(async (value) => {
					this.plugin.settings.enableVerseSelection = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default insert format')
			.setDesc('The format used by the main button before you pick another.')
			.addDropdown(dropdown => dropdown
				.addOption('inline', 'Inline reference')
				.addOption('codeblock', 'Bible code block')
				.addOption('blockquote', 'Blockquote with text')
				.setValue(this.plugin.settings.defaultInsertFormat)
				.onChange(async (value) => {
					this.plugin.settings.defaultInsertFormat = value as DisciplesJournalSettings['defaultInsertFormat'];
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Format chooser style')
			.setDesc('How the action bar lets you pick a format.')
			.addDropdown(dropdown => dropdown
				.addOption('split', 'Split buttons (default format + chevron)')
				.addOption('toggle', 'Format toggle + action buttons')
				.addOption('submenu', 'Action menus with format submenus')
				.setValue(this.plugin.settings.formatChooserStyle)
				.onChange(async (value) => {
					this.plugin.settings.formatChooserStyle = value as DisciplesJournalSettings['formatChooserStyle'];
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable "Append to note…"')
			.setDesc('Add an action that appends the selection to the end of a note you pick. Overlaps with Insert at cursor, so it is off by default.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAppendToNote)
				.onChange(async (value) => {
					this.plugin.settings.enableAppendToNote = value;
					await this.plugin.saveSettings();
				}));
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npx eslint .`
Expected: both clean.

- [ ] **Step 4: Manual check**

Open Obsidian → Settings → Disciples Journal. Confirm a **Verse selection** section appears with the four controls and that changes persist across a settings reopen.

- [ ] **Step 5: Commit**

```bash
git add src/settings/DisciplesJournalSettings.ts
git commit -m "feat: verse-selection settings + Verse selection settings section"
```

---

## Task 6: `VerseSelectionService` — the single current selection

**Files:**
- Create: `src/core/VerseSelectionService.ts`

A plugin-owned `Component` holding at most one active selection and its owning controller, with a simple listener set. (`Component` so it unloads cleanly via `addChild`.)

- [ ] **Step 1: Implement the service**

```ts
// src/core/VerseSelectionService.ts
import { Component } from "obsidian";
import { VerseSelection } from "./VerseSelection";

/** Anything that can own the current selection (a per-passage controller). */
export interface SelectionOwner {
	readonly id: string;
}

interface ActiveSelection {
	selection: VerseSelection;
	owner: SelectionOwner;
}

/**
 * Holds the single active verse selection across all panes/windows. Controllers
 * subscribe; only the owning controller renders highlight + action bar.
 */
export class VerseSelectionService extends Component {
	private active: ActiveSelection | null = null;
	private listeners = new Set<() => void>();

	/** Subscribe to selection changes. Returns an unsubscribe function. */
	onChange(cb: () => void): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	get(): ActiveSelection | null {
		return this.active;
	}

	/** Replace the active selection (or clear with an empty one). */
	set(selection: VerseSelection, owner: SelectionOwner): void {
		this.active = selection.isEmpty() ? null : { selection, owner };
		this.emit();
	}

	clear(): void {
		if (!this.active) return;
		this.active = null;
		this.emit();
	}

	/** Clear only if `owner` currently owns the selection (e.g. its passage re-rendered). */
	clearIfOwner(owner: SelectionOwner): void {
		if (this.active?.owner.id === owner.id) this.clear();
	}

	onunload(): void {
		this.listeners.clear();
		this.active = null;
	}

	private emit(): void {
		for (const cb of this.listeners) cb();
	}
}
```

- [ ] **Step 2: Build + lint**

Run: `npm run build && npx eslint .`
Expected: both clean (service is not wired in yet — that's Task 11).

- [ ] **Step 3: Commit**

```bash
git add src/core/VerseSelectionService.ts
git commit -m "feat: VerseSelectionService holding the single active selection"
```

---

## Task 7: `wrapPassageVerses` — make verses targetable

**Files:**
- Create: `src/components/VerseWrapper.ts`

Walk each block element under `passageEl` and wrap each verse's run of nodes (from its `verse-num`/`chapter-num` `<b>` up to the next marker) in a `<span class="dj-verse" data-chapter data-verse>`. A verse split across paragraphs yields two spans sharing the same `data-verse`.

- [ ] **Step 1: Implement the wrapper**

```ts
// src/components/VerseWrapper.ts
import { parseVerseId } from "../utils/VerseId";

/**
 * Post-process a rendered ESV passage so each verse's inline text is wrapped in a
 * `<span class="dj-verse" data-chapter data-verse>`, making verses selectable and
 * highlightable. Idempotent: skips a passage that's already wrapped.
 *
 * ESV HTML marks verses only with `<b class="verse-num|chapter-num" id="vBBCCCVVV-N">`;
 * a verse's text runs as loose nodes until the next marker, sometimes across <p>
 * boundaries — so we wrap per block element and tag spans with the verse number.
 */
export function wrapPassageVerses(passageEl: HTMLElement): void {
	if (passageEl.querySelector(".dj-verse")) return;
	const doc = passageEl.doc;

	const blocks = passageEl.querySelectorAll("p, li");
	blocks.forEach((block) => {
		let current: HTMLSpanElement | null = null;
		// Snapshot child nodes first; we re-parent them as we go.
		const nodes = Array.from(block.childNodes);
		for (const node of nodes) {
			const marker =
				node.instanceOf(HTMLElement) && (node.hasClass("verse-num") || node.hasClass("chapter-num"))
					? parseVerseId(node.id)
					: null;

			if (marker) {
				current = doc.createElement("span");
				current.addClass("dj-verse");
				current.dataset.chapter = String(marker.chapter);
				current.dataset.verse = String(marker.verse);
				block.insertBefore(current, node);
			}

			if (current) {
				current.appendChild(node); // moves node out of block into the span
			}
			// Nodes before the first marker (rare) stay where they are.
		}
	});
}
```

- [ ] **Step 2: Build + lint**

Run: `npm run build && npx eslint .`
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/VerseWrapper.ts
git commit -m "feat: wrapPassageVerses wraps each verse in a .dj-verse span"
```

---

## Task 8: `VerseSelectionController` — gestures, highlight, owns the bar

**Files:**
- Create: `src/components/VerseSelectionController.ts`

Attached per rendered passage. Wraps verses, binds gestures, reflects the service's selection by toggling `.dj-verse-selected`, and shows a `VerseActionBar` (Task 9) when it owns the selection. Uses `Component.registerDomEvent` so listeners unload with the passage.

Gestures:
- **click** a `.dj-verse` → toggle that verse; **shift+click** → range from anchor.
- **touch**: a long-press (≈400 ms) without moving starts a drag-select; `touchmove` over verses extends the range; a short tap toggles one verse. A move before the threshold cancels (lets the list scroll).

- [ ] **Step 1: Implement the controller**

```ts
// src/components/VerseSelectionController.ts
import { Component } from "obsidian";
import { VerseSelection } from "../core/VerseSelection";
import { VerseRef } from "../utils/VerseId";
import { VerseSelectionService, SelectionOwner } from "../core/VerseSelectionService";
import { VerseActionBar } from "./VerseActionBar";
import { wrapPassageVerses } from "./VerseWrapper";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";

let nextId = 0;
const LONG_PRESS_MS = 400;
const MOVE_CANCEL_PX = 10;

export class VerseSelectionController extends Component implements SelectionOwner {
	readonly id = `dj-passage-${nextId++}`;
	private selection: VerseSelection;
	private anchor: VerseRef | null = null;
	private bar: VerseActionBar | null = null;

	// touch state
	private pressTimer: number | null = null;
	private dragging = false;
	private touchStart: { x: number; y: number } | null = null;

	constructor(
		private plugin: DisciplesJournalPlugin,
		private passageEl: HTMLElement,
		private book: string,
		private service: VerseSelectionService,
	) {
		super();
		this.selection = new VerseSelection(book);
	}

	onload(): void {
		wrapPassageVerses(this.passageEl);
		this.passageEl.addClass("dj-selectable");

		this.registerDomEvent(this.passageEl, "click", (e) => this.onClick(e));
		this.registerDomEvent(this.passageEl, "touchstart", (e) => this.onTouchStart(e), { passive: true });
		this.registerDomEvent(this.passageEl, "touchmove", (e) => this.onTouchMove(e), { passive: false });
		this.registerDomEvent(this.passageEl, "touchend", () => this.onTouchEnd());

		this.register(this.service.onChange(() => this.reflect()));
	}

	onunload(): void {
		// If this passage owned the selection (e.g. note re-rendered), drop it.
		this.service.clearIfOwner(this);
		this.clearPressTimer();
	}

	private verseAt(target: EventTarget | null): { el: HTMLElement; ref: VerseRef } | null {
		if (!(target instanceof HTMLElement)) return null;
		const el = target.closest<HTMLElement>(".dj-verse");
		if (!el || !this.passageEl.contains(el)) return null;
		const chapter = Number(el.dataset.chapter);
		const verse = Number(el.dataset.verse);
		if (!chapter || !verse) return null;
		return { el, ref: { chapter, verse } };
	}

	private onClick(e: MouseEvent): void {
		const hit = this.verseAt(e.target);
		if (!hit) return;
		e.preventDefault();
		if (e.shiftKey && this.anchor) {
			this.selection.selectRange(this.anchor, hit.ref);
		} else {
			this.selection.toggle(hit.ref);
			this.anchor = hit.ref;
		}
		this.commit();
	}

	private onTouchStart(e: TouchEvent): void {
		const hit = this.verseAt(e.target);
		if (!hit) return;
		const t = e.touches[0];
		this.touchStart = { x: t.clientX, y: t.clientY };
		this.anchor = hit.ref;
		this.pressTimer = this.passageEl.win.setTimeout(() => {
			this.dragging = true; // long-press engaged: subsequent moves select, not scroll
		}, LONG_PRESS_MS);
	}

	private onTouchMove(e: TouchEvent): void {
		if (!this.touchStart) return;
		const t = e.touches[0];
		if (!this.dragging) {
			// Moved before the long-press fired → treat as a scroll, cancel selection.
			const moved = Math.hypot(t.clientX - this.touchStart.x, t.clientY - this.touchStart.y);
			if (moved > MOVE_CANCEL_PX) this.clearPressTimer();
			return;
		}
		e.preventDefault(); // we own the gesture now; stop the page scrolling
		const hit = this.verseAt(this.passageEl.doc.elementFromPoint(t.clientX, t.clientY));
		if (hit && this.anchor) {
			this.selection.selectRange(this.anchor, hit.ref);
			this.commit();
		}
	}

	private onTouchEnd(): void {
		const wasDragging = this.dragging;
		this.clearPressTimer();
		if (!wasDragging && this.anchor) {
			// short tap → toggle a single verse
			this.selection.toggle(this.anchor);
			this.commit();
		}
		this.dragging = false;
		this.touchStart = null;
	}

	private clearPressTimer(): void {
		if (this.pressTimer !== null) {
			this.passageEl.win.clearTimeout(this.pressTimer);
			this.pressTimer = null;
		}
		this.dragging = false;
	}

	/** Push our selection into the shared service (it decides ownership). */
	private commit(): void {
		this.service.set(this.selection, this);
	}

	/** Re-render highlight + bar from the service's current state. */
	private reflect(): void {
		const active = this.service.get();
		const owned = active?.owner.id === this.id ? active.selection : null;

		this.passageEl.querySelectorAll<HTMLElement>(".dj-verse").forEach((el) => {
			const ref = { chapter: Number(el.dataset.chapter), verse: Number(el.dataset.verse) };
			el.toggleClass("dj-verse-selected", !!owned && owned.has(ref));
		});

		if (owned) {
			if (!this.bar) {
				this.bar = new VerseActionBar(this.plugin, this.passageEl, () => this.clearSelection());
				this.addChild(this.bar);
			}
			this.bar.render(owned);
		} else {
			this.hideBar();
		}
	}

	clearSelection(): void {
		this.selection.clear();
		this.anchor = null;
		this.service.clearIfOwner(this);
	}

	private hideBar(): void {
		if (this.bar) {
			this.removeChild(this.bar);
			this.bar = null;
		}
	}
}
```

- [ ] **Step 2: Build (expected to fail on the missing VerseActionBar import)**

Run: `npm run build`
Expected: FAIL — `Cannot find module './VerseActionBar'`. That's expected; Task 9 adds it. Do **not** commit yet.

---

## Task 9: `VerseActionBar` — floating bar with the 3 chooser styles

**Files:**
- Create: `src/components/VerseActionBar.ts`

A `Component` that renders a small bar appended to the passage's document body, positioned under the passage. Implements Copy / Insert (and Append-to-note when enabled) via the action layer (Task 10), with `split` / `toggle` / `submenu` format-choosers driven by `settings.formatChooserStyle`.

- [ ] **Step 1: Implement the bar**

```ts
// src/components/VerseActionBar.ts
import { Component, Menu, setIcon } from "obsidian";
import { VerseSelection } from "../core/VerseSelection";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import { InsertFormat, runVerseAction, VerseActionKind } from "./VerseActions";

export class VerseActionBar extends Component {
	private root: HTMLElement | null = null;

	constructor(
		private plugin: DisciplesJournalPlugin,
		private passageEl: HTMLElement,
		private onClose: () => void,
	) {
		super();
	}

	onunload(): void {
		this.root?.remove();
		this.root = null;
	}

	render(selection: VerseSelection): void {
		const doc = this.passageEl.doc;
		this.root?.remove();
		const bar = doc.body.createDiv({ cls: "dj-verse-action-bar" });
		this.root = bar;

		bar.createSpan({ cls: "dj-verse-action-label", text: selection.label() });

		const actions: { kind: VerseActionKind; label: string }[] = [
			{ kind: "copy", label: "Copy" },
			{ kind: "insert", label: "Insert" },
		];
		if (this.plugin.settings.enableAppendToNote) {
			actions.push({ kind: "append", label: "Append to note…" });
		}

		const style = this.plugin.settings.formatChooserStyle;
		const defFormat = this.plugin.settings.defaultInsertFormat;

		if (style === "toggle") {
			let format: InsertFormat = defFormat;
			const toggle = bar.createDiv({ cls: "dj-format-toggle" });
			(["inline", "codeblock", "blockquote"] as InsertFormat[]).forEach((f) => {
				const btn = toggle.createEl("button", { text: FORMAT_LABEL[f] });
				btn.toggleClass("is-active", f === format);
				btn.onClickEvent(() => {
					format = f;
					toggle.findAll("button").forEach((b) => b.removeClass("is-active"));
					btn.addClass("is-active");
				});
			});
			for (const a of actions) {
				const btn = bar.createEl("button", { text: a.label });
				btn.onClickEvent(() => void runVerseAction(this.plugin, a.kind, selection, format));
			}
		} else if (style === "submenu") {
			for (const a of actions) {
				const btn = bar.createEl("button", { text: a.label });
				btn.onClickEvent((e) => this.openFormatMenu(e, a.kind, a.label, selection));
			}
		} else {
			// split: body = default format, chevron = other formats
			for (const a of actions) {
				const group = bar.createDiv({ cls: "dj-split-button" });
				const main = group.createEl("button", { cls: "dj-split-main", text: a.label });
				main.onClickEvent(() => void runVerseAction(this.plugin, a.kind, selection, defFormat));
				const chevron = group.createEl("button", { cls: "dj-split-chevron" });
				setIcon(chevron, "chevron-down");
				chevron.onClickEvent((e) => this.openFormatMenu(e, a.kind, a.label, selection));
			}
		}

		const close = bar.createEl("button", { cls: "dj-verse-action-close" });
		setIcon(close, "x");
		close.onClickEvent(() => this.onClose());

		this.position();
	}

	private openFormatMenu(e: MouseEvent, kind: VerseActionKind, label: string, selection: VerseSelection): void {
		const menu = new Menu();
		(["inline", "codeblock", "blockquote"] as InsertFormat[]).forEach((f) => {
			menu.addItem((item) =>
				item.setTitle(`${label}: ${FORMAT_LABEL[f]}`)
					.onClick(() => void runVerseAction(this.plugin, kind, selection, f)));
		});
		menu.showAtMouseEvent(e);
	}

	private position(): void {
		if (!this.root) return;
		const r = this.passageEl.getBoundingClientRect();
		// Anchor just below the passage; CSS handles bottom-docking on narrow layouts.
		this.root.setCssStyles({ left: `${r.left}px`, top: `${r.bottom + 4}px` });
	}
}

const FORMAT_LABEL: Record<InsertFormat, string> = {
	inline: "Ref",
	codeblock: "Block",
	blockquote: "Quote",
};
```

- [ ] **Step 2: Build (expected to fail on missing VerseActions)**

Run: `npm run build`
Expected: FAIL — `Cannot find module './VerseActions'`. Expected; Task 10 adds it. Do not commit yet.

---

## Task 10: `VerseActions` — Copy / Insert / Append behaviors

**Files:**
- Create: `src/components/VerseActions.ts`

The action layer that turns a selection + chosen format into clipboard text or note edits, including DOM verse-text extraction for the blockquote and the non-contiguous round-trip note.

- [ ] **Step 1: Implement the actions**

```ts
// src/components/VerseActions.ts
import { MarkdownView, Notice, TFile } from "obsidian";
import { VerseSelection } from "../core/VerseSelection";
import { formatBlockquote, formatCodeBlock, formatInlineReference } from "../utils/VerseFormatter";
import { InsertTargetModal } from "./InsertTargetModal";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";

export type InsertFormat = "inline" | "codeblock" | "blockquote";
export type VerseActionKind = "copy" | "insert" | "append";

/** Build the markdown payload for a selection in the chosen format. */
export function buildPayload(plugin: DisciplesJournalPlugin, selection: VerseSelection, format: InsertFormat): string {
	const label = selection.label();
	if (format === "inline") return formatInlineReference(label);
	if (format === "codeblock") return formatCodeBlock(label);
	const text = extractSelectedText(plugin, selection);
	return formatBlockquote(label, text, plugin.settings.preferredBibleVersion);
}

/**
 * Pull the visible text of the selected verses out of the rendered passage. Reads
 * the `.dj-verse` spans the wrapper created (skipping the verse-number markers).
 */
function extractSelectedText(plugin: DisciplesJournalPlugin, selection: VerseSelection): string {
	const parts: string[] = [];
	for (const { chapter, verse } of selection.verseList()) {
		const spans = plugin.app.workspace.containerEl.win.document
			.querySelectorAll<HTMLElement>(`.dj-verse[data-chapter="${chapter}"][data-verse="${verse}"]`);
		let text = "";
		spans.forEach((span) => {
			const clone = span.cloneNode(true) as HTMLElement;
			clone.querySelectorAll(".verse-num, .chapter-num, .footnote, .footnotes").forEach((n) => n.remove());
			text += clone.textContent ?? "";
		});
		const trimmed = text.replace(/\s+/g, " ").trim();
		if (trimmed) parts.push(trimmed);
	}
	return parts.join(" ");
}

export async function runVerseAction(
	plugin: DisciplesJournalPlugin,
	kind: VerseActionKind,
	selection: VerseSelection,
	format: InsertFormat,
): Promise<void> {
	const payload = buildPayload(plugin, selection, format);

	if (kind === "copy") {
		await navigator.clipboard.writeText(payload);
		new Notice(`Copied ${selection.label()}`);
		return;
	}

	if (kind === "insert") {
		const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		if (!editor) {
			new Notice("Open a note and place your cursor to insert.");
			return;
		}
		editor.replaceSelection(payload);
		return;
	}

	// append
	new InsertTargetModal(plugin.app, async (file: TFile) => {
		const existing = await plugin.app.vault.read(file);
		const sep = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
		await plugin.app.vault.modify(file, `${existing}${sep}\n${payload}\n`);
		new Notice(`Appended ${selection.label()} to ${file.basename}`);
	}).open();
}
```

- [ ] **Step 2: Build (expected to fail on missing InsertTargetModal)**

Run: `npm run build`
Expected: FAIL — `Cannot find module './InsertTargetModal'`. Expected; Task 11 adds it.

---

## Task 11: `InsertTargetModal` — note picker for Append

**Files:**
- Create: `src/components/InsertTargetModal.ts`

- [ ] **Step 1: Implement the modal**

```ts
// src/components/InsertTargetModal.ts
import { App, FuzzySuggestModal, TFile } from "obsidian";

/** Fuzzy-pick a markdown note to append the selection to. */
export class InsertTargetModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private onChoose: (file: TFile) => void | Promise<void>) {
		super(app);
		this.setPlaceholder("Append to note…");
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		void this.onChoose(file);
	}
}
```

- [ ] **Step 2: Build + lint (the controller → bar → actions → modal chain now resolves)**

Run: `npm run build && npx eslint .`
Expected: both clean, all tests pass.

- [ ] **Step 3: Commit Tasks 8–11 together (they form one compile unit)**

```bash
git add src/components/VerseSelectionController.ts src/components/VerseActionBar.ts src/components/VerseActions.ts src/components/InsertTargetModal.ts
git commit -m "feat: verse selection controller, action bar, actions, note picker"
```

---

## Task 12: render-time wiring — wrap + attach controller

**Files:**
- Modify: `src/components/BibleReferenceRenderer.ts`
- Modify: `src/core/DisciplesJournalPlugin.ts`

Pass the service into the renderer and attach a controller to each full passage.

- [ ] **Step 1: Give the renderer the service**

In `BibleReferenceRenderer`, add a field and constructor param:

```ts
	private selectionService: VerseSelectionService;
```

Update the constructor signature and body (add the new param last, assign it):

```ts
	constructor(
		bibleContentService: BibleContentService,
		bibleFiles: BibleFiles,
		plugin: DisciplesJournalPlugin,
		selectionService: VerseSelectionService
	) {
		this.bibleContentService = bibleContentService;
		this.plugin = plugin;
		this.bibleNavigation = new BibleNavigation(bibleFiles, plugin.app);
		this.selectionService = selectionService;
	}
```

Add the import at the top:

```ts
import { VerseSelectionController } from "./VerseSelectionController";
import { VerseSelectionService } from "../core/VerseSelectionService";
```

- [ ] **Step 2: Attach the controller in `processFullBiblePassage`**

Replace the tail of `processFullBiblePassage` (from `containerEl.appendChild(passageEl);`) with:

```ts
		containerEl.appendChild(passageEl);
		el.appendChild(containerEl);

		if (this.plugin.settings.enableVerseSelection) {
			const controller = new VerseSelectionController(
				this.plugin, passageEl, canonicalRef.book, this.selectionService
			);
			this.selectionService.addChild(controller); // unloads with the plugin/service
			controller.load();
		}
```

- [ ] **Step 3: Construct the service and pass it in (`DisciplesJournalPlugin.onload`)**

Add the import:

```ts
import { VerseSelectionService } from './VerseSelectionService';
```

Add a field next to the other services:

```ts
	private verseSelectionService: VerseSelectionService;
```

In `onload`, after `this.bibleContentService = ...`, construct + register the service, and pass it to the renderer:

```ts
		this.verseSelectionService = new VerseSelectionService();
		this.addChild(this.verseSelectionService);
```

And update the `new BibleReferenceRenderer(...)` call to pass `this.verseSelectionService` as the 4th argument.

- [ ] **Step 4: Build + lint**

Run: `npm run build && npx eslint .`
Expected: both clean.

- [ ] **Step 5: Manual check (the core experience)**

In the demo vault open a note containing a ```bible block (e.g. `Genesis 1`). Reading mode:
- Click verse 2, then verse 5 → both get the highlight, a bar appears showing `Genesis 1:2, 5`.
- Shift+click verse 8 → range fills (`Genesis 1:2-8`? depends on anchor) — confirm range fills within the chapter.
- Click the bar's ✕ → highlight + bar clear.
- Switch the note away and back → no stale bar.

- [ ] **Step 6: Commit**

```bash
git add src/components/BibleReferenceRenderer.ts src/core/DisciplesJournalPlugin.ts
git commit -m "feat: wrap verses and attach selection controller on passage render"
```

---

## Task 13: styles for verses + action bar

**Files:**
- Modify: `src/components/BibleStyles.ts`

Add CSS for `.dj-verse` (hover affordance), `.dj-verse-selected` (the highlight), and the action bar / split buttons / format toggle. Find where `BibleStyles` builds its CSS string (per-document `applyStyles`) and append these rules to that string so they ship per-Document like the rest.

- [ ] **Step 1: Add the rules**

Append to the CSS that `BibleStyles.applyStyles` injects:

```css
.dj-selectable .dj-verse { cursor: pointer; border-radius: 3px; }
.dj-selectable .dj-verse:hover { background: var(--background-modifier-hover); }
.dj-verse-selected, .dj-selectable .dj-verse-selected:hover {
	background: var(--text-selection);
	box-shadow: 0 0 0 1px var(--text-accent) inset;
}

.dj-verse-action-bar {
	position: fixed; z-index: var(--layer-popover);
	display: flex; align-items: center; gap: 6px;
	padding: 6px 8px; border-radius: 8px;
	background: var(--background-secondary); box-shadow: 0 2px 12px rgba(0,0,0,0.25);
}
.dj-verse-action-label { font-weight: 600; margin-right: 4px; }
.dj-verse-action-bar button { cursor: pointer; }
.dj-split-button { display: inline-flex; }
.dj-split-button .dj-split-main { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.dj-split-button .dj-split-chevron { border-top-left-radius: 0; border-bottom-left-radius: 0; padding: 0 4px; }
.dj-format-toggle { display: inline-flex; gap: 2px; margin-right: 4px; }
.dj-format-toggle button.is-active { background: var(--interactive-accent); color: var(--text-on-accent); }

@media (max-width: 600px) {
	.dj-verse-action-bar {
		left: 8px !important; right: 8px;
		top: auto !important; bottom: 12px;
		justify-content: center; flex-wrap: wrap;
	}
}
```

- [ ] **Step 2: Build + lint, then manual check**

Run: `npm run build && npx eslint .` (both clean). In Obsidian, confirm selected verses are clearly highlighted, hover shows an affordance, and the bar is legible in both light and dark themes.

- [ ] **Step 3: Commit**

```bash
git add src/components/BibleStyles.ts
git commit -m "feat: styles for verse highlight and action bar"
```

---

## Task 14: commands + editor right-click "Insert here"

**Files:**
- Modify: `src/core/DisciplesJournalPlugin.ts`

Add three commands and the in-editor context-menu entry, all driving the shared selection through the action layer.

- [ ] **Step 1: Add imports**

At the top of `src/core/DisciplesJournalPlugin.ts`, add:

```ts
import { buildPayload, runVerseAction } from '../components/VerseActions';
```

`Editor`, `Menu`, and `MenuItem` are used only as parameter types below; import the ones not already present from `'obsidian'` (merge into the existing `from 'obsidian'` import — the file already imports `Plugin, MarkdownView, Notice, normalizePath`):

```ts
import { Plugin, MarkdownView, Notice, normalizePath, Editor, Menu, MenuItem } from 'obsidian';
```

- [ ] **Step 2: Register commands in `onload` (after the existing `addCommand` calls)**

```ts
		this.addCommand({
			id: 'insert-selected-verses',
			name: 'Insert selected verses at cursor',
			editorCallback: (editor: Editor) => {
				const active = this.verseSelectionService.get();
				if (!active) { new Notice('No verses selected.'); return; }
				editor.replaceSelection(
					buildPayload(this, active.selection, this.settings.defaultInsertFormat)
				);
			}
		});

		this.addCommand({
			id: 'copy-selected-verses',
			name: 'Copy selected verses',
			callback: () => {
				const active = this.verseSelectionService.get();
				if (!active) { new Notice('No verses selected.'); return; }
				void runVerseAction(this, 'copy', active.selection, this.settings.defaultInsertFormat);
			}
		});

		this.addCommand({
			id: 'clear-verse-selection',
			name: 'Clear verse selection',
			callback: () => this.verseSelectionService.clear()
		});
```

- [ ] **Step 3: Register the editor context-menu entry in `onload`**

```ts
		this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
			const active = this.verseSelectionService.get();
			if (!active) return;
			const label = active.selection.label();
			menu.addItem((item: MenuItem) =>
				item.setTitle(`Insert ${label} here`)
					.setIcon('book-open')
					.onClick(() => editor.replaceSelection(
						buildPayload(this, active.selection, this.settings.defaultInsertFormat)
					)));
		}));
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npx eslint .`
Expected: both clean.

- [ ] **Step 5: Manual check**

- Select verses in one note. Open a second note, place the cursor mid-sentence, right-click → **Insert Genesis 1:2, 5 here** → inline ref inserted at the cursor; confirm it renders with a hover preview.
- Run the **Copy selected verses** and **Clear verse selection** commands from the palette; confirm clipboard + clear behavior.

- [ ] **Step 6: Commit**

```bash
git add src/core/DisciplesJournalPlugin.ts
git commit -m "feat: commands and editor 'Insert here' for verse selection"
```

---

## Task 15: non-contiguous round-trip rendering (comma lists)

**Files:**
- Modify: `src/services/BibleContentService.ts`
- Modify: `src/components/BibleReferenceRenderer.ts`

So an inserted `` `Genesis 1:2-3, 5` `` (inline) or a `bible` block of it actually renders. Resolve each run via the existing `getBibleContent`, then concatenate the HTML.

- [ ] **Step 1: Add a list resolver to the content service**

Add to `BibleContentService` (uses the existing single-ref `getBibleContent` and `BibleReference.parseList`):

```ts
	/**
	 * Resolve a possibly non-contiguous reference string ("Genesis 1:2-3, 5") by parsing
	 * it into runs and resolving each. Returns one BiblePassage whose HTML is the runs'
	 * HTML concatenated and whose reference is the first run (used for the heading/link).
	 * Falls back to single-ref resolution when the string isn't a list.
	 */
	public async getBibleContentList(referenceText: string): Promise<BibleApiResponse> {
		const runs = BibleReference.parseList(referenceText);
		if (!runs || runs.length === 0) {
			const single = BibleReference.parse(referenceText);
			if (!single) return BibleApiResponse.error(`Invalid reference: ${referenceText}`, ErrorType.BadApiResponse);
			return this.getBibleContent(single);
		}
		if (runs.length === 1) return this.getBibleContent(runs[0]);

		let html = "";
		for (const run of runs) {
			const res = await this.getBibleContent(run);
			if (res.isError()) return res;
			html += res.passage.html;
		}
		return BibleApiResponse.success(new BiblePassage(runs[0], html));
	}
```

Add imports as needed at the top of the file: `BiblePassage` is already imported; ensure `BibleApiResponse, ErrorType` are imported (they are).

- [ ] **Step 2: Use the list resolver for full passages**

In `processFullBiblePassage`, replace:

```ts
		const parsedRef = BibleReference.parse(reference);
		if (!parsedRef) { /* existing error path */ }
		const response = await this.bibleContentService.getBibleContent(parsedRef);
```

with a list-aware resolve (keep the existing error container for the invalid case):

```ts
		if (!BibleReference.parseList(reference) && !BibleReference.parse(reference)) {
			const message = `Invalid bible reference: ${source}`;
			console.error(message);
			const errorContainer = el.createEl('div');
			errorContainer.classList.add('bible-reference-error');
			errorContainer.textContent = message;
			return;
		}
		const response = await this.bibleContentService.getBibleContentList(reference);
```

Keep the rest (`canonicalRef = response.passage.reference`, heading, nav, wrap, controller) unchanged. The heading/link will use the first run — acceptable for v1; note it in `docs/reference-formats.md`.

- [ ] **Step 3: Build + lint**

Run: `npm run build && npx eslint .`
Expected: both clean.

- [ ] **Step 4: Manual check**

- Insert a non-contiguous selection as a **code block** into a note → it renders the selected verses.
- Insert it as an **inline reference** → hovering shows a preview (the inline path resolves via the existing inline processor; if the inline hover can't resolve a list, that's acceptable for v1 — verify and note it).

- [ ] **Step 5: Commit**

```bash
git add src/services/BibleContentService.ts src/components/BibleReferenceRenderer.ts
git commit -m "feat: render non-contiguous (comma-list) references"
```

---

## Task 16: docs, ethos, changelog

**Files:**
- Modify: `CLAUDE.md`, `ARCHITECTURE.md`, `docs/reference-formats.md`, `docs/gotchas.md`, `docs/esv-api.md`, `CHANGELOG.md`

- [ ] **Step 1: CLAUDE.md — add the Design ethos section**

Add after the `## What this is` section:

```markdown
## Design ethos

**Non-intrusive by default.** People use this plugin during devotion, prayer, and small
group. Features must never distract, frustrate, or shake the user out of an intimate time
with God. Default to quiet: nothing new appears, moves, or interrupts until the user
deliberately asks for it. No text shifting, no surprise popups, no persistent chrome. When
in doubt, do less.
```

- [ ] **Step 2: ARCHITECTURE.md — add the new modules + a verse-selection note**

Under `components/` and `core/` in the module map, add bullets for `VerseSelectionService`,
`VerseSelection`, `VerseSelectionController`, `VerseActionBar`, `VerseActions`,
`VerseWrapper`, `InsertTargetModal`, `VerseId`, `VerseFormatter`. Add a short
"Verse selection" subsection: passages are wrapped into `.dj-verse` spans; a single
plugin-owned `VerseSelectionService` holds the active selection; controllers reflect it and
own the action bar.

- [ ] **Step 3: docs/reference-formats.md — document comma lists**

Add a section: non-contiguous references like `Genesis 1:2-3, 5` and `Genesis 1:31, 2:1`
are produced by verse selection and parsed by `BibleReference.parseList`. Items after the
first may be a bare verse, a bare verse range, or `chapter:verse`. A rendered list's heading
uses the first run.

- [ ] **Step 4: docs/gotchas.md — capture the cross-cutting bits**

Add entries: (a) verse wrapping relies on ESV `verse-num`/`chapter-num` ids and is
idempotent; (b) mobile selection uses a long-press threshold so normal swipes still scroll;
(c) the action bar is appended per-`Document` (popout-safe) and positioned `fixed`;
(d) selection clears when its passage controller unloads (note re-render).

- [ ] **Step 5: docs/esv-api.md — attribution note**

Add: the blockquote format reproduces ESV text and appends `(ESV)`; per ESV API terms,
reproduced text requires attribution. Link to the ESV API copyright/permissions terms.

- [ ] **Step 6: CHANGELOG.md — add an Unreleased bullet**

```markdown
## Unreleased

- Select verses in a rendered passage (tap to toggle, shift-click / long-press-drag for a
  range) and copy or insert them as an inline reference, a `bible` code block, or a
  blockquote of the text. Optional "Append to note…". New Verse selection settings section.
```

(If there's no `## Unreleased` heading yet, add it above the latest version.)

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md ARCHITECTURE.md docs/ CHANGELOG.md
git commit -m "docs: design ethos, verse selection architecture, reference formats, changelog"
```

---

## Task 17: full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Green build + lint**

Run: `npm run build && npx eslint .`
Expected: tsc clean, all unit tests pass, esbuild succeeds, zero eslint warnings.

- [ ] **Step 2: Manual matrix in the demo vault**

Confirm each, in reading mode on a `Genesis 1` passage:
- Tap v2 + v5 → highlight + bar `Genesis 1:2, 5`. Shift+click extends within the chapter. ✕ / `Esc`-via-clear-command clears.
- For Copy and Insert × each format (`split` default, then switch `formatChooserStyle` to `toggle` and `submenu` in settings and re-verify each): correct payload (paste-check for Copy; cursor insert for Insert).
- Enable **Append to note…** → the action appears; picking a note appends the payload to its end.
- Right-click in another note → **Insert `<label>` here** inserts at the cursor.
- Inserted inline ref and `bible` block render (including the non-contiguous case).
- Pop the passage out into its own window → selection, highlight, and bar work in the popout.
- Mobile emulation (or device): a quick swipe scrolls; a long-press then drag selects a range.

- [ ] **Step 3: Final commit (if any manual-fix tweaks were needed)**

```bash
git add -A
git commit -m "fix: verse selection polish from manual verification"
```

---

## Self-review notes (addressed)

- **Spec coverage:** selection model (T7,T8), shift/long-press gestures (T8), three surfaces — bar (T9), passage menu via bar's submenu + the bar itself, editor "Insert here" (T14); three formats (T4,T10); configurable chooser (T9,T5); optional Append (T5,T9,T10,T11); non-contiguous model (T2,T3) + round-trip (T15); ethos + docs (T16); settings reorg (T5). 
- **Passage right-click menu:** the spec lists a desktop right-click *on the passage*. The bar already exposes every action with format choice; a passage `contextmenu` handler is a thin extra. If desired, add a `registerDomEvent(passageEl, 'contextmenu', …)` in the controller mirroring the bar's actions — deferred as low-value duplication unless requested.
- **Types are consistent:** `VerseRef` (from `VerseId.ts`) is reused everywhere; `InsertFormat`/`VerseActionKind` defined once in `VerseActions.ts` and imported by the bar; `buildPayload`/`runVerseAction` signatures match across the bar, commands, and editor menu.
