import { Notice, TFile } from "obsidian";
import { VerseSelection } from "../core/VerseSelection";
import { formatBlockquote, formatCodeBlock, formatInlineReference } from "../utils/VerseFormatter";
import { InsertTargetModal } from "./InsertTargetModal";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";

export type InsertFormat = "inline" | "codeblock" | "blockquote";
export type VerseActionKind = "copy" | "insert" | "append";

/**
 * Build the markdown payload for a selection in the chosen format. `sourceEl` is the
 * rendered passage the selection came from — only the blockquote format reads it (to
 * pull the visible verse text in its own document, which keeps popout windows correct).
 */
export function buildPayload(
	plugin: DisciplesJournalPlugin,
	selection: VerseSelection,
	format: InsertFormat,
	sourceEl: HTMLElement,
): string {
	const label = selection.label();
	if (format === "inline") return formatInlineReference(label);
	if (format === "codeblock") return formatCodeBlock(label);
	const text = extractSelectedText(selection, sourceEl);
	return formatBlockquote(label, text, plugin.settings.preferredBibleVersion);
}

/**
 * Pull the visible text of the selected verses out of the rendered passage, reading
 * the `.dj-verse` spans the wrapper created (skipping verse-number markers/footnotes).
 */
function extractSelectedText(selection: VerseSelection, sourceEl: HTMLElement): string {
	const parts: string[] = [];
	for (const { chapter, verse } of selection.verseList()) {
		const spans = sourceEl.querySelectorAll<HTMLElement>(
			`.dj-verse[data-chapter="${chapter}"][data-verse="${verse}"]`,
		);
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
	sourceEl: HTMLElement,
): Promise<void> {
	const payload = buildPayload(plugin, selection, format, sourceEl);

	if (kind === "copy") {
		await navigator.clipboard.writeText(payload);
		new Notice(`Copied ${selection.label()}`);
		return;
	}

	if (kind === "insert") {
		const view = plugin.resolveInsertTarget();
		if (!view) {
			new Notice("No note to insert into — open a note (not a generated Bible note), or right-click where you want it.");
			return;
		}
		view.editor.replaceSelection(payload);
		new Notice(`Passage ${selection.label()} inserted into note ${view.file?.basename ?? "note"}`);
		return;
	}

	// append: pick a note and add to its end (background edit → Vault.process)
	new InsertTargetModal(plugin.app, async (file: TFile) => {
		await plugin.app.vault.process(file, (data) => {
			const sep = data.length === 0 || data.endsWith("\n") ? "" : "\n";
			return `${data}${sep}\n${payload}\n`;
		});
		new Notice(`Appended ${selection.label()} to ${file.basename}`);
	}).open();
}
