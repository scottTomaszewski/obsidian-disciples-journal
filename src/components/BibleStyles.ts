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
 * Theme preset definitions
 */
export interface ThemePreset {
    light: BibleStyleOptions;
    dark: BibleStyleOptions;
}

/**
 * Available theme presets
 */
export const THEME_PRESETS: Record<string, ThemePreset> = {
    default: {
        light: {
            fontSize: '100%',
            wordsOfChristColor: 'var(--text-accent)',
            verseNumberColor: 'var(--text-accent)',
            headingColor: 'var(--text-accent)',
            blockIndentation: '2em'
        },
        dark: {
            fontSize: '100%',
            wordsOfChristColor: 'var(--text-accent)',
            verseNumberColor: 'var(--text-accent)',
            headingColor: 'var(--text-accent)',
            blockIndentation: '2em'
        }
    },
    classic: {
        light: {
            fontSize: '100%',
            wordsOfChristColor: '#b91c1c',
            verseNumberColor: '#2563eb',
            headingColor: '#4b5563',
            blockIndentation: '2em'
        },
        dark: {
            fontSize: '100%',
            wordsOfChristColor: '#ef4444',
            verseNumberColor: '#60a5fa',
            headingColor: '#9ca3af',
            blockIndentation: '2em'
        }
    },
    minimal: {
        light: {
            fontSize: '100%',
            wordsOfChristColor: '#000000',
            verseNumberColor: '#6b7280',
            headingColor: '#374151',
            blockIndentation: '1.5em'
        },
        dark: {
            fontSize: '100%',
            wordsOfChristColor: '#ffffff',
            verseNumberColor: '#9ca3af',
            headingColor: '#e5e7eb',
            blockIndentation: '1.5em'
        }
    }
};

/**
 * Component for managing Bible reference CSS styles
 */
export class BibleStyles {
    private currentFontSize: string;
    private styleElement: HTMLStyleElement | null = null;
    
    constructor(fontSize: string = '100%') {
        this.currentFontSize = fontSize;
        this.createStyleElement();
    }
    
    /**
     * Create the style element if it doesn't exist
     */
    private createStyleElement(): void {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'disciples-journal-styles';
            document.head.appendChild(this.styleElement);
        }
    }
    
    /**
     * Apply styles based on theme and preset
     */
    public applyStyles(theme: 'light' | 'dark', presetName: string = 'default', fontSize: string = '100%'): void {
        this.createStyleElement();
        
        // Get the preset, defaulting to 'default' if not found
        const preset = THEME_PRESETS[presetName] || THEME_PRESETS.default;
        
        // Get the options for the current theme
        const options = { ...preset[theme], fontSize: fontSize || this.currentFontSize };
        
        // Update the style element
        if (this.styleElement) {
            this.styleElement.textContent = this.getStylesText(options);
        }
        
        // Update current font size
        this.currentFontSize = fontSize;
    }
    
    /**
     * Set the font size
     */
    public setFontSize(fontSize: string): void {
        this.currentFontSize = fontSize;
    }
    
    /**
     * Remove styles from the document
     */
    public removeStyles(): void {
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }
    }
    
    /**
     * Generate CSS text based on options
     */
    private getStylesText(options: BibleStyleOptions): string {
        return `
            /* Bible reference styles */
            .bible-verse-preview {
                font-size: ${options.fontSize};
                max-width: 600px;
                padding: 0.5em 1em;
                border-radius: 5px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                z-index: 1000;
                overflow: auto;
            }
            
            .bible-verse-preview h1, 
            .bible-verse-preview h2, 
            .bible-verse-preview h3, 
            .bible-verse-preview h4 {
                margin: 0.2em 0;
                color: ${options.headingColor};
            }
            
            .bible-verse-preview .passage-content {
                margin-top: 0.5em;
                line-height: 1.6;
            }
            
            .bible-verse-preview .verse-num {
                vertical-align: super;
                font-size: 0.75em;
                font-weight: bold;
                color: ${options.verseNumberColor};
                margin-right: 0.25em;
            }
            
            .bible-verse-preview .woc {
                color: ${options.wordsOfChristColor};
            }
            
            .bible-verse-preview .indent {
                padding-left: ${options.blockIndentation};
                display: block;
                margin: 0.5em 0;
            }
            
            .bible-verse-preview .esv-text {
                font-size: 0.9em;
                margin-bottom: 0.5em;
            }
            
            .bible-verse-preview .copyright {
                font-size: 0.8em;
                color: var(--text-muted);
                margin-top: 0.5em;
            }
            
            .bible-reference {
                cursor: pointer;
                display: inline-block;
                border-bottom: 1px dotted var(--text-accent);
                font-weight: 500;
                white-space: nowrap;
            }
            
            .bible-reference:hover {
                color: var(--text-accent);
            }
            
            .bible-heading {
                color: ${options.headingColor};
                font-weight: bold;
                margin: 1em 0 0.5em 0;
            }
            
            .bible-reference-clickable {
                cursor: pointer;
                color: var(--text-accent);
            }
            
            .bible-reference-clickable:hover {
                text-decoration: underline;
            }
            
            .verse-missing-token {
                padding: 0.5em;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background-color: var(--background-secondary);
                margin: 0.5em 0;
            }
            
            .verse-missing-token .message {
                color: var(--text-muted);
                font-style: italic;
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
            
        `;
    }
} 