import {Notice, TFile, WorkspaceLeaf} from 'obsidian';
import {BibleContentService} from './BibleContentService';
import {BibleReference} from '../core/BibleReference';
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import {BibleApiResponse} from "../utils/BibleApiResponse";
import {BibleFiles} from "./BibleFiles";

/**
 * Service for creating and opening Bible (chapter) files
 */
// TODO - logic in this class needs to move to BibleFiles
export class BibleChapterFiles {
	private plugin: DisciplesJournalPlugin;
	private bibleContentService: BibleContentService;

	constructor(
		plugin: DisciplesJournalPlugin,
		bibleContentService: BibleContentService,
	) {
		this.plugin = plugin;
		this.bibleContentService = bibleContentService;
	}

	/**
	 * Open or create a chapter note
	 */
	public async openChapterNote(reference: string) {
		try {
			// Parse the reference string to ensure it's valid
			const parsedRef = BibleReference.parse(reference);
			if (!parsedRef) {
				console.error(`Invalid reference: ${reference}`);
				new Notice(`Disciples Journal: "${reference}" is not a valid Bible reference.`, 10000);
				return;
			}

			const chapterPath = BibleFiles.pathForPassage(parsedRef, this.plugin);
			if (!BibleFiles.fileExistsForPassage(parsedRef, this.plugin)) {
				if (this.plugin.settings.downloadOnDemand) {
					// TODO - create chapter note
					const response = await this.createChapterNote(parsedRef);
					if (response.isError()) {
						// Surface the underlying reason (e.g. missing ESV API token) to the user
						// rather than failing silently.
						new Notice(`Disciples Journal: ${response.errorMessage}`, 10000);
						return;
					}
				} else {
					console.error(`Passage download disabled (see settings): ${chapterPath}`);
					new Notice("Disciples Journal: On-demand passage download is turned off. Enable it in the plugin settings to open this chapter.", 10000);
					return null;
				}
			}

			const passageNoteFile = BibleFiles.getFileForPassage(parsedRef, this.plugin);
			if (passageNoteFile && passageNoteFile instanceof TFile) {
				const leaf = this.plugin.app.workspace.getLeaf(false);
				await leaf.openFile(passageNoteFile);

				// If there's a specific verse, scroll to it once it has rendered
				if (parsedRef.verse) {
					this.scrollToVerse(leaf, parsedRef.verse);
				}
			} else {
				console.error(`Could not find or create the chapter note: ${chapterPath}`);
				new Notice(`Disciples Journal: Could not open the chapter note for ${parsedRef.toString()}.`, 10000);
			}
		} catch (error) {
			console.error('Error opening chapter note:', error);
			const detail = error instanceof Error ? error.message : String(error);
			new Notice(`Disciples Journal: Failed to open chapter note. ${detail}`, 10000);
		}
	}

	/**
	 * Scroll the opened note to a verse element. The note's body renders
	 * asynchronously after `openFile`, so rather than guessing with a fixed
	 * delay we watch the view for the verse element to appear and scroll the
	 * moment it does. A bounded fallback disconnects the observer if the verse
	 * never renders (e.g. wrong reference, or the view is in an edit mode that
	 * doesn't produce verse elements) so it can't linger.
	 */
	private scrollToVerse(leaf: WorkspaceLeaf, verse: number): void {
		const container = leaf.getContainer();
		const selector = `.verse-${verse}`;

		const tryScroll = (): boolean => {
			const verseEl = container.doc.querySelector(selector);
			if (verseEl) {
				verseEl.scrollIntoView({behavior: 'smooth', block: 'center'});
				return true;
			}
			return false;
		};

		// Already rendered (e.g. note was cached)? Scroll right away.
		if (tryScroll()) {
			return;
		}

		const win = container.win;
		const observer = new MutationObserver(() => {
			if (tryScroll()) {
				observer.disconnect();
				win.clearTimeout(fallbackId);
			}
		});
		observer.observe(leaf.view.containerEl, {childList: true, subtree: true});

		const fallbackId = win.setTimeout(() => observer.disconnect(), 5000);
	}

	/**
	 * Create a new chapter note. Returns the API response so callers can surface
	 * the reason for any failure (e.g. a missing ESV API token) to the user.
	 */
	private async createChapterNote(reference: BibleReference): Promise<BibleApiResponse> {
		// Create reference only from book+chapter
		const bookChapter = new BibleReference(reference.book, reference.chapter);

		// Get the content from the Bible API and format it for a note
		const response: BibleApiResponse = await this.bibleContentService.getBibleContent(bookChapter);
		if (response.isError()) {
			console.error(`Failed to get Bible content for ${bookChapter.toString()}: ${response.errorMessage}`);
		}
		return response;
	}

	/**
	 * Get the full path with version
	 */
	private getFullContentPath(): string {
		return `${this.plugin.settings.bibleContentVaultPath}/${this.plugin.settings.preferredBibleVersion}`;
	}
}
