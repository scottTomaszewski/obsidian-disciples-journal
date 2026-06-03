import { test } from "node:test";
import assert from "node:assert/strict";
import { BookNames } from "../src/services/BookNames";
import { BibleReference } from "../src/core/BibleReference";

/**
 * Tests for BookNames.normalize — book-name standardization.
 * Every canonical name and registered abbreviation must resolve; anything else
 * must return null (no greedy prefix matching). See docs/reference-formats.md.
 */

test("normalize — canonical names", async (t) => {
	await t.test("exact canonical name", () => assert.equal(BookNames.normalize("Genesis"), "Genesis"));
	await t.test("case-insensitive", () => assert.equal(BookNames.normalize("genesis"), "Genesis"));
	await t.test("surrounding whitespace", () => assert.equal(BookNames.normalize("  John  "), "John"));
	await t.test("multi-word", () => assert.equal(BookNames.normalize("Song of Solomon"), "Song of Solomon"));
	await t.test("numbered", () => assert.equal(BookNames.normalize("1 Corinthians"), "1 Corinthians"));
});

test("normalize — registered abbreviations", async (t) => {
	await t.test("Gen", () => assert.equal(BookNames.normalize("Gen"), "Genesis"));
	await t.test("Jn", () => assert.equal(BookNames.normalize("Jn"), "John"));
	await t.test("Ho", () => assert.equal(BookNames.normalize("Ho"), "Hosea"));
	await t.test("1 Cor", () => assert.equal(BookNames.normalize("1 Cor"), "1 Corinthians"));
	await t.test("Song", () => assert.equal(BookNames.normalize("Song"), "Song of Solomon"));
});

test("normalize — rejects unknown names without greedy prefix matching", async (t) => {
	await t.test("empty", () => assert.equal(BookNames.normalize(""), null));
	await t.test("whitespace only", () => assert.equal(BookNames.normalize("   "), null));
	// Regression: "Hobbiton" starts with the "ho" (Hosea) abbreviation but is not a
	// book; greedy startsWith matching used to resolve it to "Hosea". See FOLLOWUPS.md.
	await t.test("word starting with an abbreviation", () => assert.equal(BookNames.normalize("Hobbiton"), null));
	await t.test("canonical name with extra suffix", () => assert.equal(BookNames.normalize("Genesistein"), null));
	await t.test("unrelated word", () => assert.equal(BookNames.normalize("Xylophone"), null));
});

test("parse rejects a reference whose book is a greedy prefix match", () => {
	// "Hobbiton 1:1" must not resolve to a Hosea reference.
	assert.equal(BibleReference.parse("Hobbiton 1:1"), null);
});
