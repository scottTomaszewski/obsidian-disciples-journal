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
}

const DEFAULT_SETTINGS: DisciplesJournalSettings = {
    displayInlineVerses: true,
    displayFullPassages: true,
    fontSizeForVerses: '100%',
    preferredBibleVersion: 'ESV'
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
        this.bibleService = new BibleService();
        
        // Show loading notice
        this.loadingNotice = new Notice("Loading Bible data...", 0);
        
        // Try to load the Bible data
        try {
            await this.loadBibleData();
            
            // Register Markdown post processor for inline code (e.g., `Genesis 1:1`)
            this.registerMarkdownPostProcessor((element, context) => {
                this.processInlineCodeBlocks(element, context);
            });

            // Register Markdown code block processor for multiline passages (e.g., ```bible Genesis 1:1-10 ```)
            this.registerMarkdownCodeBlockProcessor('bible', (source, el, ctx) => {
                this.processFullBiblePassage(source, el, ctx);
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
            // Try approach 1: Use the data from require if available
            if (ESV) {
                console.log("Loading Bible data from require (memory)");
                this.bibleService.loadBible(ESV);
                this.bibleDataLoaded = true;
                return;
            }
            
            console.log("Attempting to load Bible data from file...");
            // Try approach 2: Load from multiple possible file locations
            await this.tryLoadingBibleData();
            
        } catch (error) {
            console.error("All Bible data loading methods failed:", error);
            this.bibleDataLoaded = false;
            throw new Error("Could not load Bible data from any source");
        }
    }
    
    /**
     * Try multiple approaches to load the Bible data
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
     * Process inline code blocks that might contain Bible references
     */
    private processInlineCodeBlocks(element: HTMLElement, context: MarkdownPostProcessorContext): void {
        if (!this.settings.displayInlineVerses) return;

        const codeBlocks = element.querySelectorAll('code:not(.block-language-bible)');
        codeBlocks.forEach(codeBlock => {
            const text = codeBlock.textContent?.trim() || '';
            const reference = BibleReferenceParser.parseReference(text);
            
            if (reference) {
                // Check if it's a valid Bible reference
                const referenceType = BibleReferenceParser.getReferenceType(reference);
                
                // Convert inline code to a Bible reference link
                const linkEl = document.createElement('a');
                linkEl.classList.add('bible-reference');
                linkEl.textContent = text;
                linkEl.dataset.referenceText = text;
                
                // Show verse text on hover
                this.registerDomEvent(linkEl, 'mouseover', (e) => {
                    this.showVersePreview(linkEl, text, e);
                });
                
                // Open chapter note when clicked
                this.registerDomEvent(linkEl, 'click', (e) => {
                    e.preventDefault();
                    this.openChapterNote(reference.book, reference.startChapter);
                });
                
                // Replace the code element with our custom link
                codeBlock.replaceWith(linkEl);
            }
        });
    }
    
    /**
     * Process full Bible passage code blocks
     */
    private async processFullBiblePassage(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        if (!this.settings.displayFullPassages) return;
        
        const reference = source.trim();
        const passage = this.bibleService.getBibleContent(reference);
        
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
        const passage = this.bibleService.getBibleContent(referenceText);
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
     * Open a note for the specified Bible chapter
     */
    private async openChapterNote(book: string, chapter: number): Promise<void> {
        // Format the filename for the chapter note
        const fileName = `Bible/${book}/${book} ${chapter}.md`;
        
        // Check if the note exists
        const file = this.app.vault.getAbstractFileByPath(fileName);
        
        if (file instanceof TFile) {
            // If it exists, open it
            const leaf = this.app.workspace.getLeaf();
            await leaf.openFile(file);
        } else {
            // If it doesn't exist, create it
            try {
                // Make sure directories exist
                await this.app.vault.createFolder(`Bible/${book}`).catch(() => {
                    // Folder might already exist, just continue
                });
                
                // Get the chapter content
                const bibleChapter = this.bibleService.getChapter(book, chapter);
                if (!bibleChapter) {
                    new Notice(`Chapter ${book} ${chapter} not found.`);
                    return;
                }
                
                // Format the note content
                let content = `# ${book} ${chapter}\n\n`;
                
                for (const verse of bibleChapter.verses) {
                    content += `**${verse.verse}** ${verse.text}\n\n`;
                }
                
                // Create the file
                const newFile = await this.app.vault.create(fileName, content);
                
                // Open the new file
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(newFile);
            } catch (error) {
                console.error('Error creating chapter note:', error);
                new Notice(`Error creating note for ${book} ${chapter}`);
            }
        }
    }

    onunload() {
        // Clean up
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
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
        
        containerEl.createEl('h3', { text: 'About' });
        
        const aboutDiv = containerEl.createDiv();
        aboutDiv.addClass('disciples-journal-about');
        aboutDiv.innerHTML = `
            <p>Disciples Journal Bible plugin for Obsidian</p>
            <p>Version: ${this.plugin.manifest.version}</p>
            <p>Transform Bible references into interactive elements in your notes.</p>
            <p><small>ESV® Bible copyright information: Scripture quotations marked "ESV" are from the ESV® Bible 
            (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. 
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