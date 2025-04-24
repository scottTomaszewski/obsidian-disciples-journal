import {MarkdownPostProcessorContext, Notice} from "obsidian";
import {BibleContentService} from "../services/BibleContentService";
import {BibleNavigation} from "./BibleNavigation";
import DisciplesJournalPlugin from "src/core/DisciplesJournalPlugin";
import {BibleReferenceParser} from '../core/BibleReferenceParser';
import {BibleEventHandlers} from "src/core/BibleEventHandlers";
import {NoteCreationService} from "../services/NoteCreationService";

/**
 * Interface for Bible passage content
 */
export interface BiblePassage {
	reference: string;
	verses: any[];
	htmlContent?: string;
	missingToken?: boolean;
}

/**
 * Interface for plugin settings
 */
export interface PluginSettings {
	displayInlineVerses: boolean;
	displayFullPassages: boolean;
	bibleTextFontSize: string;
	stylePreset: string;
}

/**
 * Component for rendering Bible references in Obsidian
 */
export class BibleReferenceRenderer {
	private bibleContentService: BibleContentService;
	private bibleNavigation: BibleNavigation;
	private plugin: DisciplesJournalPlugin;
	private parser: BibleReferenceParser;

	constructor(
		bibleContentService: BibleContentService,
		noteCreationService: NoteCreationService,
		plugin: DisciplesJournalPlugin
	) {
		this.bibleContentService = bibleContentService;
		this.plugin = plugin;
		this.bibleNavigation = new BibleNavigation(noteCreationService);
		this.parser = new BibleReferenceParser();
	}

	/**
	 * Process inline code blocks for Bible references
	 */
	public async processInlineCodeBlocks(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
		const codeBlocks = element.querySelectorAll('code');

		for (let i = 0; i < codeBlocks.length; i++) {
			const codeBlock = codeBlocks[i];
			// Skip if the code block is not a direct child (might be inside a pre tag)
			if (codeBlock.parentElement?.tagName === 'PRE') {
				continue;
			}

			const codeText = codeBlock.textContent?.trim();
			if (!codeText) {
				continue;
			}

			try {
				// Try to parse as Bible reference
				const reference = await this.bibleContentService.getBibleContent(codeText);

				if (!reference) {
					continue;
				}

				// Create a Bible reference element
				const referenceEl = element.doc.createElement('span');
				referenceEl.classList.add('bible-reference');
				referenceEl.textContent = codeText;

				referenceEl.addEventListener('mouseover', (e) => {
					new BibleEventHandlers(this).handleBibleReferenceHover(e);
				});
				referenceEl.addEventListener('mouseout', (e) => {
					new BibleEventHandlers(this).handleBibleReferenceMouseOut(e);
				});

				// Replace the code block with our reference element
				codeBlock.parentElement?.replaceChild(referenceEl, codeBlock);
			} catch (error) {
				console.error(`Error processing Bible reference: ${codeText}`, error);
			}
		}
	}

	/**
	 * Process full Bible passage code blocks
	 */
	public async processFullBiblePassage(source: string, el: HTMLElement): Promise<void> {
		const reference = source.trim();
		// TODO - this should be overlaoded with a form that takes the BibleReference
		const passage = await this.bibleContentService.getBibleContent(reference);

		if (passage) {
			const containerEl = el.doc.createElement('div');
			containerEl.classList.add('bible-passage-container');

			const parsedRef = this.parser.parse(reference);
			// TODO - this cant happen if getBibleContent passed...
			if (!parsedRef) {
				console.error("Failed to parse reference: " + reference);
				return;
			}
			if (parsedRef.isChapterReference() || this.plugin.settings.showNavigationForVerses) {
				this.bibleNavigation.createNavigationElements(containerEl, parsedRef);
			}

			// Add reference heading
			const headingEl = el.doc.createElement('h3');
			headingEl.classList.add('bible-passage-heading');
			const referenceLink = headingEl.createEl('a', {text: passage.reference});
			referenceLink.onClickEvent(async () => {
				await this.bibleNavigation.navigateToChapter(parsedRef.book, parsedRef.chapter);
			});

			containerEl.appendChild(headingEl);

			// Add verses
			const passageEl = el.doc.createElement('div');
			passageEl.classList.add('bible-passage-text');

			// Check if we have HTML content
			if (passage.htmlContent) {
				// Use the HTML content directly
				passageEl.innerHTML = passage.htmlContent;
			} else {
				// Fallback to traditional verse rendering
				for (const verse of passage.verses) {
					const verseEl = el.doc.createElement('p');
					verseEl.classList.add('bible-verse');

					const verseNumEl = el.doc.createElement('span');
					verseNumEl.classList.add('bible-verse-number');
					verseNumEl.textContent = `${verse.verse} `;

					const verseTextEl = el.doc.createElement('span');
					verseTextEl.classList.add('bible-verse-text');
					verseTextEl.textContent = verse.text;

					verseEl.appendChild(verseNumEl);
					verseEl.appendChild(verseTextEl);
					passageEl.appendChild(verseEl);
				}
			}

			containerEl.appendChild(passageEl);

			el.appendChild(containerEl);
		} else {
			// If reference not found, show error
			const errorEl = el.doc.createElement('div');
			errorEl.classList.add('bible-reference-error');
			errorEl.textContent = `Bible reference "${reference}" not found.`;
			el.appendChild(errorEl);
		}
	}

