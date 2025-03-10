import { App, MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting, TFile, MarkdownView, Notice, requestUrl } from 'obsidian';
import { BibleService } from './src/services/BibleService';
import { BibleReferenceParser } from './src/utils/BibleReferenceParser';
import { BiblePassage } from './src/models/BibleReference';

// Import the Bible data
// We'll try different approaches to ensure it loads properly
let ESV: any = null;
try {
    // Approach 1: Direct import (works if ESV.json is properly bundled)
    // @ts-ignore
    ESV = require('./src/ESV.json');
} catch (e) {
    console.error("Failed to load ESV.json using require:", e);
    // The actual file loading will be handled in the plugin's onload method
}

interface DisciplesJournalSettings {
    displayInlineVerses: boolean;
    displayFullPassages: boolean;
    fontSizeForVerses: string;
    preferredBibleVersion: string;
    esvApiToken: string;
    downloadOnDemand: boolean;
    bibleContentVaultPath: string;
}

const DEFAULT_SETTINGS: DisciplesJournalSettings = {
    displayInlineVerses: true,
    displayFullPassages: true,
    fontSizeForVerses: '100%',
    preferredBibleVersion: 'ESV',
    esvApiToken: '',
    downloadOnDemand: true,
    bibleContentVaultPath: 'Bible/ESV'
};

export default class DisciplesJournalPlugin extends Plugin {
    settings: DisciplesJournalSettings;
    bibleService: BibleService;
    bibleDataLoaded: boolean = false;
    loadingNotice: Notice | null = null;

    async onload() {
        console.log("Loading Disciples Journal plugin...");
        await this.loadSettings();
        
        // Initialize Bible service
        this.bibleService = new BibleService(this.app);
        this.bibleService.setESVApiToken(this.settings.esvApiToken);
        this.bibleService.setDownloadOnDemand(this.settings.downloadOnDemand);
        this.bibleService.setBibleContentVaultPath(this.settings.bibleContentVaultPath);
        
        // Show loading notice
        this.loadingNotice = new Notice("Loading Bible data...", 0);
        
        // Try to load the Bible data
        try {
            await this.loadBibleData();
            
            // Register Markdown post processor for inline code (e.g., `Genesis 1:1`)
            this.registerMarkdownPostProcessor(async (element, context) => {
                await this.processInlineCodeBlocks(element, context);
            });

            // Register Markdown code block processor for multiline passages (e.g., ```bible Genesis 1:1-10 ```)
            this.registerMarkdownCodeBlockProcessor('bible', async (source, el, ctx) => {
                await this.processFullBiblePassage(source, el, ctx);
            });

            // Register event handlers
            this.registerEvent(
                this.app.workspace.on('layout-change', () => {
                    // Reprocess any open files if Bible data was loaded after they were opened
                    if (this.bibleDataLoaded) {
                        this.app.workspace.iterateAllLeaves((leaf) => {
                            const view = leaf.view;
                            if (view instanceof MarkdownView) {
                                view.previewMode.rerender(true);
                            }
                        });
                    }
                })
            );

            // Add settings tab
            this.addSettingTab(new DisciplesJournalSettingsTab(this.app, this));
            
            // Clear the loading notice and show success
            if (this.loadingNotice) {
                this.loadingNotice.hide();
                this.loadingNotice = null;
            }
            new Notice('Disciples Journal Bible plugin loaded successfully!', 3000);
            
        } catch (error) {
            console.error("Failed to initialize Bible service:", error);
            
            // Clear the loading notice and show error
            if (this.loadingNotice) {
                this.loadingNotice.hide();
                this.loadingNotice = null;
            }
            new Notice("Failed to load Bible data. Please check the console for details.", 5000);
            
            // Still register the settings tab so the user can change settings
            this.addSettingTab(new DisciplesJournalSettingsTab(this.app, this));
        }
    }
    
    /**
     * Load the Bible data from various possible sources
     */
    public async loadBibleData(): Promise<void> {
        try {
            // Try approach 1: Check for ESV JSON files in the data directory
            console.log("Checking for ESV chapter JSON files...");
            const esv = await this.loadESVChapterFiles();
            if (esv) {
                this.bibleService.loadBible(esv);
                this.bibleDataLoaded = true;
                
                if (this.loadingNotice) {
                    this.loadingNotice.hide();
                    this.loadingNotice = null;
                }
                return;
            }
            
            // Try approach 2: Use the legacy data from require if available
            if (ESV) {
                console.log("Loading Bible data from require (memory)");
                this.bibleService.loadBible(ESV);
                this.bibleDataLoaded = true;
                
                if (this.loadingNotice) {
                    this.loadingNotice.hide();
                    this.loadingNotice = null;
                }
                return;
            }
            
            console.log("Attempting to load legacy Bible data from file...");
            // Try approach 3: Load from multiple possible file locations
            await this.tryLoadingBibleData();
            
        } catch (error) {
            console.error("All Bible data loading methods failed:", error);
            this.bibleDataLoaded = false;
            
            if (this.loadingNotice) {
                this.loadingNotice.hide();
                this.loadingNotice = null;
            }
            
            new Notice("Error loading Bible data. Please check the console for details.", 5000);
            throw new Error("Could not load Bible data from any source");
        }
    }
    
