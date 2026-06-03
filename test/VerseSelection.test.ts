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
