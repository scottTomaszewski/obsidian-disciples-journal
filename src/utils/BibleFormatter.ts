import { BiblePassage } from "../services/BibleContentService";
import { BibleReference } from "../core/BibleReference";

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
    
    /**
     * Build file path for a Bible chapter
     * Note: vaultPath should already include the translation subdirectory
     */
    public static buildChapterPath(vaultPath: string, book: string, chapter: number): string {
        return `${vaultPath}/${book}/${book} ${chapter}.md`;
    }

    /**
     * Generate collapsible copyright notice HTML
     */
    public static getCopyrightNoticeHTML(): string {
        return `
<details class="bible-copyright">
    <summary>ESV Copyright Notice</summary>
    <div class="bible-copyright-content">
        <p>Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), 
        © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. 
        All rights reserved. The ESV text may not be quoted in any publication made available to the 
        public by a Creative Commons license. The ESV may not be translated into any other language.</p>
        
        <p>Users may not copy or download more than 500 verses of the ESV Bible or more than one half 
        of any book of the ESV Bible.</p>
    </div>
</details>`;
    }
} 