    /**
     * Load ESV chapter files from the data directory
     */
    private async loadESVChapterFiles(): Promise<object | null> {
        try {
            const adapter = this.app.vault.adapter;
            const pluginDir = this.manifest.dir || '';
            
            // Check for the data directory
            const dataDir = `${pluginDir}/src/data/esv`;
            
            // Check if the directory exists
            if (!(await adapter.exists(dataDir))) {
                console.log(`ESV data directory not found: ${dataDir}`);
                return null;
            }
            
            // Read the directory to get all JSON files
            const files = await adapter.list(dataDir);
            
            if (!files || !files.files || files.files.length === 0) {
                console.log("No JSON files found in ESV data directory");
                return null;
            }
            
            // Filter for JSON files
            const jsonFiles = files.files.filter(f => f.endsWith('.json'));
            if (jsonFiles.length === 0) {
                console.log("No JSON files found in ESV data directory");
                return null;
            }
            
            console.log(`Found ${jsonFiles.length} ESV chapter JSON files`);
            
            // Load each file and combine them
            const chapterData: Record<string, any> = {};
            let loadedCount = 0;
            
            for (const filePath of jsonFiles) {
                try {
                    const fileContent = await adapter.read(filePath);
                    const fileData = JSON.parse(fileContent);
                    
                    // Extract the reference from the file name
                    const fileName = filePath.split('/').pop() || '';
                    const reference = fileName.replace('.json', '');
                    
                    // Store with the canonical reference as the key
                    chapterData[reference] = fileData;
                    loadedCount++;
                    
                } catch (e) {
                    console.error(`Failed to load or parse ${filePath}:`, e);
                }
            }
            
            console.log(`Successfully loaded ${loadedCount} ESV chapter files`);
            
            if (loadedCount > 0) {
                return chapterData;
            }
            
            return null;
        } catch (error) {
            console.error("Error loading ESV chapter files:", error);
            return null;
        }
    }
    
    /**
     * Try loading legacy Bible data from various sources
     */
    private async tryLoadingBibleData(): Promise<void> {
        const pluginDir = this.manifest.dir;
        const possiblePaths = [
            `${pluginDir}/src/ESV.json`,
            './src/ESV.json',
            '../../disciples-journal-vault/ESV.json', // Check the vault root
            '../ESV.json',
        ];
        
        let lastError: Error | null = null;
        
        // Try each path in order
        for (const path of possiblePaths) {
            try {
                console.log(`Attempting to load ESV.json from: ${path}`);
                
                // Try using requestUrl from Obsidian API
                const response = await requestUrl({
                    url: path,
                    method: 'GET',
                });
                
                if (response.status === 200 && response.json) {
                    console.log(`ESV.json loaded successfully from ${path}`);
                    this.bibleService.loadBible(response.json);
                    this.bibleDataLoaded = true;
                    return;
                }
            } catch (error) {
                console.log(`Failed to load from ${path}:`, error);
                lastError = error as Error;
                // Continue to the next path
            }
        }
        
        // If we got here, all attempts failed
        if (lastError) {
            throw new Error(`Failed to load Bible data: ${lastError.message}`);
        } else {
            throw new Error('Failed to load Bible data from any location');
        }
    }

