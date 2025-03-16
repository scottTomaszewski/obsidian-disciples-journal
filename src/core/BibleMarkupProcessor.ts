import { App, MarkdownPostProcessorContext } from 'obsidian';
import { BibleReferenceRenderer } from '../components/BibleReferenceRenderer';
import { BibleReferenceParser } from './BibleReferenceParser';
import { DisciplesJournalSettings } from '../settings/DisciplesJournalSettings';

/**
 * Handles processing of Bible references in markdown text
 */
export class BibleMarkupProcessor {
    private app: App;
    private bibleReferenceRenderer: BibleReferenceRenderer;
    private bibleReferenceParser: BibleReferenceParser;
    private settings: DisciplesJournalSettings;
    
    constructor(
        app: App,
        bibleReferenceRenderer: BibleReferenceRenderer,
        bibleReferenceParser: BibleReferenceParser,
        settings: DisciplesJournalSettings
    ) {
        this.app = app;
        this.bibleReferenceRenderer = bibleReferenceRenderer;
        this.bibleReferenceParser = bibleReferenceParser;
        this.settings = settings;
    }
    
    /**
     * Process Bible code blocks
     */
    async processBibleCodeBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        // Check if display of full passages is enabled in settings
        if (!this.settings.displayFullPassages) {
            return;
        }
        
        try {
            await this.bibleReferenceRenderer.processFullBiblePassage(source, el);
        } catch (error) {
            console.error('Error processing Bible code block:', error);
            el.createEl('div', {
                text: `Error processing Bible reference: ${error.message}`,
                cls: 'bible-reference-error'
            });
        }
    }
    
    /**
     * Process inline Bible references in text
     */
    async processInlineBibleReferences(el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        // Check if display of inline verses is enabled in settings
        if (!this.settings.displayInlineVerses) {
            return;
        }
        
        try {
            await this.bibleReferenceRenderer.processInlineCodeBlocks(el, ctx);
        } catch (error) {
            console.error('Error processing inline Bible references:', error);
        }
    }
} 