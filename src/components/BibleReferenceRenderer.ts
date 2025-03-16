import { App, MarkdownPostProcessorContext, MarkdownView, Notice, TFile } from "obsidian";
import { BibleContentService } from "../services/BibleContentService";
import { BibleReference } from "../core/BibleReference";
import { BibleNavigation } from "./BibleNavigation";
import { BookNameService } from "../services/BookNameService";
import { BibleFormatter } from "../utils/BibleFormatter";
import DisciplesJournalPlugin from "src/core/DisciplesJournalPlugin";
import { BibleReferenceParser } from '../core/BibleReferenceParser';

/**
 * Interface for Bible passage content
 */
export interface BiblePassage {
    reference: string;
    verses: any[];
    htmlContent?: string;
    missingToken?: boolean;
}

/**
 * Interface for plugin settings
 */
export interface PluginSettings {
    displayInlineVerses: boolean;
    displayFullPassages: boolean;
    bibleTextFontSize: string;
    stylePreset: string;
}

/**
 * Component for rendering Bible references in Obsidian
 */
export class BibleReferenceRenderer {
    private bibleContentService: BibleContentService;
    private fontSizeForVerses: string;
    private vaultPath: string;
    private app: App;
    private bibleNavigation: BibleNavigation;
    private downloadOnDemand: boolean = true;
    private plugin: DisciplesJournalPlugin;
    private parser: BibleReferenceParser;
    private settings: PluginSettings;
    
    constructor(
        app: App, 
        bibleContentService: BibleContentService, 
        bookNameService: BookNameService, 
        fontSizeForVerses: string = '100%', 
        vaultPath: string = 'Bible/ESV',
        plugin: DisciplesJournalPlugin
    ) {
        this.app = app;
        this.bibleContentService = bibleContentService;
        this.fontSizeForVerses = fontSizeForVerses;
        this.vaultPath = vaultPath;
        this.plugin = plugin;
        this.bibleNavigation = new BibleNavigation(
            app, 
            bookNameService, 
            bibleContentService,
            vaultPath, 
            this.downloadOnDemand
        );
        this.parser = new BibleReferenceParser(bookNameService);
        this.settings = {
            displayInlineVerses: true,
            displayFullPassages: true,
            bibleTextFontSize: fontSizeForVerses,
            stylePreset: 'default'
        };
    }
    
    /**
     * Set the font size for displayed verses
     */
    public setFontSize(fontSize: string): void {
        this.fontSizeForVerses = fontSize;
        this.settings.bibleTextFontSize = fontSize;
    }
    
    /**
     * Set the vault path for Bible content
     */
    public setVaultPath(path: string): void {
        this.vaultPath = path;
        this.bibleNavigation.setVaultPath(path);
    }
    
    /**
     * Set whether to download Bible content on demand
     */
    public setDownloadOnDemand(download: boolean): void {
        this.downloadOnDemand = download;
        this.bibleNavigation.setDownloadOnDemand(download);
    }
    
    /**
     * Format chapter content as Markdown
     */
    public formatChapterContent(passage: any, reference?: BibleReference): string {
        return BibleFormatter.formatChapterContent(passage);
    }
    
    /**
     * Process inline code blocks for Bible references
     */
    public async processInlineCodeBlocks(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
        const codeBlocks = element.querySelectorAll('code');
        
        for (let i = 0; i < codeBlocks.length; i++) {
            const codeBlock = codeBlocks[i];
            // Skip if the code block is not a direct child (might be inside a pre tag)
            if (codeBlock.parentElement?.tagName === 'PRE') {
                continue;
            }
            
            const codeText = codeBlock.textContent?.trim();
            if (!codeText) {
                continue;
            }
            
            try {
                // Try to parse as Bible reference
                const reference = await this.bibleContentService.getBibleContent(codeText);
                
                if (!reference) {
                    continue;
                }
                
                // Create a Bible reference element
                const referenceEl = document.createElement('span');
                referenceEl.classList.add('bible-reference');
                referenceEl.textContent = codeText;
                
                // Replace the code block with our reference element
                codeBlock.parentElement?.replaceChild(referenceEl, codeBlock);
            } catch (error) {
                console.error(`Error processing Bible reference: ${codeText}`, error);
            }
        }
    }
    