    /**
     * Process inline code blocks for Bible references
     */
    private async processInlineCodeBlocks(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
        if (!this.settings.displayInlineVerses) return;
        
        const codeBlocks = element.querySelectorAll('code');
        for (let i = 0; i < codeBlocks.length; i++) {
            const codeBlock = codeBlocks[i];
            // Skip if the code block is not a direct child (might be inside a pre tag)
            if (codeBlock.parentElement?.tagName === 'PRE') continue;
            
            const codeText = codeBlock.textContent?.trim();
            if (!codeText) continue;
            
            // Try to parse as Bible reference
            const reference = BibleReferenceParser.parseReference(codeText);
            if (!reference) continue;
            
            // Create a Bible reference element
            const referenceEl = document.createElement('span');
            referenceEl.classList.add('bible-reference');
            referenceEl.textContent = codeText;
            
            // Add hover and click events
            referenceEl.addEventListener('mouseover', (event) => {
                this.showVersePreview(referenceEl, codeText, event as MouseEvent);
            });
            
            referenceEl.addEventListener('click', async () => {
                // Determine if we should scroll to a specific verse
                const startVerse = reference.startVerse;
                
                // We only scroll to the verse if it's not a whole chapter reference
                const shouldScrollToVerse = startVerse > 1 || reference.endVerse;
                
                if (shouldScrollToVerse) {
                    // Open the chapter and scroll to the verse
                    await this.openChapterNote(reference.book, reference.startChapter, startVerse);
                } else {
                    // Just open the chapter without scrolling to a specific verse
                    await this.openChapterNote(reference.book, reference.startChapter);
                }
            });
            
            // Replace the code block with our reference element
            codeBlock.parentElement?.replaceChild(referenceEl, codeBlock);
        }
    }
    
