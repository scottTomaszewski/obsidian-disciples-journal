import { App, MarkdownPostProcessorContext, MarkdownView, TFile } from "obsidian";
import { BibleContentService } from "../services/BibleContentService";
import { BibleReference } from "../core/BibleReference";
import { BibleNavigation } from "./BibleNavigation";
import { BookNameService } from "../services/BookNameService";
import { BibleFormatter } from "../utils/BibleFormatter";

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
    
    constructor(app: App, bibleContentService: BibleContentService, bookNameService: BookNameService, fontSizeForVerses: string = '100%', vaultPath: string = 'Bible/ESV') {
        this.app = app;
        this.bibleContentService = bibleContentService;
        this.fontSizeForVerses = fontSizeForVerses;
        this.vaultPath = vaultPath;
        this.bibleNavigation = new BibleNavigation(
            app, 
            bookNameService, 
            bibleContentService,
            vaultPath, 
            this.downloadOnDemand
        );
    }
    
    /**
     * Set the font size for displayed verses
     */
    public setFontSize(fontSize: string): void {
        this.fontSizeForVerses = fontSize;
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
            if (codeBlock.parentElement?.tagName === 'PRE') continue;
            
            const codeText = codeBlock.textContent?.trim();
            if (!codeText) continue;
            
            try {
                // Try to parse as Bible reference
                const reference = await this.bibleContentService.getBibleContent(codeText);
                if (!reference) continue;
                
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
            
            // Skipping this for now since the ESV API appends its own copyright notice
            // // Add collapsible copyright notice
            // const copyrightContainer = document.createElement('div');
            // copyrightContainer.classList.add('bible-copyright-container');
            // copyrightContainer.innerHTML = BibleFormatter.getCopyrightNoticeHTML();
            // containerEl.appendChild(copyrightContainer);
            
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
        
        // Add reference heading
        const headingEl = document.createElement('div');
        headingEl.classList.add('bible-verse-preview-heading');
        headingEl.textContent = passage.reference;
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
        versePreviewEl.style.position = 'absolute';
        versePreviewEl.style.left = `${rect.left}px`;
        versePreviewEl.style.top = `${rect.bottom + 10}px`;
        versePreviewEl.style.zIndex = '1000';
        
        // Add to document
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
} 