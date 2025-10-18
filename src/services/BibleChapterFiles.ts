import {TFile} from 'obsidian';
import {BibleContentService} from './BibleContentService';
import {BibleReference} from '../core/BibleReference';
import {BibleCodeblockFormatter} from '../utils/BibleCodeblockFormatter';
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
				return;
			}

			const chapterPath = BibleFiles.pathForPassage(parsedRef, this.plugin);
			if (! await BibleFiles.fileExistsForPassage(parsedRef, this.plugin)) {
				if (this.plugin.settings.downloadOnDemand) {
					// TODO - create chapter note
					await this.createChapterNote(parsedRef);
				} else {
					console.error(`Passage download disabled (see settings): ${chapterPath}`);
					return null;
				}
			}

			const passageNoteFile = BibleFiles.getFileForPassage(parsedRef, this.plugin);
			if (passageNoteFile && passageNoteFile instanceof TFile) {
				const leaf = this.plugin.app.workspace.getLeaf(false);
				await leaf.openFile(passageNoteFile);

				// If there's a specific verse, scroll to it
				if (parsedRef.verse) {
					setTimeout(() => {
						// Find the verse element and scroll to it
						const verseEl = leaf.getContainer().doc.querySelector(`.verse-${parsedRef.verse}`);
						if (verseEl) {
							verseEl.scrollIntoView({behavior: 'smooth', block: 'center'});
						}
					}, 300); // Give it a moment to load
				}
			} else {
				console.error(`Could not find or create the chapter note: ${chapterPath}`);
			}
		} catch (error) {
			console.error('Error opening chapter note:', error);
		}
	}

	/**
	 * Create a new chapter note
	 */
	private async createChapterNote(reference: BibleReference) {
		try {
			// Create reference only from book+chapter
			const bookChapter = new BibleReference(reference.book, reference.chapter);

			// Get the content from the Bible API and format it for a note
			const response: BibleApiResponse = await this.bibleContentService.getBibleContent(bookChapter);

			// Check if passage is null
			if (response.isError()) {
				// TODO - handle this better with a dialog box or Notice or something.
				console.error(`Failed to get Bible content for ${bookChapter}`);
				throw new Error(`Failed to get Bible content for ${bookChapter}`);
			}
		} catch (error) {
			console.error('Error creating chapter note:', error);
			throw error;
		}
	}

	/**
	 * Get the full path with version
	 */
	private getFullContentPath(): string {
		return `${this.plugin.settings.bibleContentVaultPath}/${this.plugin.settings.preferredBibleVersion}`;
	}
}
