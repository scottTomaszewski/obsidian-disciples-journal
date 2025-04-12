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
 * Updates CSS variables on the root element.
 */
export class BibleStyles {

    constructor() {
        // No initial style element creation needed
    }
    
    /**
     * Apply styles by updating CSS variables based on theme, preset, and settings.
     */
    public applyStyles(theme: 'light' | 'dark', presetName: string = 'default', fontSize: string = '100%', settings?: {
        wordsOfChristColor?: string;
        verseNumberColor?: string;
        headingColor?: string;
        blockIndentation?: string;
    }): void {
        
        // Get the preset, defaulting to 'default' if not found
        const preset = THEME_PRESETS[presetName] || THEME_PRESETS.default;
        
        // Get the base options for the current theme
        const baseOptions = preset[theme];

        // Start with base options and apply the specific font size
        const options: BibleStyleOptions = { 
            ...baseOptions, 
            fontSize: fontSize || '100%' // Ensure fontSize always has a value
        };
        
        // Apply custom settings from DisciplesJournalSettings if provided
        // These will override the preset values
        if (settings) {
            if (settings.wordsOfChristColor) options.wordsOfChristColor = settings.wordsOfChristColor;
            if (settings.verseNumberColor) options.verseNumberColor = settings.verseNumberColor;
            if (settings.headingColor) options.headingColor = settings.headingColor;
            if (settings.blockIndentation) options.blockIndentation = settings.blockIndentation;
        }
        
        // Update the CSS variables on the root element
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--dj-font-size', options.fontSize);
        rootStyle.setProperty('--dj-heading-color', options.headingColor);
        rootStyle.setProperty('--dj-verse-number-color', options.verseNumberColor);
        rootStyle.setProperty('--dj-woc-color', options.wordsOfChristColor);
        rootStyle.setProperty('--dj-block-indentation', options.blockIndentation);
    }

    /**
     * Resets the custom styles potentially set by this class by removing the CSS variables.
     * This allows the default styles in styles.css to take effect.
     */
    public resetStyles(): void {
        const rootStyle = document.documentElement.style;
        rootStyle.removeProperty('--dj-font-size');
        rootStyle.removeProperty('--dj-heading-color');
        rootStyle.removeProperty('--dj-verse-number-color');
        rootStyle.removeProperty('--dj-woc-color');
        rootStyle.removeProperty('--dj-block-indentation');
    }
} 