    /**
     * Process full Bible passage code blocks
     */
    public async processFullBiblePassage(source: string, el: HTMLElement): Promise<void> {
        const reference = source.trim();
        
        const passage = await this.bibleContentService.getBibleContent(reference);
        
        if (passage) {
            const containerEl = document.createElement('div');
            containerEl.classList.add('bible-passage-container');
            
            // Add navigation elements at the top of the passage
            try {
                // Try to parse the reference
                const refParts = passage.reference.split(" ");
                if (refParts.length >= 2) {
                    const book = refParts.slice(0, -1).join(" ");
                    const chapter = parseInt(refParts[refParts.length - 1]);
                    if (!isNaN(chapter)) {
                        const parsedRef = new BibleReference(book, chapter);
                        
                        // Use the new navigation method
                        this.bibleNavigation.createNavigationElements(containerEl, parsedRef);
                    }
                }
            } catch (error) {
                console.error("Error adding navigation:", error);
            }
            
            // Add reference heading
            const headingEl = document.createElement('h3');
            headingEl.classList.add('bible-passage-heading');
            headingEl.textContent = passage.reference;
            containerEl.appendChild(headingEl);
            
            // Add verses
            const passageEl = document.createElement('div');
            passageEl.classList.add('bible-passage-text');
            passageEl.style.fontSize = this.fontSizeForVerses;
            
            // Check if we have HTML content
            if (passage.htmlContent) {
                // Use the HTML content directly
                passageEl.innerHTML = passage.htmlContent;
            } else {
                // Fallback to traditional verse rendering
                for (const verse of passage.verses) {
                    const verseEl = document.createElement('p');
                    verseEl.classList.add('bible-verse');
                    
                    const verseNumEl = document.createElement('span');
                    verseNumEl.classList.add('bible-verse-number');
                    verseNumEl.textContent = `${verse.verse} `;
                    
                    const verseTextEl = document.createElement('span');
                    verseTextEl.classList.add('bible-verse-text');
                    verseTextEl.textContent = verse.text;
                    
                    verseEl.appendChild(verseNumEl);
                    verseEl.appendChild(verseTextEl);
                    passageEl.appendChild(verseEl);
                }
            }
            
            containerEl.appendChild(passageEl);
            
            el.appendChild(containerEl);
        } else {
            // If reference not found, show error
            const errorEl = document.createElement('div');
            errorEl.classList.add('bible-reference-error');
            errorEl.textContent = `Bible reference "${reference}" not found.`;
            el.appendChild(errorEl);
        }
    }
    
