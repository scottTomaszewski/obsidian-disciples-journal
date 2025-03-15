import { App, Plugin, MarkdownPostProcessorContext, MarkdownView, HoverParent, debounce, Workspace, MarkdownRenderer, TFile, Notice } from 'obsidian';
import { BookNameService } from '../services/BookNameService';
import { ESVApiService } from '../services/ESVApiService';
import { BibleContentService } from '../services/BibleContentService';
import { BibleReferenceParser } from './BibleReferenceParser';
import { BibleReference } from './BibleReference';
import { BibleReferenceRenderer } from '../components/BibleReferenceRenderer';
import { BibleStyles } from '../components/BibleStyles';
import { DisciplesJournalSettings, DEFAULT_SETTINGS, DisciplesJournalSettingsTab } from '../settings/DisciplesJournalSettings';
import { BibleFormatter } from "../utils/BibleFormatter";

/**
 * Disciples Journal Plugin for Obsidian
 * Enhances Bible references with hover previews and in-note embedding
 */
export default class DisciplesJournalPlugin extends Plugin {
    settings: DisciplesJournalSettings;
    
    // Services
    private bookNameService: BookNameService;
    private esvApiService: ESVApiService;
    private bibleContentService: BibleContentService;
    
    // Components
    private bibleStyles: BibleStyles;
    private bibleReferenceRenderer: BibleReferenceRenderer;
    private bibleReferenceParser: BibleReferenceParser;
    
    // State
    private markdownPostProcessor: any;
    private bibleCodeBlockProcessor: any;
    private previewPopper: HTMLElement | null = null;
    
