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
