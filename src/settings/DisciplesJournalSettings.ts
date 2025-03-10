import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import DisciplesJournalPlugin from '../core/DisciplesJournalPlugin';

export interface DisciplesJournalSettings {
    displayInlineVerses: boolean;
    displayFullPassages: boolean;
    fontSizeForVerses: string;
    wordsOfChristColor: string;
    verseNumberColor: string;
    headingColor: string;
    blockIndentation: string;
    preferredBibleVersion: string;
    esvApiToken: string;
    downloadOnDemand: boolean;
    bibleContentVaultPath: string;
}

export const DEFAULT_SETTINGS: DisciplesJournalSettings = {
    displayInlineVerses: true,
    displayFullPassages: true,
    fontSizeForVerses: '100%',
    wordsOfChristColor: 'var(--text-accent)',
    verseNumberColor: 'var(--text-accent)',
    headingColor: 'var(--text-accent)',
    blockIndentation: '2em',
    preferredBibleVersion: 'ESV',
    esvApiToken: '',
    downloadOnDemand: true,
    bibleContentVaultPath: 'Bible/ESV'
};

export class DisciplesJournalSettingsTab extends PluginSettingTab {
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
            .setDesc('Enable rendering of inline Bible references (in `code blocks`).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.displayInlineVerses)
                .onChange(async (value) => {
                    this.plugin.settings.displayInlineVerses = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Display Full Passages')
            .setDesc('Enable rendering of Bible passages in ```bible code blocks.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.displayFullPassages)
                .onChange(async (value) => {
                    this.plugin.settings.displayFullPassages = value;
                    await this.plugin.saveSettings();
                }));
        
        containerEl.createEl('h3', { text: 'Text Styling' });

        new Setting(containerEl)
            .setName('Verse Font Size')
            .setDesc('Set the font size for displayed verses.')
            .addText(text => text
                .setPlaceholder('100%')
                .setValue(this.plugin.settings.fontSizeForVerses)
                .onChange(async (value) => {
                    this.plugin.settings.fontSizeForVerses = value || '100%';
                    await this.plugin.saveSettings();
                    this.plugin.updateBibleStyles();
                }));
                
        new Setting(containerEl)
            .setName('Words of Christ Color')
            .setDesc('Set the color for Words of Christ (use `var(--text-normal)` for no special color).')
            .addText(text => text
                .setPlaceholder('var(--text-accent)')
                .setValue(this.plugin.settings.wordsOfChristColor)
                .onChange(async (value) => {
                    this.plugin.settings.wordsOfChristColor = value || 'var(--text-accent)';
                    await this.plugin.saveSettings();
                    this.plugin.updateBibleStyles();
                }));
                
        new Setting(containerEl)
            .setName('Verse Number Color')
            .setDesc('Set the color for verse numbers.')
            .addText(text => text
                .setPlaceholder('var(--text-accent)')
                .setValue(this.plugin.settings.verseNumberColor)
                .onChange(async (value) => {
                    this.plugin.settings.verseNumberColor = value || 'var(--text-accent)';
                    await this.plugin.saveSettings();
                    this.plugin.updateBibleStyles();
                }));
                
        new Setting(containerEl)
            .setName('Heading Color')
            .setDesc('Set the color for Bible passage headings.')
            .addText(text => text
                .setPlaceholder('var(--text-accent)')
                .setValue(this.plugin.settings.headingColor)
                .onChange(async (value) => {
                    this.plugin.settings.headingColor = value || 'var(--text-accent)';
                    await this.plugin.saveSettings();
                    this.plugin.updateBibleStyles();
                }));
                
        new Setting(containerEl)
            .setName('Block Indentation')
            .setDesc('Set the indentation for block sections.')
            .addText(text => text
                .setPlaceholder('2em')
                .setValue(this.plugin.settings.blockIndentation)
                .onChange(async (value) => {
                    this.plugin.settings.blockIndentation = value || '2em';
                    await this.plugin.saveSettings();
                    this.plugin.updateBibleStyles();
                }));
        
        containerEl.createEl('h3', { text: 'Bible Version Settings' });
        
        new Setting(containerEl)
            .setName('Preferred Bible Version')
            .setDesc('Select your preferred Bible version (only ESV currently supported).')
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
            .setDesc('Path in your vault where Bible content will be stored.')
            .addText(text => text
                .setPlaceholder('Bible/ESV')
                .setValue(this.plugin.settings.bibleContentVaultPath)
                .onChange(async (value) => {
                    this.plugin.settings.bibleContentVaultPath = value || 'Bible/ESV';
                    await this.plugin.saveSettings();
                    this.plugin.setContentPath(value || 'Bible/ESV');
                }));
        
        containerEl.createEl('h3', { text: 'ESV API Settings' });
        
        const apiInfoDiv = containerEl.createDiv({ cls: 'disciples-journal-api-info' });
        apiInfoDiv.innerHTML = `
            <p>The ESV API allows this plugin to download and display Bible passages from the ESV translation.</p>
            <p><strong>To get a free ESV API token:</strong></p>
            <ol>
                <li>Visit <a href="https://api.esv.org/docs/" target="_blank">api.esv.org</a></li>
                <li>Sign up for a free account</li>
                <li>After logging in, go to "API Keys" in your account</li>
                <li>Create a new token and copy it here</li>
            </ol>
            <p>With a valid token, the plugin can download and display Bible passages directly in your notes.</p>
        `;
        
        new Setting(containerEl)
            .setName('ESV API Token')
            .setDesc('Enter your ESV API token from api.esv.org.')
            .addText(text => text
                .setPlaceholder('Enter your ESV API token')
                .setValue(this.plugin.settings.esvApiToken)
                .onChange(async (value) => {
                    this.plugin.settings.esvApiToken = value;
                    await this.plugin.saveSettings();
                    this.plugin.setESVApiToken(value);
                    
                    if (value) {
                        new Notice('ESV API token updated', 2000);
                    }
                }));
        
        new Setting(containerEl)
            .setName('Download on Demand')
            .setDesc('Enable automatic downloading of Bible content when requested.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.downloadOnDemand)
                .onChange(async (value) => {
                    this.plugin.settings.downloadOnDemand = value;
                    await this.plugin.saveSettings();
                    this.plugin.setDownloadOnDemand(value);
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
        
        // About & Diagnostics Section
        containerEl.createEl('h3', { text: 'Diagnostics' });

        const status = containerEl.createEl('div', { cls: 'disciples-journal-about' });
        
        new Setting(status)
            .setName('Bible Data Status')
            .setDesc('Click to reload Bible data from source')
            .addButton(button => button
                .setButtonText('Reload Bible Data')
                .onClick(async () => {
                    button.setButtonText('Loading...');
                    button.setDisabled(true);
                    await this.plugin.loadBibleData();
                    button.setButtonText('Reload Bible Data');
                    button.setDisabled(false);
                    this.display(); // Refresh the settings panel
                }));

        // Copyright & Attribution
    }
} 