import {Notice, TFile} from 'obsidian';
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
			if (! await BibleFiles.fileExistsForPassage(parsedRef, this.plugin)) {
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

				// If there's a specific verse, scroll to it
				if (parsedRef.verse) {
					window.setTimeout(() => {
						// Find the verse element and scroll to it
						const verseEl = leaf.getContainer().doc.querySelector(`.verse-${parsedRef.verse}`);
						if (verseEl) {
							verseEl.scrollIntoView({behavior: 'smooth', block: 'center'});
						}
					}, 300); // Give it a moment to load
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