    /**
     * Process full Bible passage code blocks
     */
    private async processFullBiblePassage(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        if (!this.settings.displayFullPassages) return;
        
        const reference = source.trim();
        const passage = await this.bibleService.getBibleContent(reference);
        
        if (passage) {
            const containerEl = document.createElement('div');
            containerEl.classList.add('bible-passage-container');
            
            // Add reference heading
            const headingEl = document.createElement('h3');
            headingEl.classList.add('bible-passage-heading');
            headingEl.textContent = passage.reference;
            containerEl.appendChild(headingEl);
            
            // Add verses
            const passageEl = document.createElement('div');
            passageEl.classList.add('bible-passage-text');
            passageEl.style.fontSize = this.settings.fontSizeForVerses;
            
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
    private async showVersePreview(element: HTMLElement, referenceText: string, event: MouseEvent): Promise<void> {
        const passage = await this.bibleService.getBibleContent(referenceText);
        if (!passage) return;
        
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
        
        // Show the verse preview as a tooltip
        // We'll position it manually near the element
        const rect = element.getBoundingClientRect();
        versePreviewEl.style.position = 'absolute';
        versePreviewEl.style.left = `${rect.left}px`;
        versePreviewEl.style.top = `${rect.bottom + 10}px`;
        versePreviewEl.style.zIndex = '1000';
        versePreviewEl.style.backgroundColor = 'var(--background-secondary)';
        versePreviewEl.style.padding = '10px';
        versePreviewEl.style.borderRadius = '5px';
        versePreviewEl.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        versePreviewEl.style.maxWidth = '400px';
        
        document.body.appendChild(versePreviewEl);
        
        // Remove the preview when mouse leaves the element or clicks elsewhere
        const removePreview = () => {
            document.body.removeChild(versePreviewEl);
            element.removeEventListener('mouseleave', removePreview);
            document.removeEventListener('click', removePreview);
        };
        
        element.addEventListener('mouseleave', removePreview);
        document.addEventListener('click', removePreview);
    }
    
    /**
     * Open a chapter note in the vault, downloading it if needed, and scroll to a specific verse
     */
    private async openChapterNote(book: string, chapter: number, verse?: number): Promise<void> {
        try {
            const standardBook = this.bibleService.standardizeBookName(book);
            if (!standardBook) {
                throw new Error(`Unknown book: ${book}`);
            }
            
            const chapterRef = `${standardBook} ${chapter}`;
            
            // Check if the file exists in the vault path first
            const vaultPath = `${this.settings.bibleContentVaultPath}/${standardBook}/${chapterRef}.md`;
            const exists = await this.app.vault.adapter.exists(vaultPath);
            
            if (exists) {
                // Open the existing file
                const file = this.app.vault.getAbstractFileByPath(vaultPath);
                if (file instanceof TFile) {
                    const leaf = this.app.workspace.getLeaf();
                    await leaf.openFile(file);
                    
                    // If a verse is specified, scroll to it
                    if (verse) {
                        // Wait a moment for the file to render
                        setTimeout(() => {
                            this.scrollToVerse(verse);
                        }, 300);
                    }
                    return;
                }
            }
            
            // If file doesn't exist or couldn't be opened, try to download it
            if (this.settings.downloadOnDemand && this.settings.esvApiToken) {
                // Try to download the chapter
                new Notice(`Downloading ${chapterRef}...`);
                const downloaded = await this.bibleService.downloadFromESVApi(chapterRef);
                
                if (downloaded) {
                    // Try to open the file again after downloading
                    setTimeout(async () => {
                        const file = this.app.vault.getAbstractFileByPath(vaultPath);
                        if (file instanceof TFile) {
                            const leaf = this.app.workspace.getLeaf();
                            await leaf.openFile(file);
                            
                            // If a verse is specified, scroll to it
                            if (verse) {
                                setTimeout(() => {
                                    this.scrollToVerse(verse);
                                }, 300);
                            }
                        } else {
                            new Notice(`Error: Unable to open ${chapterRef} after downloading`);
                        }
                    }, 500); // Small delay to ensure file is written
                    return;
                }
            }
            
            // Legacy fallback if download failed or not enabled
            const passage = await this.bibleService.getChapter(book, chapter);
            if (!passage) {
                throw new Error("Bible data not loaded");
            }
            
            // Create new file content
            const content = this.formatChapterContent(passage);
            
            // Create directories for the book if they don't exist
            await this.createDirectoryStructure(standardBook);
            
            // Create the file
            const newFile = await this.app.vault.create(vaultPath, content);
            
            // Open the newly created file
            const leaf = this.app.workspace.getLeaf();
            await leaf.openFile(newFile);
            
            // If a verse is specified, scroll to it
            if (verse) {
                setTimeout(() => {
                    this.scrollToVerse(verse);
                }, 300);
            }
        } catch (error) {
            console.error("Error creating chapter note:", error);
            new Notice(`Error opening chapter note: ${error}`);
        }
    }

    /**
     * Create directory structure for a book
     */
    private async createDirectoryStructure(book: string | null): Promise<void> {
        if (!book) {
            console.error("Cannot create directory structure for null book name");
            return;
        }
        
        const basePath = this.settings.bibleContentVaultPath;
        const bookPath = `${basePath}/${book}`;
        
        // Create base path if it doesn't exist
        if (!(await this.app.vault.adapter.exists(basePath))) {
            await this.app.vault.createFolder(basePath);
        }
        
        // Create book directory if it doesn't exist
        if (!(await this.app.vault.adapter.exists(bookPath))) {
            await this.app.vault.createFolder(bookPath);
        }
    }

    /**
     * Create or open a file in the vault
     */
    private async createOrOpenFile(path: string, content: string, verse?: number): Promise<void> {
        // Check if file exists
        const exists = await this.app.vault.adapter.exists(path);
        
        if (exists) {
            // Open the existing file
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(file);
                
                // If a verse is specified, scroll to it
                if (verse) {
                    this.scrollToVerse(verse);
                }
            }
        } else {
            // Create the file
            const dir = path.substring(0, path.lastIndexOf('/'));
            const filename = path.substring(path.lastIndexOf('/') + 1);
            
            // Ensure the directory exists
            if (!(await this.app.vault.adapter.exists(dir))) {
                await this.app.vault.createFolder(dir);
            }
            
            // Create the file in the vault
            const newFile = await this.app.vault.create(path, content);
            
            // Open the newly created file
            const leaf = this.app.workspace.getLeaf();
            await leaf.openFile(newFile);
            
            // If a verse is specified, scroll to it
            if (verse) {
                // Delay slightly to allow rendering
                setTimeout(() => {
                    this.scrollToVerse(verse);
                }, 300);
            }
        }
    }

    /**
     * Scroll to a specific verse in the active editor
     */
    private scrollToVerse(verse: number): void {
        // Get the active leaf
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return;
        
        // Get the view
        const view = activeLeaf.view;
        if (!(view instanceof MarkdownView)) return;
        
        // Try finding the verse by ID first
        const contentEl = view.contentEl;
        
        // Try different methods to find the verse
        // Method 1: Try to find HTML elements with verse ID (for rendered HTML content)
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
        
        // Method 3: Search for the verse number in text content (for plain text rendering)
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
     * Load settings from Obsidian's data storage
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    /**
     * Save settings to Obsidian's data storage
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Format chapter content as Markdown
     */
    private formatChapterContent(passage: BiblePassage): string {
        let content = `# ${passage.reference}\n\n`;
        
        // Add code block for rendering
        content += "```bible\n";
        content += passage.reference;
        content += "\n```\n\n";
        
        // Alternatively, add each verse separately
        for (const verse of passage.verses) {
            content += `**${verse.verse}** ${verse.text}\n\n`;
        }
        
        // Add copyright attribution
        content += "---\n\n";
        content += "Scripture quotations marked \"ESV\" are from the ESV® Bible ";
        content += "(The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, ";
        content += "a publishing ministry of Good News Publishers. Used by permission. All rights reserved.\n";
        
        return content;
    }
}

class DisciplesJournalSettingsTab extends PluginSettingTab {
    plugin: DisciplesJournalPlugin;

    constructor(app: App, plugin: DisciplesJournalPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Disciples Journal Settings' });
        
        containerEl.createEl('h3', { text: 'Display Settings' });

        new Setting(containerEl)
            .setName('Display Inline Verses')
            .setDesc('Enable inline Bible verse references using `Genesis 1:1` syntax')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.displayInlineVerses)
                .onChange(async (value) => {
                    this.plugin.settings.displayInlineVerses = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Display Full Passages')
            .setDesc('Enable full Bible passage blocks using ```bible Genesis 1:1-10``` syntax')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.displayFullPassages)
                .onChange(async (value) => {
                    this.plugin.settings.displayFullPassages = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Verse Font Size')
            .setDesc('Set the font size for displayed verses (e.g., 100%, 14px, 1.2em)')
            .addText(text => text
                .setPlaceholder('100%')
                .setValue(this.plugin.settings.fontSizeForVerses)
                .onChange(async (value) => {
                    this.plugin.settings.fontSizeForVerses = value;
                    await this.plugin.saveSettings();
                }));
        
        containerEl.createEl('h3', { text: 'Bible Version Settings' });
        
        new Setting(containerEl)
            .setName('Preferred Bible Version')
            .setDesc('Select the preferred Bible version (currently only ESV is supported)')
            .addDropdown(dropdown => dropdown
                .addOption('ESV', 'English Standard Version (ESV)')
                .setValue(this.plugin.settings.preferredBibleVersion)
                .onChange(async (value) => {
                    this.plugin.settings.preferredBibleVersion = value;
                    await this.plugin.saveSettings();
                })
            );
        
        containerEl.createEl('h3', { text: 'Bible Content Vault Path' });
        
        new Setting(containerEl)
            .setName('Bible Content Vault Path')
            .setDesc('Specify the vault directory where chapter notes and files will be saved')
            .addText(text => text
                .setPlaceholder('Bible/ESV')
                .setValue(this.plugin.settings.bibleContentVaultPath)
                .onChange(async (value) => {
                    this.plugin.settings.bibleContentVaultPath = value;
                    this.plugin.bibleService.setBibleContentVaultPath(value);
                    await this.plugin.saveSettings();
                }));
        
        containerEl.createEl('h3', { text: 'ESV API Settings' });
        
        new Setting(containerEl)
            .setName('ESV API Token')
            .setDesc('Enter your ESV API token to enable downloading passages on demand')
            .addText(text => text
                .setPlaceholder('Enter your ESV API token')
                .setValue(this.plugin.settings.esvApiToken)
                .onChange(async (value) => {
                    this.plugin.settings.esvApiToken = value;
                    this.plugin.bibleService.setESVApiToken(value);
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Download on Demand')
            .setDesc('Automatically download Bible passages that are not already available')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.downloadOnDemand)
                .onChange(async (value) => {
                    this.plugin.settings.downloadOnDemand = value;
                    this.plugin.bibleService.setDownloadOnDemand(value);
                    await this.plugin.saveSettings();
                }));
        
        containerEl.createEl('h3', { text: 'About' });
        
        const aboutDiv = containerEl.createDiv();
        aboutDiv.addClass('disciples-journal-about');
        aboutDiv.innerHTML = `
            <p>Disciples Journal Bible plugin for Obsidian</p>
            <p>Version: ${this.plugin.manifest.version}</p>
            <p>Transform Bible references into interactive elements in your notes.</p>
            <p><small>ESV® Bible copyright information: Scripture quotations marked "ESV" are from the ESV® Bible 
            (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, 
            a publishing ministry of Good News Publishers. 
            Used by permission. All rights reserved.</small></p>
        `;
        
        // Add a button to check Bible data status
        containerEl.createEl('h3', { text: 'Diagnostics' });
        
        new Setting(containerEl)
            .setName('Bible Data Status')
            .setDesc(this.plugin.bibleDataLoaded ? 'Bible data loaded successfully' : 'Bible data not loaded')
            .addButton(button => button
                .setButtonText('Reload Bible Data')
                .onClick(async () => {
                    try {
                        button.setButtonText('Loading...');
                        button.setDisabled(true);
                        await this.plugin.loadBibleData();
                        new Notice('Bible data reloaded successfully!');
                        this.display(); // Refresh settings to show updated status
                    } catch (error) {
                        console.error('Failed to reload Bible data:', error);
                        new Notice('Failed to reload Bible data. Check console for details.');
                    } finally {
                        button.setButtonText('Reload Bible Data');
                        button.setDisabled(false);
                    }
                })
            );
    }
}