    /**
     * Show a verse preview in a hover popup
     */
    public async showVersePreview(element: HTMLElement, referenceText: string, event: MouseEvent): Promise<HTMLElement | null> {
        const passage = await this.bibleContentService.getBibleContent(referenceText);
        if (!passage) return null;
        
        // Create verse preview element
        const versePreviewEl = document.createElement('div');
        versePreviewEl.classList.add('bible-verse-preview');
        
        // Add reference heading (make it clickable)
        const headingEl = document.createElement('div');
        headingEl.classList.add('bible-verse-preview-heading', 'bible-reference-clickable');
        headingEl.textContent = passage.reference;
        
        // Add click handler to the heading
        headingEl.addEventListener('click', (e) => {
            // Prevent the event from propagating
            e.stopPropagation();
            e.preventDefault();
            
            try {
                // Call the method to open the chapter note
                this.plugin.openChapterNote(passage.reference);
                
                // Close the preview - using a method available in BibleEventHandlers
                // Remove the popup directly instead of trying to access the private property
                const previewPoppers = document.querySelectorAll('.bible-verse-preview');
                if (previewPoppers) {
                    previewPoppers.forEach(p => p.remove());
                }
            } catch (error) {
                console.error('Error opening chapter note from popup:', error);
                
                // Show user feedback if there's an error
                new Notice(`Disciples Journal: Unable to open chapter note for ${passage.reference}`, 10000);
            }
        });
        
        versePreviewEl.appendChild(headingEl);
        
        // Add verse content
        const contentEl = document.createElement('div');
        contentEl.classList.add('bible-verse-preview-content');
        
        // Check if we have HTML content
        if (passage.htmlContent) {
            // Use the HTML content directly, but try to extract just the portion we need
            // for the preview (to avoid showing footnotes, chapter headings, etc.)
            try {
                // Create a temporary element to parse the HTML
                const tempEl = document.createElement('div');
                tempEl.innerHTML = passage.htmlContent;
                
                // Find and extract the main verse content (paragraphs)
                const paragraphs = tempEl.querySelectorAll('p:not(.extra_text)');
                if (paragraphs.length > 0) {
                    for (let i = 0; i < paragraphs.length; i++) {
                        contentEl.appendChild(paragraphs[i].cloneNode(true));
                    }
                } else {
                    // Fallback if we can't extract the verses properly
                    contentEl.innerHTML = passage.htmlContent;
                }
            } catch (error) {
                console.error("Error extracting verse content from HTML:", error);
                contentEl.innerHTML = passage.htmlContent;
            }
        } else {
            // Fallback to traditional verse rendering
            for (const verse of passage.verses) {
                const verseEl = document.createElement('p');
                
                if (passage.verses.length > 1) {
                    const verseNumEl = document.createElement('span');
                    verseNumEl.classList.add('bible-verse-number');
                    verseNumEl.textContent = `${verse.verse} `;
                    verseEl.appendChild(verseNumEl);
                }
                
                const verseTextEl = document.createElement('span');
                verseTextEl.textContent = verse.text;
                verseEl.appendChild(verseTextEl);
                
                contentEl.appendChild(verseEl);
            }
        }
        
        versePreviewEl.appendChild(contentEl);
        
        // Position the preview near the element
        const rect = element.getBoundingClientRect();
        
        // Position the main popup with slight overlap to the reference
        // This creates an easier hover target when moving from reference to popup
        versePreviewEl.style.position = 'absolute';
        versePreviewEl.style.left = `${rect.left}px`;
        versePreviewEl.style.top = `${rect.bottom - 3}px`; // Slight overlap with reference
        versePreviewEl.style.zIndex = '1000';
        
        // Add popup to document
        document.body.appendChild(versePreviewEl);
        
        return versePreviewEl;
    }
    
