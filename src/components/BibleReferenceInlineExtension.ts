import { ViewUpdate, EditorView, ViewPlugin, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { BibleReference } from "src/core/BibleReference";
import { BibleEventHandlers } from "src/core/BibleEventHandlers";
import { BibleReferenceRenderer } from "./BibleReferenceRenderer";
import { Notice } from "obsidian";

// Plugin/Extension to handle live-preview rendering of Inline Admonitions.
// Reference: https://github.com/liamcain/obsidian-lapel/blob/main/src/headingWidget.ts
export function createInlineReferenceExtension(renderer: BibleReferenceRenderer) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();

				for (const { from, to } of view.visibleRanges) {
					syntaxTree(view.state).iterate({
						from,
						to,
						enter: (node) => {
							if (node.type.name.contains("inline-code")) {
								const content = view.state.doc.sliceString(node.from, node.to);
								// Try to parse as a Bible reference
								try {
									const reference = BibleReference.parse(content);
									if (reference) {
										const decor = Decoration.mark({
											inclusive: true,
											attributes: { class: "bible-reference" }
										});
										builder.add(node.from, node.to, decor);
									}
								} catch (error) {
									console.error(`Error parsing Bible reference in editor: ${content}`, error);
								}
								return false;
							}
						},
					});
				}

				return builder.finish();
			}
		},
		{
			decorations: v => v.decorations,
			eventHandlers: {
				mouseover: async (e, view) => {
					const t = e.target as HTMLElement;
					if (t.classList.contains("bible-reference")) {
						if (!t.textContent) {
							new Notice("No text content found for Bible reference", 10000);
							return;
						}
						const reference = BibleReference.parse(t.textContent);
						if (!reference) {
							new Notice("Invalid Bible reference: " + t.textContent, 10000);
							return;
						}
						
						this.bibleContentService.getBibleContent(reference).then(response:  => {
							if (response.isError()) {
								new Notice(response.errorMessage, 10000);
								return;
							}
							new BibleEventHandlers(renderer).handleBibleReferenceHover(e, response.passage);
						});
					}
				},
				mouseout: (e, view) => {
					const t = e.target as HTMLElement;
					if (t.classList.contains("bible-reference")) {
						new BibleEventHandlers(renderer).handleBibleReferenceMouseOut(e);
					}
				}
			}
		}
	);
}
