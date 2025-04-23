import { Plugin, MarkdownView, Notice } from 'obsidian';
import { ESVApiService } from '../services/ESVApiService';
import { BibleContentService } from '../services/BibleContentService';
import { BibleReferenceParser } from './BibleReferenceParser';
import { BibleReferenceRenderer } from '../components/BibleReferenceRenderer';
import { BibleStyles } from '../components/BibleStyles';
import { DisciplesJournalSettings, DEFAULT_SETTINGS, DisciplesJournalSettingsTab } from '../settings/DisciplesJournalSettings';
import { NoteCreationService } from 'src/services/NoteCreationService';
import { BibleMarkupProcessor } from './BibleMarkupProcessor';

/**
 * Disciples Journal Plugin for Obsidian
 * Enhances Bible references with hover previews and in-note embedding
 */
export default class DisciplesJournalPlugin extends Plugin {
    settings: DisciplesJournalSettings;
    
    // Services
    private esvApiService: ESVApiService;
    private bibleContentService: BibleContentService;
    private noteCreationService: NoteCreationService;
    
    // Components
    private bibleStyles: BibleStyles;
    private bibleReferenceRenderer: BibleReferenceRenderer;
    private bibleReferenceParser: BibleReferenceParser;
    private bibleMarkupProcessor: BibleMarkupProcessor;
    
    async onload() {
        console.log('Loading Disciples Journal plugin');
        
        // Initialize settings
        await this.loadSettings();
        
        // Initialize services
        this.esvApiService = new ESVApiService(this.app);
        this.bibleContentService = new BibleContentService(this.esvApiService);
        
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
        this.bibleReferenceParser = new BibleReferenceParser();
        this.bibleStyles = new BibleStyles();
        this.bibleReferenceRenderer = new BibleReferenceRenderer(
            this.app, 
            this.bibleContentService, 
            this.settings.bibleTextFontSize,
            this.settings.bibleContentVaultPath,
            this
        );
        
        this.noteCreationService = new NoteCreationService(
            this.app,
            this.bibleContentService,
            this.bibleReferenceParser,
            this.settings
        );
        
        // Initialize markup processor
        this.bibleMarkupProcessor = new BibleMarkupProcessor(this.bibleReferenceRenderer, this.settings);
        
        // Register bible reference processor
        this.registerMarkdownCodeBlockProcessor('bible', this.bibleMarkupProcessor.processBibleCodeBlock.bind(this.bibleMarkupProcessor));
        
        // Register markdown post processor for inline references
        this.registerMarkdownPostProcessor(this.bibleMarkupProcessor.processInlineBibleReferences.bind(this.bibleMarkupProcessor));
        
        // Register settings tab
        this.addSettingTab(new DisciplesJournalSettingsTab(this.app, this));
        
        // Register active leaf change to update styles
        this.registerEvent(this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this)));
        
        // Load Bible data
        this.loadBibleData();
    }
    
    onunload() {
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update services with new settings
        this.esvApiService.setApiToken(this.settings.esvApiToken);
        this.esvApiService.setContentPath(this.settings.bibleContentVaultPath);
        this.esvApiService.setBibleVersion(this.settings.preferredBibleVersion);
        this.bibleReferenceRenderer.setVaultPath(this.settings.bibleContentVaultPath);
        this.bibleReferenceRenderer.setFontSize(this.settings.bibleTextFontSize);
        this.bibleReferenceRenderer.setDownloadOnDemand(this.settings.downloadOnDemand);
        this.bibleContentService.setDownloadOnDemand(this.settings.downloadOnDemand);
    }
    
    /**
     * Load the Bible data from source
     */
    async loadBibleData() {
        try {
            console.log('Loading Bible data...');
            await this.esvApiService.ensureBibleData();
            console.log('Bible data loaded successfully');
        } catch (error) {
            console.error('Error loading Bible data:', error);
        }
    }
    
    /**
     * Handle leaf change event to check for verse references in the URL
     */
    handleActiveLeafChange() {
        // Refresh theme/styling when active leaf changes
        this.updateBibleStyles();
    }
    
    /**
     * Update Bible styles with current settings
     */
    public updateBibleStyles(): void {
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) return;
        
        // Each popup window has a unique document, so we need to apply styles to each one
        // See https://discord.com/channels/686053708261228577/840286264964022302/1362059117190975519
        // Note: this doesnt completely work.  When a new popout is created the style cars arent ported over
        const docList: Document[] = [];
        this.app.workspace.iterateAllLeaves(leaf => docList.push(leaf.getContainer().doc));
        docList.unique().forEach(doc => {
            const isDarkMode = activeLeaf.containerEl.doc.body.classList.contains('theme-dark');
            const theme = isDarkMode ? 'dark' : 'light';
            this.bibleStyles.applyStyles(
                doc,
                theme, 
                this.settings.stylePreset, 
                this.settings.bibleTextFontSize,
                {
                    wordsOfChristColor: this.settings.wordsOfChristColor,
                    verseNumberColor: this.settings.verseNumberColor,
                    headingColor: this.settings.headingColor,
                    blockIndentation: this.settings.blockIndentation
                }
            );
        });
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
        this.settings.bibleContentVaultPath = path;
        this.esvApiService.setContentPath(path);
        this.bibleReferenceRenderer.setVaultPath(path);
    }
    
    /**
     * Set the preferred Bible version
     */
    public setBibleVersion(version: string): void {
        this.settings.preferredBibleVersion = version;
        this.esvApiService.setBibleVersion(version);
    }
    
    /**
     * Set whether to download Bible content on demand
     */
    public setDownloadOnDemand(value: boolean): void {
        this.bibleContentService.setDownloadOnDemand(value);
        this.bibleReferenceRenderer.setDownloadOnDemand(value);
    }
    
    /**
     * Open or create a chapter note (Public method for external access)
     */
    public async openChapterNote(reference: string) {
        return this.noteCreationService.openChapterNote(reference);
    }
} 