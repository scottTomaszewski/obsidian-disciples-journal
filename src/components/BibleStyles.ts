import { App } from "obsidian";

/**
 * Component for managing Bible reference CSS styles
 */
export class BibleStyles {
    private app: App;
    
    constructor(app: App) {
        this.app = app;
    }
    
    /**
     * Add custom CSS styles for Bible references
     */
    public addStyles(fontSizeForVerses: string = '100%'): void {
        const styleEl = document.createElement('style');
        styleEl.id = 'disciples-journal-styles';
        styleEl.textContent = this.getStylesText(fontSizeForVerses);
        document.head.appendChild(styleEl);
    }
    
    /**
     * Update font size for Bible verses
     */
    public updateFontSize(fontSize: string): void {
        const styleEl = document.getElementById('disciples-journal-styles');
        if (styleEl) {
            styleEl.textContent = this.getStylesText(fontSize);
        } else {
            this.addStyles(fontSize);
        }
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
    private getStylesText(fontSize: string): string {
        return `
            /* Bible Reference Link Styles */
            .bible-reference {
                color: var(--text-accent);
                cursor: pointer;
                text-decoration: underline;
                font-weight: 500;
            }
            
            .bible-reference:hover {
                text-decoration: none;
                background-color: var(--background-secondary);
                border-radius: 3px;
            }
            
            /* Bible Verse Preview Styles */
            .bible-verse-preview {
                max-width: 400px;
                max-height: 300px;
                overflow-y: auto;
                padding: 12px;
                border-radius: 6px;
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
                font-size: ${fontSize};
                z-index: 1000;
            }
            
            .bible-verse-preview-heading {
                font-weight: bold;
                margin-bottom: 8px;
                color: var(--text-accent);
                font-size: 1.1em;
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 4px;
            }
            
            .bible-verse-preview-content {
                color: var(--text-normal);
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
                color: var(--text-accent);
                margin-top: 0;
                margin-bottom: 12px;
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 6px;
            }
            
            .bible-passage-text {
                font-size: ${fontSize};
                line-height: 1.5;
            }
            
            /* Bible Verse Styles */
            .bible-verse {
                margin: 8px 0;
            }
            
            .bible-verse-number {
                font-weight: bold;
                color: var(--text-accent);
                margin-right: 4px;
            }
            
            .bible-verse-text {
                color: var(--text-normal);
            }
            
            /* Error Message Style */
            .bible-reference-error {
                color: var(--text-error);
                font-style: italic;
                background-color: var(--background-modifier-error);
                padding: 8px 12px;
                border-radius: 4px;
                display: inline-block;
            }
            
            /* ESV API Rendering Styles */
            .esv-text {
                font-size: ${fontSize};
                line-height: 1.5;
            }
            
            .esv-text h2 {
                color: var(--text-accent);
                font-size: 1.2em;
                margin-top: 1em;
                margin-bottom: 0.5em;
            }
            
            .esv-text h3 {
                color: var(--text-accent);
                font-size: 1.1em;
                margin-top: 0.8em;
                margin-bottom: 0.4em;
            }
            
            .esv-text p {
                margin: 0.6em 0;
            }
            
            .esv-text .chapter-num {
                font-size: 1.2em;
                font-weight: bold;
                color: var(--text-accent);
            }
            
            .esv-text .verse-num {
                font-weight: bold;
                font-size: 0.8em;
                color: var(--text-accent);
                vertical-align: top;
                margin-right: 0.2em;
            }
            
            .esv-text .woc {
                color: var(--text-accent);
            }
            
            .esv-text .footnotes {
                font-size: 0.9em;
                margin-top: 1em;
                padding-top: 0.5em;
                border-top: 1px solid var(--background-modifier-border);
            }
            
            .esv-text .footnote {
                margin-bottom: 0.5em;
            }
        `;
    }
} 