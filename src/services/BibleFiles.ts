import {normalizePath, TFile} from 'obsidian';
import {BibleReference} from '../core/BibleReference';
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";

/**
 * Service for creating and opening Bible (chapter) files
 */
export class BibleFiles {
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

	// TODO - openChapterNote function to open a note pointing to a chapter passage
	// TODO - openPassageNote function to open a note pointing to a non-chapter passage

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
}
