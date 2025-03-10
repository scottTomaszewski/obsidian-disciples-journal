import { App, Plugin, MarkdownPostProcessorContext, MarkdownView, HoverParent, debounce, Workspace, MarkdownRenderer, TFile } from 'obsidian';
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
        this.bibleContentService.setUseHtmlFormat(true);
        this.bibleContentService.setDownloadOnDemand(this.settings.downloadOnDemand);
        
        // Initialize components
        this.bibleStyles = new BibleStyles(this.app);
        this.bibleReferenceRenderer = new BibleReferenceRenderer(
            this.app,
            this.bibleContentService,
            this.bookNameService,
            this.settings.fontSizeForVerses,
            this.settings.bibleContentVaultPath
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
        
        console.log('Disciples Journal plugin loaded');
    }
    
    onunload() {
        console.log('Unloading Disciples Journal plugin');
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
        this.bibleContentService.setDownloadOnDemand(this.settings.downloadOnDemand);
        this.bibleReferenceRenderer.setDownloadOnDemand(this.settings.downloadOnDemand);
    }
    
    /**
     * Load the Bible data from source
     */
    async loadBibleData() {
        try {
            await this.bibleContentService.loadBible(null);
            console.log('Bible data loaded successfully');
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
     * Handle clicks on Bible references
     */
    async handleBibleReferenceClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target || !target.closest) return;
        
        const referenceEl = target.closest('.bible-reference') as HTMLElement;
        if (!referenceEl) return;
        
        const referenceText = referenceEl.textContent;
        if (!referenceText) return;
        
        try {
            // Parse the reference
            const reference = this.bibleReferenceParser.parse(referenceText);
            if (!reference) return;
            
            // Get the chapter reference (without verse)
            const chapterRef = reference.getChapterReference();
            
            // Open the chapter
            await this.openChapterNote(chapterRef.toString());
            
            // If there's a specific verse, scroll to it
            if (reference.verse) {
                setTimeout(() => {
                    this.bibleReferenceRenderer.scrollToVerse(reference.verse!);
                }, 300); // Give it a moment to load
            }
        } catch (error) {
            console.error('Error handling Bible reference click:', error);
        }
    }
    
    /**
     * Handle hover on Bible references
     */
    async handleBibleReferenceHover(event: MouseEvent) {
        // Clean up any existing poppers
        this.removePreviewPopper();
        
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
        } catch (error) {
            console.error('Error showing Bible reference preview:', error);
        }
    }
    
    /**
     * Handle mouse out from Bible references
     */
    handleBibleReferenceMouseOut(event: MouseEvent) {
        // Check if we're still within the preview
        const relatedTarget = event.relatedTarget as HTMLElement;
        if (relatedTarget && this.previewPopper && this.previewPopper.contains(relatedTarget)) {
            return;
        }
        
        // Check if we're moving to the preview from the reference
        if (relatedTarget && relatedTarget.classList.contains('bible-verse-preview')) {
            return;
        }
        
        this.removePreviewPopper();
    }
    
    /**
     * Remove the preview popper if it exists
     */
    removePreviewPopper() {
        if (this.previewPopper) {
            this.previewPopper.remove();
            this.previewPopper = null;
        }
    }
    
    /**
     * Open or create a chapter note
     */
    async openChapterNote(reference: string) {
        try {
            // Parse the reference string to ensure it's valid
            const parsedRef = this.bibleReferenceParser.parse(reference);
            if (!parsedRef) {
                console.error(`Invalid reference: ${reference}`);
                return;
            }
            
            // Get content path
            const contentPath = this.settings.bibleContentVaultPath;
            const chapterPath = `${contentPath}/${parsedRef.book}/${parsedRef.book} ${parsedRef.chapter}.md`;
            
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
            
            // Save the content to a note
            const contentPath = this.settings.bibleContentVaultPath;
            const bookPath = `${contentPath}/${reference.book}`;
            const chapterPath = BibleFormatter.buildChapterPath(contentPath, reference.book, reference.chapter);
            
            // Create directory if needed
            await this.app.vault.adapter.mkdir(bookPath);
            
            // Only create the file if it doesn't exist
            const exists = await this.app.vault.adapter.exists(chapterPath);
            if (!exists) {
                await this.app.vault.create(chapterPath, content);
                console.log(`Created chapter note: ${chapterPath}`);
            }
            
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
        this.bibleReferenceRenderer.setVaultPath(path);
    }
    
    /**
     * Set whether to download Bible content on demand
     */
    public setDownloadOnDemand(value: boolean): void {
        this.bibleContentService.setDownloadOnDemand(value);
    }
} 