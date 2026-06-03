import { test } from "node:test";
import assert from "node:assert/strict";
import { BibleReference } from "../src/core/BibleReference";

/**
 * Tests for BibleReference — the pure, pattern-heavy parsing/value-object logic.
 * Format matrix mirrors docs/reference-formats.md.
 */

test("parse — format matrix", async (t) => {
	await t.test("whole chapter", () => {
		const ref = BibleReference.parse("Genesis 1");
		assert.ok(ref);
		assert.equal(ref.book, "Genesis");
		assert.equal(ref.chapter, 1);
		assert.equal(ref.verse, undefined);
		assert.equal(ref.endVerse, undefined);
		assert.equal(ref.endChapter, undefined);
	});

	await t.test("chapter range", () => {
		const ref = BibleReference.parse("Genesis 1-2");
		assert.ok(ref);
		assert.equal(ref.chapter, 1);
		assert.equal(ref.verse, undefined);
		assert.equal(ref.endChapter, 2);
		assert.equal(ref.endVerse, undefined);
	});

	await t.test("single verse", () => {
		const ref = BibleReference.parse("John 3:16");
		assert.ok(ref);
		assert.equal(ref.book, "John");
		assert.equal(ref.chapter, 3);
		assert.equal(ref.verse, 16);
		assert.equal(ref.endVerse, undefined);
		assert.equal(ref.endChapter, undefined);
	});

	await t.test("verse range in one chapter", () => {
		const ref = BibleReference.parse("Genesis 1:1-10");
		assert.ok(ref);
		assert.equal(ref.chapter, 1);
		assert.equal(ref.verse, 1);
		assert.equal(ref.endVerse, 10);
		assert.equal(ref.endChapter, undefined);
	});

	await t.test("cross-chapter range", () => {
		const ref = BibleReference.parse("Philippians 1:27-2:11");
		assert.ok(ref);
		assert.equal(ref.chapter, 1);
		assert.equal(ref.verse, 27);
		assert.equal(ref.endChapter, 2);
		assert.equal(ref.endVerse, 11);
	});
});

test("parse — book name variants", async (t) => {
	await t.test("numbered book", () => {
		const ref = BibleReference.parse("1 Corinthians 13:4-7");
		assert.ok(ref);
		assert.equal(ref.book, "1 Corinthians");
		assert.equal(ref.chapter, 13);
		assert.equal(ref.verse, 4);
		assert.equal(ref.endVerse, 7);
	});

	await t.test("multi-word book", () => {
		const ref = BibleReference.parse("Song of Solomon 2:1");
		assert.ok(ref);
		assert.equal(ref.book, "Song of Solomon");
		assert.equal(ref.chapter, 2);
		assert.equal(ref.verse, 1);
	});

	await t.test("abbreviations normalize to canonical book", () => {
		assert.equal(BibleReference.parse("Gen 1:1")?.book, "Genesis");
		assert.equal(BibleReference.parse("Jn 3:16")?.book, "John");
		assert.equal(BibleReference.parse("1 Cor 13")?.book, "1 Corinthians");
	});

	await t.test("case-insensitive book name", () => {
		const ref = BibleReference.parse("genesis 1:1");
		assert.ok(ref);
		assert.equal(ref.book, "Genesis");
	});
});

test("parse — normalization", async (t) => {
	await t.test("en-dash is treated as a hyphen range", () => {
		// U+2013 EN DASH, as commonly pasted from other sources.
		const ref = BibleReference.parse("Genesis 1:1–10");
		assert.ok(ref);
		assert.equal(ref.chapter, 1);
		assert.equal(ref.verse, 1);
		assert.equal(ref.endVerse, 10);
	});

	await t.test("surrounding whitespace is trimmed", () => {
		const ref = BibleReference.parse("   John 3:16   ");
		assert.ok(ref);
		assert.equal(ref.book, "John");
		assert.equal(ref.chapter, 3);
		assert.equal(ref.verse, 16);
	});
});

test("parse — null cases", async (t) => {
	await t.test("empty string", () => assert.equal(BibleReference.parse(""), null));
	await t.test("whitespace only", () => assert.equal(BibleReference.parse("   "), null));
	// "Xylophone" shares no prefix with any registered book/abbreviation. (Note:
	// BookNames.normalize partial-matches greedily, so e.g. "Hobbiton" -> "Hosea"
	// via the "ho" abbreviation; see FOLLOWUPS.md.)
	await t.test("unknown book", () => assert.equal(BibleReference.parse("Xylophone 1:1"), null));
	await t.test("book with no chapter", () => assert.equal(BibleReference.parse("John"), null));
	await t.test("trailing garbage", () => assert.equal(BibleReference.parse("John 3:16 foo"), null));
});

test("round-trip — parse(s).toString() === s", () => {
	const canonical = [
		"Genesis 1",
		"Genesis 1-2",
		"John 3:16",
		"Genesis 1:1-10",
		"Philippians 1:27-2:11",
		"1 Corinthians 13:4-7",
		"Song of Solomon 2:1",
	];
	for (const s of canonical) {
		assert.equal(BibleReference.parse(s)?.toString(), s, `round-trip failed for "${s}"`);
	}
});

test("value-object helpers", async (t) => {
	await t.test("isChapterReference", () => {
		assert.equal(BibleReference.parse("Genesis 1")?.isChapterReference(), true);
		assert.equal(BibleReference.parse("Genesis 1-2")?.isChapterReference(), true);
		assert.equal(BibleReference.parse("John 3:16")?.isChapterReference(), false);
	});

	await t.test("isRange", () => {
		assert.equal(BibleReference.parse("John 3:16")?.isRange(), false);
		assert.equal(BibleReference.parse("Genesis 1")?.isRange(), false);
		assert.equal(BibleReference.parse("Genesis 1:1-10")?.isRange(), true);
		assert.equal(BibleReference.parse("Genesis 1-2")?.isRange(), true);
		assert.equal(BibleReference.parse("Philippians 1:27-2:11")?.isRange(), true);
	});

	await t.test("equals", () => {
		const a = BibleReference.parse("John 3:16");
		const b = BibleReference.parse("Jn 3:16");
		const c = BibleReference.parse("John 3:17");
		assert.ok(a && b && c);
		assert.equal(a.equals(b), true);
		assert.equal(a.equals(c), false);
	});

	await t.test("clone is an independent copy", () => {
		const ref = BibleReference.parse("Genesis 1:1-10");
		assert.ok(ref);
		const copy = ref.clone();
		assert.equal(ref.equals(copy), true);
		copy.chapter = 99;
		assert.equal(ref.chapter, 1);
	});

	await t.test("getChapterReference drops verse info", () => {
		const ref = BibleReference.parse("John 3:16");
		assert.ok(ref);
		const chapterRef = ref.getChapterReference();
		assert.equal(chapterRef.book, "John");
		assert.equal(chapterRef.chapter, 3);
		assert.equal(chapterRef.verse, undefined);
		assert.equal(chapterRef.isChapterReference(), true);
	});
});

test("constructor throws on an unnormalizable book name", () => {
	assert.throws(() => new BibleReference("Xylophone", 1), /Illegal book name/);
});
