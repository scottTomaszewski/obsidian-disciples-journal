import {BiblePassage} from "../services/BibleContentService";

/**
 * Utility for formatting Bible content consistently across the application
 */
export class BibleFormatter {
	/**
	 * Format chapter content as Markdown
	 */
	public static formatChapterContent(passage: BiblePassage): string {
		if (!passage) return "# Error: No passage content\n\nThe requested passage could not be loaded.";

		let content = "";

		// Add code block for rendering
		content += "```bible\n";
		content += passage.reference;
		content += "\n```\n\n";

		// Alternatively, add each verse separately
		if (passage.verses && passage.verses.length > 0) {
			for (const verse of passage.verses) {
				content += `**${verse.verse}** ${verse.text}\n\n`;
			}
		}

		return content;
	}
}
