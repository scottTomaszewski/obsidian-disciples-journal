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
    bibleContentVaultPath: 'Bible'
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
                    this.plugin.setBibleVersion(value);
                })
            );
        
        containerEl.createEl('h3', { text: 'Bible Content Vault Path' });
        
        new Setting(containerEl)
            .setName('Bible Content Vault Path')
            .setDesc('Root path in your vault where Bible content will be stored. Each translation will be stored in a subdirectory.')
            .addText(text => text
                .setPlaceholder('Bible')
                .setValue(this.plugin.settings.bibleContentVaultPath)
                .onChange(async (value) => {
                    this.plugin.settings.bibleContentVaultPath = value || 'Bible';
                    await this.plugin.saveSettings();
                    this.plugin.setContentPath(value || 'Bible');
                }));
        
        containerEl.createEl('h3', { text: 'ESV API Settings' });
        
        const apiInfoDiv = containerEl.createDiv({ cls: 'disciples-journal-api-info' });
        
        apiInfoDiv.createEl('p', { 
            text: 'The ESV API allows this plugin to download and display Bible passages from the ESV translation.' 
        });
        
        apiInfoDiv.createEl('p', { 
            text: 'To get a free ESV API token:',
            attr: { style: 'font-weight: bold;' }
        });
        
        const instructionsList = apiInfoDiv.createEl('ol');
        
        const steps = [
            'Visit api.esv.org',
            'Sign up for a free account',
            'After logging in, go to "API Keys" in your account',
            'Create a new token and copy it here'
        ];
        
        steps.forEach(step => {
            if (step === 'Visit api.esv.org') {
                const listItem = instructionsList.createEl('li');
                listItem.createEl('span', { text: 'Visit ' });
                listItem.createEl('a', { 
                    text: 'api.esv.org', 
                    href: 'https://api.esv.org/docs/',
                    attr: { target: '_blank' } 
                });
            } else {
                instructionsList.createEl('li', { text: step });
            }
        });
        
        apiInfoDiv.createEl('p', { 
            text: 'With a valid token, the plugin can download and display Bible passages directly in your notes.'
        });
        
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
        
        
        new Setting(containerEl)
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