    async onload() {
        console.log('Loading Disciples Journal plugin');
        
        // Initialize settings
        await this.loadSettings();
        
        // Initialize services
        this.bookNameService = new BookNameService();
        this.esvApiService = new ESVApiService(this.app, this.bookNameService);
        this.bibleContentService = new BibleContentService(this.bookNameService, this.esvApiService);
        
        // Configure services from settings
        this.esvApiService.setApiToken(this.settings.esvApiToken);
        this.esvApiService.setContentPath(this.settings.bibleContentVaultPath);
        this.esvApiService.setBibleVersion(this.settings.preferredBibleVersion);
        this.bibleContentService.setUseHtmlFormat(true);
        this.bibleContentService.setDownloadOnDemand(this.settings.downloadOnDemand);
        
        // Check if ESV API token is set and show a notice if it's not
        if (!this.settings.esvApiToken) {
            new Notice('Disciples Journal: ESV API token not set. Bible content may not load correctly. Visit the plugin settings to add your API token.', 10000);
        }
        
        // Initialize components
        this.bibleStyles = new BibleStyles(this.app);
        
        // Create the full path with version for the renderer
        const fullContentPath = `${this.settings.bibleContentVaultPath}/${this.settings.preferredBibleVersion}`;
        
        this.bibleReferenceRenderer = new BibleReferenceRenderer(
            this.app,
            this.bibleContentService,
            this.bookNameService,
            this.settings.fontSizeForVerses,
            fullContentPath,
            this
        );
        this.bibleReferenceRenderer.setDownloadOnDemand(this.settings.downloadOnDemand);
        this.bibleReferenceParser = new BibleReferenceParser(this.bookNameService);
        
        // Load Bible data
        this.loadBibleData();
        
        // Add UI settings tab
        this.addSettingTab(new DisciplesJournalSettingsTab(this.app, this as any));
        
        // Register styles
        this.bibleStyles.addStyles({
            fontSize: this.settings.fontSizeForVerses,
            wordsOfChristColor: this.settings.wordsOfChristColor,
            verseNumberColor: this.settings.verseNumberColor,
            headingColor: this.settings.headingColor,
            blockIndentation: this.settings.blockIndentation
        });
        
        // Register Bible code block processor
        this.bibleCodeBlockProcessor = this.registerMarkdownCodeBlockProcessor(
            'bible', 
            this.processBibleCodeBlock.bind(this)
        );
        
        // Register markdown post processor for inline Bible references
        this.markdownPostProcessor = this.registerMarkdownPostProcessor(
            this.processInlineBibleReferences.bind(this)
        );
        
        // Register click event for Bible references
        this.registerDomEvent(document, 'click', this.handleBibleReferenceClick.bind(this));
        
        // Register hover event for Bible references
        this.registerDomEvent(document, 'mouseover', debounce(this.handleBibleReferenceHover.bind(this), 300));
        this.registerDomEvent(document, 'mouseout', this.handleBibleReferenceMouseOut.bind(this));
        
        // Register DOM events for navigation to specific verses
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this))
        );
    }
    
    onunload() {
        this.bibleStyles.removeStyles();
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update components with new settings
        this.updateBibleStyles();
        this.bibleReferenceRenderer.setFontSize(this.settings.fontSizeForVerses);
        this.bibleReferenceRenderer.setVaultPath(this.settings.bibleContentVaultPath);
        
        // Update services with new settings
        this.esvApiService.setApiToken(this.settings.esvApiToken);
        this.esvApiService.setContentPath(this.settings.bibleContentVaultPath);
        this.esvApiService.setBibleVersion(this.settings.preferredBibleVersion);
        this.bibleContentService.setDownloadOnDemand(this.settings.downloadOnDemand);
        this.bibleReferenceRenderer.setDownloadOnDemand(this.settings.downloadOnDemand);
    }
    
    /**
     * Load the Bible data from source
     */
    async loadBibleData() {
        try {
            // Load Bible data from the appropriate version directory in the vault
            await this.esvApiService.loadBibleChaptersFromVault();
        } catch (error) {
            console.error('Failed to load Bible data:', error);
        }
    }
    
    /**
     * Process Bible code blocks
     */
    async processBibleCodeBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        if (!this.settings.displayFullPassages) return;
        
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
        if (!this.settings.displayInlineVerses) return;
        
        try {
            await this.bibleReferenceRenderer.processInlineCodeBlocks(el, ctx);
        } catch (error) {
            console.error('Error processing inline Bible references:', error);
        }
    }
    
    /**
     * Handle click on Bible references
     * Now only displays the preview without opening the chapter note
     */
    async handleBibleReferenceClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target || !target.closest) return;
        
        const referenceEl = target.closest('.bible-reference') as HTMLElement;
        if (!referenceEl) return;
        
        // If this is from the popup's clickable heading, allow the click handler there to process
        if (referenceEl.classList.contains('bible-reference-clickable')) {
            return;
        }
        
        const referenceText = referenceEl.textContent;
        if (!referenceText) return;
        
        try {
            // Just show the preview if it's not already showing
            if (!this.previewPopper) {
                this.previewPopper = await this.bibleReferenceRenderer.showVersePreview(
                    referenceEl, 
                    referenceText,
                    event
                );
            }
        } catch (error) {
            console.error('Error handling Bible reference click:', error);
        }
    }
    
    /**
     * Handle hover on Bible references
     */
    async handleBibleReferenceHover(event: MouseEvent) {
        // Don't create new preview if we already have one active
        if (this.previewPopper) return;
        
        const target = event.target as HTMLElement;
        if (!target || !target.closest) return;
        
        const referenceEl = target.closest('.bible-reference') as HTMLElement;
        if (!referenceEl) return;
        
        const referenceText = referenceEl.textContent;
        if (!referenceText) return;
        
        try {
            // Create new preview
            this.previewPopper = await this.bibleReferenceRenderer.showVersePreview(
                referenceEl, 
                referenceText,
                event
            );
            
            // Add event listeners directly to the preview for better control
            if (this.previewPopper) {
                // When mouse enters the popup, mark it as locked
                this.previewPopper.addEventListener('mouseenter', () => {
                    this.previewPopper?.classList.add('popup-locked');
                });
                
                // When mouse leaves the popup, check if we should close it
                this.previewPopper.addEventListener('mouseleave', (e) => {
                    // Only close if not moving to the reference or another part of the popup
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (relatedTarget && 
                        !relatedTarget.classList.contains('bible-reference') && 
                        !relatedTarget.closest('.bible-verse-preview')) {
                        this.previewPopper?.classList.remove('popup-locked');
                        this.removePreviewPopper();
                    }
                });
            }
            
            // Also add listeners to the reference element
            referenceEl.addEventListener('mouseleave', (e) => {
                // Don't close if the popup is locked (being hovered) or we're moving to the popup
                if (this.previewPopper) {
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    
                    // If moving to the popup or if popup is locked, don't close
                    if (relatedTarget && 
                        (relatedTarget.classList.contains('bible-verse-preview') || 
                         relatedTarget.closest('.bible-verse-preview') ||
                         this.previewPopper.classList.contains('popup-locked'))) {
                        return;
                    }
                    
                    // Add a 100ms delay before closing to allow for cursor movement
                    setTimeout(() => {
                        // If locked during this delay, don't close
                        if (!this.previewPopper || this.previewPopper.classList.contains('popup-locked')) {
                            return;
                        }
                        this.removePreviewPopper();
                    }, 100);
                }
            });
        } catch (error) {
            console.error('Error showing Bible reference preview:', error);
        }
    }
    
    /**
     * Handle mouse out from Bible references (this is now a simpler fallback)
     */
    handleBibleReferenceMouseOut(event: MouseEvent) {
        // This is now a simplified fallback that will rarely be used
        // Most closings are handled by the direct event listeners added above
        
        // If we don't have a popup, nothing to do
        if (!this.previewPopper) return;
        
        // If the popup is locked (being hovered), don't close it
        if (this.previewPopper.classList.contains('popup-locked')) {
            return;
        }
        
        const target = event.target as HTMLElement;
        const relatedTarget = event.relatedTarget as HTMLElement;
        
        // If either target is missing, can't make a good decision
        if (!target || !relatedTarget) return;
        
        // If moving to/from the popup or reference, don't close
        if (target.classList.contains('bible-reference') || 
            target.classList.contains('bible-verse-preview') ||
            target.closest('.bible-verse-preview') ||
            relatedTarget.classList.contains('bible-reference') ||
            relatedTarget.classList.contains('bible-verse-preview') ||
            relatedTarget.closest('.bible-verse-preview')) {
            return;
        }
        
        // In all other cases, remove the popup
        this.removePreviewPopper();
    }
    
    /**
     * Remove the preview popper if it exists
     */
    removePreviewPopper() {
        if (this.previewPopper) {
            // Remove any hover gap elements
            const hoverGaps = document.querySelectorAll('.bible-hover-gap');
            hoverGaps.forEach(gap => gap.remove());
            
            this.previewPopper.remove();
            this.previewPopper = null;
        }
    }
    
    /**
     * Get the full path with version
     */
    private getFullContentPath(): string {
        return `${this.settings.bibleContentVaultPath}/${this.settings.preferredBibleVersion}`;
    }

    /**
     * Open or create a chapter note (Public method for external access)
     */
    public async openChapterNote(reference: string) {
        try {
            // Parse the reference string to ensure it's valid
            const parsedRef = this.bibleReferenceParser.parse(reference);
            if (!parsedRef) {
                console.error(`Invalid reference: ${reference}`);
                return;
            }
            
            // Get full content path including version
            const fullPath = this.getFullContentPath();
            const chapterPath = `${fullPath}/${parsedRef.book}/${parsedRef.book} ${parsedRef.chapter}.md`;
            
            // Check if note exists
            const fileExists = await this.app.vault.adapter.exists(chapterPath);
            
            if (!fileExists && this.settings.downloadOnDemand) {
                // Create the note with content from the ESV API
                await this.createChapterNote(parsedRef);
            }
            
            // Try opening the note
            const file = this.app.vault.getAbstractFileByPath(chapterPath) as TFile;
            if (file) {
                const leaf = this.app.workspace.getUnpinnedLeaf();
                await leaf.openFile(file);
                
                // If there's a specific verse, scroll to it
                if (parsedRef.verse) {
                    setTimeout(() => {
                        this.bibleReferenceRenderer.scrollToVerse(parsedRef.verse!);
                    }, 300); // Give it a moment to load
                }
            } else {
                console.error(`Could not find or create the chapter note: ${chapterPath}`);
            }
        } catch (error) {
            console.error('Error opening chapter note:', error);
        }
    }
    
    /**
     * Create a new chapter note
     */
    async createChapterNote(reference: BibleReference) {
        try {
            // Create a properly formatted reference string
            const referenceStr = reference.toString();
            
            // Get the content from the ESV API and format it for a note
            const passage = await this.bibleContentService.getBibleContent(referenceStr);
            
            // Check if passage is null
            if (!passage) {
                console.error(`Failed to get Bible content for ${referenceStr}`);
                throw new Error(`Failed to get Bible content for ${referenceStr}`);
            }
            
            // Use the formatter utility to format the content
            const content = BibleFormatter.formatChapterContent(passage);
            
            // Save the content to a note with the version path
            const fullPath = this.getFullContentPath();
            const bookPath = `${fullPath}/${reference.book}`;
            const chapterPath = `${fullPath}/${reference.book}/${reference.book} ${reference.chapter}.md`;
            
            // Ensure the directory exists
            await this.app.vault.adapter.mkdir(bookPath);
            
            // Create the note
            await this.app.vault.create(chapterPath, content);
            
            return chapterPath;
        } catch (error) {
            console.error('Error creating chapter note:', error);
            throw error;
        }
    }
    
    /**
     * Handle leaf change event to check for verse references in the URL
     */
    handleActiveLeafChange() {
        // Get the active leaf
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;
        
        // Check if the URL has a verse parameter
        const url = new URL(window.location.href);
        const verseParam = url.searchParams.get('verse');
        
        if (verseParam) {
            // Convert to number and scroll to verse
            const verse = parseInt(verseParam);
            if (!isNaN(verse)) {
                setTimeout(() => {
                    this.bibleReferenceRenderer.scrollToVerse(verse);
                }, 300); // Give it a moment to load
            }
        }
    }
    
    /**
     * Update Bible styles with current settings
     */
    public updateBibleStyles(): void {
        this.bibleStyles.updateStyles({
            fontSize: this.settings.fontSizeForVerses,
            wordsOfChristColor: this.settings.wordsOfChristColor,
            verseNumberColor: this.settings.verseNumberColor,
            headingColor: this.settings.headingColor,
            blockIndentation: this.settings.blockIndentation
        });
        this.bibleReferenceRenderer.setFontSize(this.settings.fontSizeForVerses);
    }
    
    /**
     * Update font size for Bible verses (legacy method for compatibility)
     */
    public updateFontSize(fontSize: string): void {
        this.settings.fontSizeForVerses = fontSize;
        this.updateBibleStyles();
    }
    
    /**
     * Set the API token for the ESV API
     */
    public setESVApiToken(token: string): void {
        this.esvApiService.setApiToken(token);
    }
    
    /**
     * Set the content path for Bible files
     */
    public setContentPath(path: string): void {
        this.esvApiService.setContentPath(path);
        // Pass the full path with version to the renderer for now
        // This maintains backwards compatibility
        const fullPath = `${path}/${this.settings.preferredBibleVersion}`;
        this.bibleReferenceRenderer.setVaultPath(fullPath);
    }
    
    /**
     * Set the preferred Bible version
     */
    public setBibleVersion(version: string): void {
        this.esvApiService.setBibleVersion(version);
        // Update the renderer's path to include the version
        const fullPath = `${this.settings.bibleContentVaultPath}/${version}`;
        this.bibleReferenceRenderer.setVaultPath(fullPath);
    }
    
    /**
     * Set whether to download Bible content on demand
     */
    public setDownloadOnDemand(value: boolean): void {
        this.bibleContentService.setDownloadOnDemand(value);
    }
} 