import {BiblePassage} from "./BiblePassage";

/**
 * Utility for formatting Bible content consistently across the application
 */
// TODO - this probably belongs somewhere else
export class BibleFormatter {
	/**
	 * Format chapter content as Markdown
	 */
	public static formatChapterContent(passage: BiblePassage): string {
		if (!passage) return "# Error: No passage content\n\nThe requested passage could not be loaded.";

		let content = "";

		// Add code block for rendering
		content += "```bible\n";
		content += passage.reference.toString();
		content += "\n```\n\n";

		return content;
	}
}