	/**
	 * Show a verse preview in a hover popup
	 */
	public async showVersePreview(element: HTMLElement, referenceText: string, event: MouseEvent): Promise<HTMLElement | null> {
		const passage = await this.bibleContentService.getBibleContent(referenceText);
		if (!passage) return null;

		// Create verse preview element
		const versePreviewEl = element.doc.createElement('div');
		versePreviewEl.classList.add('bible-verse-preview');

		// Add reference heading (make it clickable)
		const headingEl = element.doc.createElement('div');
		headingEl.classList.add('bible-verse-preview-heading', 'bible-reference-clickable');
		headingEl.textContent = passage.reference;

		// Add click handler to the heading
		headingEl.addEventListener('click', (e) => {
			// Prevent the event from propagating
			e.stopPropagation();
			e.preventDefault();

			try {
				// Call the method to open the chapter note
				this.plugin.openChapterNote(passage.reference);

				// Close the preview - using a method available in BibleEventHandlers
				// Remove the popup directly instead of trying to access the private property
				const previewPoppers = element.doc.querySelectorAll('.bible-verse-preview');
				if (previewPoppers) {
					previewPoppers.forEach(p => p.remove());
				}
			} catch (error) {
				console.error('Error opening chapter note from popup:', error);

				// Show user feedback if there's an error
				new Notice(`Disciples Journal: Unable to open chapter note for ${passage.reference}`, 10000);
			}
		});

		versePreviewEl.appendChild(headingEl);

		// Add verse content
		const contentEl = element.doc.createElement('div');
		contentEl.classList.add('bible-verse-preview-content');

		// Check if we have HTML content
		if (passage.htmlContent) {
			// Use the HTML content directly, but try to extract just the portion we need
			// for the preview (to avoid showing footnotes, chapter headings, etc.)
			try {
				// Create a temporary element to parse the HTML
				const tempEl = element.doc.createElement('div');
				tempEl.innerHTML = passage.htmlContent;

				// Find and extract the main verse content (paragraphs)
				const paragraphs = tempEl.querySelectorAll('p:not(.extra_text)');
				if (paragraphs.length > 0) {
					for (let i = 0; i < paragraphs.length; i++) {
						contentEl.appendChild(paragraphs[i].cloneNode(true));
					}
				} else {
					// Fallback if we can't extract the verses properly
					contentEl.innerHTML = passage.htmlContent;
				}
			} catch (error) {
				console.error("Error extracting verse content from HTML:", error);
				contentEl.innerHTML = passage.htmlContent;
			}
		} else {
			// Fallback to traditional verse rendering
			for (const verse of passage.verses) {
				const verseEl = element.doc.createElement('p');

				if (passage.verses.length > 1) {
					const verseNumEl = element.doc.createElement('span');
					verseNumEl.classList.add('bible-verse-number');
					verseNumEl.textContent = `${verse.verse} `;
					verseEl.appendChild(verseNumEl);
				}

				const verseTextEl = element.doc.createElement('span');
				verseTextEl.textContent = verse.text;
				verseEl.appendChild(verseTextEl);

				contentEl.appendChild(verseEl);
			}
		}

		versePreviewEl.appendChild(contentEl);

		// Position the preview near the element
		const rect = element.getBoundingClientRect();

		// Position the main popup with slight overlap to the reference
		// This creates an easier hover target when moving from reference to popup
		versePreviewEl.style.left = `${rect.left}px`;
		versePreviewEl.style.top = `${rect.bottom - 3}px`;

		// Add popup to document
		element.doc.body.appendChild(versePreviewEl);

		return versePreviewEl;
	}
}
