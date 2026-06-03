import { Component, Menu, setIcon } from "obsidian";
import { VerseSelection } from "../core/VerseSelection";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import { InsertFormat, runVerseAction, VerseActionKind } from "./VerseActions";

const FORMAT_LABEL: Record<InsertFormat, string> = {
	inline: "Ref",
	codeblock: "Block",
	blockquote: "Quote",
};

const FORMATS: InsertFormat[] = ["inline", "codeblock", "blockquote"];

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
			for (const f of FORMATS) {
				const btn = toggle.createEl("button", { text: FORMAT_LABEL[f] });
				btn.toggleClass("is-active", f === format);
				btn.onClickEvent(() => {
					format = f;
					toggle.findAll("button").forEach((b) => b.removeClass("is-active"));
					btn.addClass("is-active");
				});
			}
			for (const a of actions) {
				const btn = bar.createEl("button", { text: a.label });
				btn.onClickEvent(() => void runVerseAction(this.plugin, a.kind, selection, format, this.passageEl));
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
				main.onClickEvent(() => void runVerseAction(this.plugin, a.kind, selection, defFormat, this.passageEl));
				const chevron = group.createEl("button", {
					cls: "dj-split-chevron",
					attr: { "aria-label": `${a.label}: choose format` },
				});
				setIcon(chevron, "chevron-down");
				chevron.onClickEvent((e) => this.openFormatMenu(e, a.kind, a.label, selection));
			}
		}

		const close = bar.createEl("button", {
			cls: "dj-verse-action-close",
			attr: { "aria-label": "Clear verse selection" },
		});
		setIcon(close, "x");
		close.onClickEvent(() => this.onClose());

		this.position();
	}

	private openFormatMenu(e: MouseEvent, kind: VerseActionKind, label: string, selection: VerseSelection): void {
		const menu = new Menu();
		for (const f of FORMATS) {
			menu.addItem((item) =>
				item.setTitle(`${label}: ${FORMAT_LABEL[f]}`)
					.onClick(() => void runVerseAction(this.plugin, kind, selection, f, this.passageEl)));
		}
		menu.showAtMouseEvent(e);
	}

	private position(): void {
		if (!this.root) return;
		const r = this.passageEl.getBoundingClientRect();
		// Anchor just below the passage; CSS bottom-docks it on narrow layouts.
		this.root.setCssStyles({ left: `${r.left}px`, top: `${r.bottom + 4}px` });
	}
}
