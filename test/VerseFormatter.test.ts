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