    /**
     * Scroll to a specific verse in the active editor
     */
    public scrollToVerse(verse: number): void {
        // Get the active leaf
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;
        
        // Try finding the verse by ID first
        const contentEl = activeView.contentEl;
        
        // Try different methods to find the verse
        // Method 1: Try to find HTML elements with verse ID
        const verseId = `verse-${verse}`;
        const verseElement = contentEl.querySelector(`#${verseId}, [data-verse="${verse}"], .verse-${verse}`);
        
        if (verseElement) {
            // Scroll to the element
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        
        // Method 2: Try to find verse in Bible rendered content
        const verseTags = contentEl.querySelectorAll('.bible-verse-number, .verse-num');
        for (let i = 0; i < verseTags.length; i++) {
            const element = verseTags[i];
            const text = element.textContent?.trim();
            if (text && text.replace(/[^\d]/g, '') === verse.toString()) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }
        
        // Method 3: Search for the verse number in text content
        const paragraphs = contentEl.querySelectorAll('p');
        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            if (p.textContent?.includes(`**${verse}**`) || 
                p.textContent?.includes(`${verse} `) || 
                p.innerHTML?.includes(`>${verse}<`)) {
                p.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }
    }

    /**
     * Process a Bible reference and return the corresponding HTML
     */
    async processReference(referenceString: string, ctx: MarkdownPostProcessorContext): Promise<string> {
        try {
            // Try to parse the reference
            const bibleRef = this.parser.parse(referenceString);
            
            if (!bibleRef) {
                console.error(`Failed to parse Bible reference: "${referenceString}"`);
                return `<div class="bible-reference-error">Invalid reference: ${referenceString}</div>`;
            }
            
            // Get the Bible content from the service
            const passage = await this.bibleContentService.getBibleContent(bibleRef.toString());
            
            if (!passage) {
                console.error(`Failed to get content for: "${referenceString}"`);
                return `<div class="bible-reference-error">Failed to load content for: ${referenceString}</div>`;
            }
            
            return this.renderPassage(passage);
        } catch (error) {
            console.error(`Error processing Bible reference "${referenceString}":`, error);
            return `<div class="bible-reference-error">Error processing reference: ${referenceString}</div>`;
        }
    }

    /**
     * Process an inline Bible reference and return the corresponding HTML
     */
    async processInlineReference(referenceString: string): Promise<string> {
        try {
            if (!this.settings.displayInlineVerses) {
                return `<span class="inline-bible-reference">${referenceString}</span>`;
            }
            
            // Try to parse the reference
            const bibleRef = this.parser.parse(referenceString);
            
            if (!bibleRef) {
                console.error(`Failed to parse inline Bible reference: "${referenceString}"`);
                return `<span class="inline-bible-reference-error">${referenceString}</span>`;
            }
            
            // Get the Bible content from the service
            const passage = await this.bibleContentService.getBibleContent(bibleRef.toString());
            
            if (!passage) {
                console.error(`Failed to get content for inline reference: "${referenceString}"`);
                return `<span class="inline-bible-reference-error">${referenceString}</span>`;
            }
            
            return this.renderInlinePassage(passage);
        } catch (error) {
            console.error(`Error processing inline Bible reference "${referenceString}":`, error);
            return `<span class="inline-bible-reference-error">${referenceString}</span>`;
        }
    }

    /**
     * Render a passage as a full block
     */
    private renderPassage(passage: BiblePassage): string {
        if (passage.missingToken) {
            return passage.htmlContent || '';
        }
        
        // Apply styling based on settings
        const fontSizeStyle = this.settings.bibleTextFontSize 
            ? `font-size: ${this.settings.bibleTextFontSize}%;` 
            : '';
        
        // Determine which CSS class to use based on the style preset
        let styleClass = 'bible-passage-default';
        if (this.settings.stylePreset === 'minimal') {
            styleClass = 'bible-passage-minimal';
        } else if (this.settings.stylePreset === 'elegant') {
            styleClass = 'bible-passage-elegant';
        } else if (this.settings.stylePreset === 'classic') {
            styleClass = 'bible-passage-classic';
        } else if (this.settings.stylePreset === 'modern') {
            styleClass = 'bible-passage-modern';
        }
        
        return `
            <div class="bible-passage ${styleClass}" style="${fontSizeStyle}">
                <div class="bible-passage-reference">${passage.reference}</div>
                <div class="bible-passage-content">${passage.htmlContent || ''}</div>
                <div class="bible-passage-footer">ESV</div>
            </div>
        `;
    }

    /**
     * Render a passage inline
     */
    private renderInlinePassage(passage: BiblePassage): string {
        if (passage.missingToken) {
            return `<span class="inline-bible-reference-error">${passage.reference}</span>`;
        }
        
        // Extract just the text, removing verse numbers if desired
        let content = passage.htmlContent || '';
        
        // Apply styling based on settings
        const fontSizeStyle = this.settings.bibleTextFontSize 
            ? `font-size: ${this.settings.bibleTextFontSize}%;` 
            : '';
        
        return `
            <span class="inline-bible-reference" style="${fontSizeStyle}">
                <span class="inline-bible-reference-text">${content}</span>
                <span class="inline-bible-reference-label">(${passage.reference}, ESV)</span>
            </span>
        `;
    }
} 