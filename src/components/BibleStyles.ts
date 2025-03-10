import { App } from "obsidian";

/**
 * Interface for Bible styling options
 */
export interface BibleStyleOptions {
    fontSize: string;
    wordsOfChristColor: string;
    verseNumberColor: string;
    headingColor: string;
    blockIndentation: string;
}

/**
 * Component for managing Bible reference CSS styles
 */
export class BibleStyles {
    private app: App;
    private defaultOptions: BibleStyleOptions = {
        fontSize: '100%',
        wordsOfChristColor: 'var(--text-accent)',
        verseNumberColor: 'var(--text-accent)',
        headingColor: 'var(--text-accent)',
        blockIndentation: '2em'
    };
    
    constructor(app: App) {
        this.app = app;
    }
    
    /**
     * Add custom CSS styles for Bible references
     */
    public addStyles(options?: Partial<BibleStyleOptions>): void {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const styleEl = document.createElement('style');
        styleEl.id = 'disciples-journal-styles';
        styleEl.textContent = this.getStylesText(mergedOptions);
        document.head.appendChild(styleEl);
    }
    
    /**
     * Update Bible styles with new options
     */
    public updateStyles(options: Partial<BibleStyleOptions>): void {
        const styleEl = document.getElementById('disciples-journal-styles');
        if (styleEl) {
            const currentOptions = this.getCurrentOptions();
            const mergedOptions = { ...currentOptions, ...options };
            styleEl.textContent = this.getStylesText(mergedOptions);
        } else {
            this.addStyles(options);
        }
    }
    
    /**
     * Get current style options
     */
    private getCurrentOptions(): BibleStyleOptions {
        // This is a simplified implementation; in a real-world scenario,
        // you might want to parse the current styles to extract values
        return this.defaultOptions;
    }
    
    /**
     * Remove custom CSS styles
     */
    public removeStyles(): void {
        const styleEl = document.getElementById('disciples-journal-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }
    
    /**
     * Get the CSS styles as text
     */
    private getStylesText(options: BibleStyleOptions): string {
        return `
            /* Bible Reference Link Styles */
            .bible-reference {
                color: var(--text-accent);
                cursor: pointer;
                text-decoration: underline;
                font-weight: 500;
            }
            
            .bible-reference:hover {
                color: var(--text-accent-hover);
                background-color: var(--background-modifier-hover);
                border-bottom: 1px solid var(--text-accent-hover);
                text-decoration: none;
                border-radius: 3px;
            }
            
            /* Bible Verse Preview Styles */
            .bible-verse-preview {
                font-size: ${options.fontSize};
                line-height: 1.5;
                max-width: 450px;
                max-height: 300px;
                overflow-y: auto;
                padding: 12px;
                border-radius: 5px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                z-index: 1000;
            }
            
            .bible-verse-preview-heading {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: ${options.headingColor};
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 6px;
            }
            
            .bible-verse-preview-content {
                color: var(--text-normal);
            }
            
            .bible-verse-preview-content p {
                margin: 0 0 8px 0;
                text-indent: -18px;
                padding-left: 18px;
            }
            
            /* Bible Passage Container Styles */
            .bible-passage-container {
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 16px;
                margin: 12px 0;
            }
            
            .bible-passage-heading {
                font-weight: bold;
                color: ${options.headingColor};
                margin-top: 0;
                margin-bottom: 12px;
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 6px;
            }
            
            .bible-passage-text {
                font-size: ${options.fontSize};
                line-height: 1.5;
            }
            
            .bible-verse {
                margin: 8px 0;
            }
            
            .bible-chapter-heading {
                font-size: 1.4em;
                font-weight: bold;
                color: ${options.headingColor};
                margin-top: 24px;
                margin-bottom: 16px;
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 8px;
            }
            
            .bible-verse-number {
                font-weight: bold;
                color: ${options.verseNumberColor};
                margin-right: 4px;
            }
            
            .bible-verse-text {
                color: var(--text-normal);
            }
            
            .bible-reference-error {
                color: var(--text-error);
                font-style: italic;
                background-color: var(--background-modifier-error);
                padding: 8px 12px;
                border-radius: 4px;
                display: inline-block;
            }
            
            /* ESV API HTML Rendering Styles */
            .bible-passage-text h2 {
                font-size: 1.3em;
                margin-top: 20px;
                margin-bottom: 10px;
                color: ${options.headingColor};
            }
            
            .bible-passage-text h3 {
                font-size: 1.1em;
                font-style: italic;
                margin-top: 16px;
                margin-bottom: 8px;
                color: ${options.headingColor};
            }
            
            .bible-passage-text .chapter-num,
            .bible-passage-text .verse-num {
                font-weight: bold;
                font-size: 0.8em;
                color: ${options.verseNumberColor} !important;
                vertical-align: top;
                margin-right: 0.2em;
            }
            
            .bible-passage-text p {
                margin: 0.6em 0;
            }
            
            .bible-passage-text .block-indent {
                margin-left: ${options.blockIndentation};
            }
            
            .bible-passage-text .line {
                display: block;
            }
            
            .bible-passage-text .indent {
                text-indent: 1.5em;
            }
            
            .bible-passage-text .footnote {
                font-size: 0.8em;
                color: var(--text-muted);
            }
            
            .bible-passage-text .footnotes {
                margin-top: 2em;
                padding-top: 1em;
                border-top: 1px solid var(--background-modifier-border);
                font-size: 0.9em;
            }
            
            .bible-passage-text .audio {
                display: none;
            }
            
            .bible-passage-text .extra_text {
                color: var(--text-muted);
            }
            
            /* Words of Christ styling */
            .bible-passage-text .woc,
            .esv-text .woc {
                color: ${options.wordsOfChristColor};
            }
            
            /* Error messages and warnings */
            .bible-api-error,
            .bible-missing-token-warning {
                background-color: var(--background-modifier-error-hover);
                color: var(--text-error);
                padding: 12px;
                border-radius: 6px;
                border-left: 4px solid var(--text-error);
                margin: 12px 0;
            }
            
            .bible-missing-token-warning {
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                border-left-color: var(--text-accent);
            }
            
            .bible-missing-token-warning a {
                color: var(--text-accent);
                text-decoration: underline;
            }
            
            .bible-missing-token-warning a:hover {
                text-decoration: none;
            }
        `;
    }
} 