import {Notice, normalizePath, TFile, WorkspaceLeaf} from 'obsidian';
import {BibleReference} from '../core/BibleReference';
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import {BibleApiResponse} from "../utils/BibleApiResponse";
import type {BibleContentService} from './BibleContentService';

/**
 * Service for resolving, creating, and opening Bible passage/chapter notes.
 *
 * The path/file lookup helpers are static (they only need the plugin), while the
 * note-opening helpers are instance methods because they depend on the content
 * service used to download passages that aren't on disk yet.
 */
export class BibleFiles {
	private plugin: DisciplesJournalPlugin;
	private bibleContentService: BibleContentService;

	constructor(plugin: DisciplesJournalPlugin, bibleContentService: BibleContentService) {
		this.plugin = plugin;
		this.bibleContentService = bibleContentService;
	}

	public static getFileForPassage(passage: BibleReference, plugin: DisciplesJournalPlugin): TFile | null {
		const passageNotePath = BibleFiles.pathForPassage(passage, plugin);
		const file = plugin.app.vault.getAbstractFileByPath(passageNotePath);
		if (file instanceof TFile) {
			return file;
		} else {
			console.error(`Could not find passage note: ${passageNotePath}`);
			return null;
		}
	}

	public static fileExistsForPassage(passage: BibleReference, plugin: DisciplesJournalPlugin): boolean {
		return plugin.app.vault.getAbstractFileByPath(BibleFiles.pathForPassage(passage, plugin)) instanceof TFile;
	}

	public static pathForPassage(passage: BibleReference, plugin: DisciplesJournalPlugin): string {
		const base = `${BibleFiles.getFullContentPath(plugin)}/${passage.book}`;
		if (passage.isChapterReference()) {
			return normalizePath(`${base}/${passage.book} ${passage.chapter}.md`);
		} else if (passage.endVerse !== undefined && passage.endVerse != passage.verse) {
			return normalizePath(`${base}/${passage.book} ${passage.chapter}v${passage.verse}-${passage.endVerse}.md`);
		} else {
			return normalizePath(`${base}/${passage.book} ${passage.chapter}v${passage.verse}.md`);
		}
	}

	/**
	 * Get the full path with version
	 */
	private static getFullContentPath(plugin: DisciplesJournalPlugin): string {
		return `${plugin.settings.bibleContentVaultPath}/${plugin.settings.preferredBibleVersion}`;
	}

	public static async clearData(plugin: DisciplesJournalPlugin) {
		console.debug(`Clearing bible data from ${plugin.settings.bibleContentVaultPath}`);
		const folderPath = normalizePath(plugin.settings.bibleContentVaultPath);
		const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
		if (folder) {
			// Route through the FileManager so deletion respects the user's trash settings.
			await plugin.app.fileManager.trashFile(folder);
		}
	}

	/**
	 * Open a chapter note for the given reference, creating it from the API first
	 * if it isn't on disk yet. If the reference includes a verse, the note is
	 * scrolled to that verse once it renders.
	 *
	 * Pass `openInNewTab` to open the chapter in a fresh tab instead of reusing
	 * the active leaf (used by the "Open Bible" command so it never replaces the
	 * note the user is reading).
	 */
	public async openChapterNote(reference: BibleReference, openInNewTab = false): Promise<void> {
		try {
			const chapterPath = BibleFiles.pathForPassage(reference, this.plugin);
			if (!BibleFiles.fileExistsForPassage(reference, this.plugin)) {
				if (this.plugin.settings.downloadOnDemand) {
					const response = await this.createChapterNote(reference);
					if (response.isError()) {
						// Surface the underlying reason (e.g. missing ESV API token) to the user
						// rather than failing silently.
						new Notice(`Disciples Journal: ${response.errorMessage}`, 10000);
						return;
					}
				} else {
					console.error(`Passage download disabled (see settings): ${chapterPath}`);
					new Notice("Disciples Journal: On-demand passage download is turned off. Enable it in the plugin settings to open this chapter.", 10000);
					return;
				}
			}

			const passageNoteFile = BibleFiles.getFileForPassage(reference, this.plugin);
			if (passageNoteFile instanceof TFile) {
				const leaf = this.plugin.app.workspace.getLeaf(openInNewTab ? 'tab' : false);
				await leaf.openFile(passageNoteFile);

				// If there's a specific verse, scroll to it once it has rendered
				if (reference.verse) {
					this.scrollToVerse(leaf, reference.verse);
				}
			} else {
				console.error(`Could not find or create the chapter note: ${chapterPath}`);
				new Notice(`Disciples Journal: Could not open the chapter note for ${reference.toString()}.`, 10000);
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
}
