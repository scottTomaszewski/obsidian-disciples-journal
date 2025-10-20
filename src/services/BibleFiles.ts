import {TFile} from 'obsidian';
import {BibleReference} from '../core/BibleReference';
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";

/**
 * Service for creating and opening Bible (chapter) files
 */
export class BibleFiles {
	public static getFileForPassage(passage: BibleReference, plugin: DisciplesJournalPlugin): TFile | null {
		const passageNotePath = BibleFiles.pathForPassage(passage, plugin);
		const file = plugin.app.vault.getAbstractFileByPath(passageNotePath);
		if (file && file instanceof TFile) {
			return file;
		} else {
			console.error(`Could not find passage note: ${passageNotePath}`);
			return null;
		}
	}

	public static async fileExistsForPassage(passage: BibleReference, plugin: DisciplesJournalPlugin): Promise<boolean> {
		return await plugin.app.vault.adapter.exists(BibleFiles.pathForPassage(passage, plugin));
	}

	// TODO - openChapterNote function to open a note pointing to a chapter passage
	// TODO - openPassageNote function to open a note pointing to a non-chapter passage

	public static pathForPassage(passage: BibleReference, plugin: DisciplesJournalPlugin): string {
		if (passage.isChapterReference()) {
			return `${BibleFiles.getFullContentPath(plugin)}/${passage.book}/${passage.book} ${passage.chapter}.md`;
		} else if (passage.endVerse !== undefined && passage.endVerse != passage.verse) {
			return `${BibleFiles.getFullContentPath(plugin)}/${passage.book}/${passage.book} ${passage.chapter}v${passage.verse}-${passage.endVerse}.md`;
		} else {
			return `${BibleFiles.getFullContentPath(plugin)}/${passage.book}/${passage.book} ${passage.chapter}v${passage.verse}.md`;
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
		await plugin.app.vault.adapter.rmdir(plugin.settings.bibleContentVaultPath, true);
	}
}
