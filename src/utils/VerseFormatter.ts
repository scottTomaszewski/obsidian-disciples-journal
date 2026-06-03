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
