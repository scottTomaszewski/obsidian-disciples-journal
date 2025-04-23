import { App, MarkdownPostProcessorContext, MarkdownView, Notice } from "obsidian";
import { BibleContentService } from "../services/BibleContentService";
import { BibleNavigation } from "./BibleNavigation";
import { BibleFormatter } from "../utils/BibleFormatter";
import DisciplesJournalPlugin from "src/core/DisciplesJournalPlugin";
import { BibleReferenceParser } from '../core/BibleReferenceParser';
import { BibleEventHandlers } from "src/core/BibleEventHandlers";

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
    private app: App;
    private bibleNavigation: BibleNavigation;
    private downloadOnDemand: boolean = true;
    private plugin: DisciplesJournalPlugin;
    private parser: BibleReferenceParser;
    private settings: PluginSettings;
    
    constructor(
        app: App, 
        bibleContentService: BibleContentService, 
        fontSizeForVerses: string = '100%', 
        vaultPath: string = 'Bible/ESV',
        plugin: DisciplesJournalPlugin
    ) {
        this.app = app;
        this.bibleContentService = bibleContentService;
        this.plugin = plugin;
        this.bibleNavigation = new BibleNavigation(
            app, 
            bibleContentService,
            vaultPath, 
            this.downloadOnDemand
        );
        this.parser = new BibleReferenceParser();
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
        this.settings.bibleTextFontSize = fontSize;
    }
    
    /**
     * Set the vault path for Bible content
     */
    public setVaultPath(path: string): void {
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
    public formatChapterContent(passage: any): string {
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
                const referenceEl = element.doc.createElement('span');
                referenceEl.classList.add('bible-reference');
                referenceEl.textContent = codeText;

                referenceEl.addEventListener('mouseover', (e) => {
                    new BibleEventHandlers(this).handleBibleReferenceHover(e);
                });
                referenceEl.addEventListener('mouseout', (e) => {
                    new BibleEventHandlers(this).handleBibleReferenceMouseOut(e);
                });
                
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
        // TODO - this should be overlaoded with a form that takes the BibleReference
        const passage = await this.bibleContentService.getBibleContent(reference);
        
        if (passage) {
            const containerEl = el.doc.createElement('div');
            containerEl.classList.add('bible-passage-container');
        
            const parsedRef = this.parser.parse(reference);
            // TODO - this cant happen if getBibleContent passed...
            if (!parsedRef) {
                console.error("Failed to parse reference: " + reference);
                return;
            }
            if (parsedRef.isChapterReference() || this.plugin.settings.showNavigationForVerses) {
                this.bibleNavigation.createNavigationElements(containerEl, parsedRef);
            }
        
            // // Add navigation elements at the top of the passage
            // try {
            //     // Try to parse the reference
            //     const refParts = passage.reference.split(" ");
            //     if (refParts.length >= 2) {
            //         const book = refParts.slice(0, -1).join(" ");
            //         const chapter = parseInt(refParts[refParts.length - 1]);
            //         if (!isNaN(chapter)) {
            //             const parsedRef = new BibleReference(book, chapter);
                        
            //             // Check if the reference includes verses
            //             const hasVerses = passage.reference.includes(':');
                        
            //             // Only show navigation if it's a full chapter or if the setting is enabled
            //             if (!hasVerses || this.plugin.settings.showNavigationForVerses) {
            //                 this.bibleNavigation.createNavigationElements(containerEl, parsedRef);
            //             }
            //         }
            //     }
            // } catch (error) {
            //     console.error("Error adding navigation:", error);
            // }
            
            // Add reference heading
            const headingEl = el.doc.createElement('h3');
            headingEl.classList.add('bible-passage-heading');
            const referenceLink = headingEl.createEl('a', { text: passage.reference });
            referenceLink.onClickEvent(async () => {
                await this.bibleNavigation.navigateToChapter(parsedRef.book, parsedRef.chapter);
            });

            containerEl.appendChild(headingEl);
            
            // Add verses
            const passageEl = el.doc.createElement('div');
            passageEl.classList.add('bible-passage-text');
            
            // Check if we have HTML content
            if (passage.htmlContent) {
                // Use the HTML content directly
                passageEl.innerHTML = passage.htmlContent;
            } else {
                // Fallback to traditional verse rendering
                for (const verse of passage.verses) {
                    const verseEl = el.doc.createElement('p');
                    verseEl.classList.add('bible-verse');
                    
                    const verseNumEl = el.doc.createElement('span');
                    verseNumEl.classList.add('bible-verse-number');
                    verseNumEl.textContent = `${verse.verse} `;
                    
                    const verseTextEl = el.doc.createElement('span');
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
            const errorEl = el.doc.createElement('div');
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
        const versePreviewEl = element.doc.createElement('div');
        versePreviewEl.classList.add('bible-verse-preview');
        
        // Add reference heading (make it clickable)
        const headingEl = element.doc.createElement('div');
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
                const previewPoppers = element.doc.querySelectorAll('.bible-verse-preview');
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
        const contentEl = element.doc.createElement('div');
        contentEl.classList.add('bible-verse-preview-content');
        
        // Check if we have HTML content
        if (passage.htmlContent) {
            // Use the HTML content directly, but try to extract just the portion we need
            // for the preview (to avoid showing footnotes, chapter headings, etc.)
            try {
                // Create a temporary element to parse the HTML
                const tempEl = element.doc.createElement('div');
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
                const verseEl = element.doc.createElement('p');
                
                if (passage.verses.length > 1) {
                    const verseNumEl = element.doc.createElement('span');
                    verseNumEl.classList.add('bible-verse-number');
                    verseNumEl.textContent = `${verse.verse} `;
                    verseEl.appendChild(verseNumEl);
                }
                
                const verseTextEl = element.doc.createElement('span');
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
        versePreviewEl.style.left = `${rect.left}px`;
        versePreviewEl.style.top = `${rect.bottom - 3}px`;
        
        // Add popup to document
        element.doc.body.appendChild(versePreviewEl);
        
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
    async processReference(referenceString: string): Promise<string> {
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
            <div class="bible-passage ${styleClass}">
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
        
        let content = passage.htmlContent || '';
        
        return `
            <span class="inline-bible-reference">
                <span class="inline-bible-reference-text">${content}</span>
                <span class="inline-bible-reference-label">(${passage.reference}, ESV)</span>
            </span>
        `;
    }
} 