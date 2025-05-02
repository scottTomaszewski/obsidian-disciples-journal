import {Notice} from "obsidian";
import {BibleContentService} from "../services/BibleContentService";
import {BibleNavigation} from "./BibleNavigation";
import DisciplesJournalPlugin from "src/core/DisciplesJournalPlugin";
import {BibleEventHandlers} from "src/core/BibleEventHandlers";
import {BibleFiles} from "../services/BibleFiles";
import {BibleReference} from "../core/BibleReference";
import {BiblePassage} from "../utils/BiblePassage";

/**
 * Component for rendering Bible references in Obsidian
 */
export class BibleReferenceRenderer {
	private bibleContentService: BibleContentService;
	private bibleNavigation: BibleNavigation;
	private plugin: DisciplesJournalPlugin;

	constructor(
		bibleContentService: BibleContentService,
		noteCreationService: BibleFiles,
		plugin: DisciplesJournalPlugin
	) {
		this.bibleContentService = bibleContentService;
		this.plugin = plugin;
		this.bibleNavigation = new BibleNavigation(noteCreationService);
	}

	/**
	 * Process inline code blocks for Bible references
	 */
	public async processInlineCodeBlocks(element: HTMLElement): Promise<void> {
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
				const reference = BibleReference.parse(codeText);
				if (!reference) {
					continue;
				}
				const response = await this.bibleContentService.getBibleContent(reference);
				if (response.isError()) {
					new Notice(response.errorMessage, 10000);
					continue;
				}

				// Create a Bible reference element
				const referenceEl = element.doc.createElement('span');
				referenceEl.classList.add('bible-reference');
				referenceEl.textContent = codeText;

				referenceEl.addEventListener('mouseover', (e) => {
					new BibleEventHandlers(this).handleBibleReferenceHover(e, response.passage);
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
		// Parse the reference
		const reference = source.trim();
		const parsedRef = BibleReference.parse(reference);
		if (!parsedRef) {
			const message = `Invalid bible reference: ${source}`;
			console.error(message);
			const errorContainer = el.createEl('div');
			errorContainer.classList.add('bible-reference-error');
			errorContainer.textContent = message;
			return;
		}

		// Grab the content
		const response = await this.bibleContentService.getBibleContent(parsedRef);

		if (response.isError()) {
			const errorContainer = el.createEl('div');
			errorContainer.classList.add('bible-reference-error');
			errorContainer.textContent = response.errorMessage;
			return;
		}

		const canonicalRef = response.passage.reference

		const containerEl = el.doc.createElement('div');
		containerEl.classList.add('bible-passage-container');

		// Add navigation if chapter passage
		if (canonicalRef.isChapterReference() || this.plugin.settings.showNavigationForVerses) {
			this.bibleNavigation.createNavigationElements(containerEl, canonicalRef);
		}

		// Add reference heading
		const headingEl = el.doc.createElement('h3');
		headingEl.classList.add('bible-passage-heading');
		const referenceLink = headingEl.createEl('a', {text: canonicalRef.toString()});
		referenceLink.onClickEvent(async () => {
			await this.bibleNavigation.navigateToChapter(canonicalRef.book, canonicalRef.chapter);
		});

		containerEl.appendChild(headingEl);

		// Add verses
		const passageEl = el.doc.createElement('div');
		passageEl.classList.add('bible-passage-text');
		passageEl.innerHTML = response.passage.html;

		containerEl.appendChild(passageEl);
		el.appendChild(containerEl);
	}

	/**
	 * Show a verse preview in a hover popup
	 */
	public async showVersePreview(element: HTMLElement, passage: BiblePassage, event: MouseEvent): Promise<HTMLElement | null> {
		// Create verse preview element
		const versePreviewEl = element.doc.createElement('div');
		versePreviewEl.classList.add('bible-verse-preview');

		// Add reference heading (make it clickable)
		const headingEl = element.doc.createElement('div');
		headingEl.classList.add('bible-verse-preview-heading', 'bible-reference-clickable');
		headingEl.textContent = passage.reference.toString();

		// Add click handler to the heading
		headingEl.addEventListener('click', (e) => {
			// Prevent the event from propagating
			e.stopPropagation();
			e.preventDefault();

			try {
				// Call the method to open the chapter note
				// TODO - openChapterNote should take in a BibleReference instead of string
				this.plugin.openChapterNote(passage.reference.toString());

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

		// Use the HTML content directly, but try to extract just the portion we need
		// for the preview (to avoid showing footnotes, chapter headings, etc.)
		try {
			// Create a temporary element to parse the HTML
			const tempEl = element.doc.createElement('div');
			tempEl.innerHTML = passage.html;

			// Find and extract the main verse content (paragraphs)
			const paragraphs = tempEl.querySelectorAll('p:not(.extra_text)');
			if (paragraphs.length > 0) {
				for (let i = 0; i < paragraphs.length; i++) {
					contentEl.appendChild(paragraphs[i].cloneNode(true));
				}
			} else {
				// Fallback if we can't extract the verses properly
				contentEl.innerHTML = passage.html;
			}
		} catch (error) {
			console.error("Error extracting verse content from HTML:", error);
			contentEl.innerHTML = passage.html;
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
