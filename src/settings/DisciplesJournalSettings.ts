import {App, Notice, PluginSettingTab, Setting} from 'obsidian';
import DisciplesJournalPlugin from '../core/DisciplesJournalPlugin';
import {THEME_PRESETS} from '../components/BibleStyles';
import {BibleFiles} from "../services/BibleFiles";
import {TEMPLATE_VARIABLES} from "../utils/FrontmatterUtil";

export interface DisciplesJournalSettings {
	displayInlineVerses: boolean;
	displayFullPassages: boolean;
	bibleTextFontSize: string;
	wordsOfChristColor: string;
	verseNumberColor: string;
	headingColor: string;
	blockIndentation: string;
	preferredBibleVersion: string;
	esvApiToken: string;
	downloadOnDemand: boolean;
	bibleContentVaultPath: string;
	stylePreset: string;
	showNavigationForVerses: boolean;
	hideFootnotes: boolean;
	hideFootnotesInPreview: boolean;
	chapterNoteFrontmatter: string;
	passageNoteFrontmatter: string;
	enableVerseSelection: boolean;
	defaultInsertFormat: 'inline' | 'codeblock' | 'blockquote';
	formatChooserStyle: 'split' | 'toggle' | 'submenu';
	enableAppendToNote: boolean;
}

export const DEFAULT_SETTINGS: DisciplesJournalSettings = {
	displayInlineVerses: true,
	displayFullPassages: true,
	bibleTextFontSize: '100%',
	wordsOfChristColor: 'var(--text-accent)',
	verseNumberColor: 'var(--text-accent)',
	headingColor: 'var(--text-accent)',
	blockIndentation: '2em',
	preferredBibleVersion: 'ESV',
	esvApiToken: '',
	downloadOnDemand: true,
	bibleContentVaultPath: 'Bible',
	stylePreset: 'default',
	showNavigationForVerses: false,
	hideFootnotes: false,
	hideFootnotesInPreview: false,
	chapterNoteFrontmatter: '',
	passageNoteFrontmatter: '',
	enableVerseSelection: true,
	defaultInsertFormat: 'inline',
	formatChooserStyle: 'split',
	enableAppendToNote: false
};

export class DisciplesJournalSettingsTab extends PluginSettingTab {
	plugin: DisciplesJournalPlugin;

	constructor(app: App, plugin: DisciplesJournalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl).setName('Display customization').setHeading();

		new Setting(containerEl)
			.setName('Display inline verses')
			.setDesc('Enable rendering of inline Bible references (in `code blocks`).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.displayInlineVerses)
				.onChange(async (value) => {
					this.plugin.settings.displayInlineVerses = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Display full passages')
			.setDesc('Enable rendering of full Bible passages (in ```bible code blocks).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.displayFullPassages)
				.onChange(async (value) => {
					this.plugin.settings.displayFullPassages = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Show navigation for verses')
			.setDesc('Show chapter navigation when displaying specific verses (by default, navigation only shows for full chapters).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNavigationForVerses)
				.onChange(async (value) => {
					this.plugin.settings.showNavigationForVerses = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Hide footnotes')
			.setDesc('Hide footnotes in the displayed scripture.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideFootnotes)
				.onChange(async (value) => {
					this.plugin.settings.hideFootnotes = value;
					await this.plugin.saveSettings();
					this.plugin.updateBibleStyles();
				})
			);

		new Setting(containerEl)
			.setName('Hide footnotes in hover previews')
			.setDesc('Hide footnotes in hover preview popups.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideFootnotesInPreview)
				.onChange(async (value) => {
					this.plugin.settings.hideFootnotesInPreview = value;
					await this.plugin.saveSettings();
					this.plugin.updateBibleStyles();
				})
			);

		new Setting(containerEl)
			.setName('Style preset')
			.setDesc('Choose a predefined style preset for Bible content.')
			.addDropdown(dropdown => {
				// Add all theme presets
				Object.keys(THEME_PRESETS).forEach(preset => {
					dropdown.addOption(preset, preset.charAt(0).toUpperCase() + preset.slice(1));
				});

				dropdown.setValue(this.plugin.settings.stylePreset);
				dropdown.onChange(async (value) => {
					this.plugin.settings.stylePreset = value;
					await this.plugin.saveSettings();
					this.plugin.updateBibleStyles();
				});
			});

		new Setting(containerEl)
			.setName('Bible text font size')
			.setDesc('Set the font size for Bible verses and passages.')
			.addDropdown(dropdown => dropdown
				.addOption('80%', 'Smaller (80%)')
				.addOption('90%', 'Small (90%)')
				.addOption('100%', 'Normal (100%)')
				.addOption('110%', 'Large (110%)')
				.addOption('120%', 'Larger (120%)')
				.setValue(this.plugin.settings.bibleTextFontSize)
				.onChange(async (value) => {
					this.plugin.settings.bibleTextFontSize = value;
					await this.plugin.saveSettings();
					this.plugin.updateBibleStyles();
				})
			);

		new Setting(containerEl).setName('Text styling').setHeading();

		new Setting(containerEl)
			.setName('Words of Christ color')
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
			.setName('Verse number color')
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
			.setName('Heading color')
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
			.setName('Block indentation')
			.setDesc('Set the indentation for block sections.')
			.addText(text => text
				.setPlaceholder('2em')
				.setValue(this.plugin.settings.blockIndentation)
				.onChange(async (value) => {
					this.plugin.settings.blockIndentation = value || '2em';
					await this.plugin.saveSettings();
					this.plugin.updateBibleStyles();
				}));

		new Setting(containerEl).setName('Bible').setHeading();

		new Setting(containerEl)
			.setName('Preferred Bible version')
			.setDesc('Select your preferred Bible version (only ESV currently supported).')
			.addDropdown(dropdown => dropdown
				.addOption('ESV', 'English Standard Version (ESV)')
				.setValue(this.plugin.settings.preferredBibleVersion)
				.onChange(async (value) => {
					this.plugin.settings.preferredBibleVersion = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Bible content vault path')
			.setDesc('Root path in your vault where Bible content will be stored. Each translation will be stored in a subdirectory.')
			.addText(text => text
				.setPlaceholder('Bible')
				.setValue(this.plugin.settings.bibleContentVaultPath)
				.onChange(async (value) => {
					this.plugin.settings.bibleContentVaultPath = value || 'Bible';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Note frontmatter').setHeading();

		const fmInfoDiv = containerEl.createDiv({cls: 'disciples-journal-frontmatter-info'});

		fmInfoDiv.createEl('p', {
			text: 'Add custom YAML frontmatter to Bible notes. API metadata keys (query, canonical, parsed, passage_meta, passages) are protected and cannot be overwritten. The cssclasses key will be merged with the plugin-managed class.'
		});

		fmInfoDiv.createEl('p', {
			text: 'Template variables -- use these in values to inject reference data:',
			cls: 'disciples-journal-info-label'
		});

		const varList = fmInfoDiv.createEl('ul', {cls: 'disciples-journal-var-list'});
		for (const v of TEMPLATE_VARIABLES) {
			const li = varList.createEl('li');
			li.createEl('code', {text: v.variable});
			li.createEl('span', {text: ` -- ${v.description}`});
		}

		new Setting(containerEl)
			.setName('Chapter note frontmatter')
			.setDesc('Custom YAML frontmatter added to chapter-level notes (e.g., Genesis 1).')
			.addTextArea(text => text
				.setPlaceholder('tags:\n  - bible/{{book}}\ntype: chapter')
				.setValue(this.plugin.settings.chapterNoteFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.chapterNoteFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Passage note frontmatter')
			.setDesc('Custom YAML frontmatter added to passage-level notes (e.g., Genesis 1:5 or Genesis 1:5-10).')
			.addTextArea(text => text
				.setPlaceholder('tags:\n  - bible/{{book}}\npassage: "{{reference}}"')
				.setValue(this.plugin.settings.passageNoteFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.passageNoteFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Verse selection').setHeading();

		new Setting(containerEl)
			.setName('Enable verse selection')
			.setDesc('Tap verses in a rendered passage to select them and copy/insert them into notes.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableVerseSelection)
				.onChange(async (value) => {
					this.plugin.settings.enableVerseSelection = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default insert format')
			.setDesc('The format used by the main button before you pick another.')
			.addDropdown(dropdown => dropdown
				.addOption('inline', 'Inline reference')
				.addOption('codeblock', 'Bible code block')
				.addOption('blockquote', 'Blockquote with text')
				.setValue(this.plugin.settings.defaultInsertFormat)
				.onChange(async (value) => {
					this.plugin.settings.defaultInsertFormat = value as DisciplesJournalSettings['defaultInsertFormat'];
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Format chooser style')
			.setDesc('How the action bar lets you pick a format.')
			.addDropdown(dropdown => dropdown
				.addOption('split', 'Split buttons (default format + chevron)')
				.addOption('toggle', 'Format toggle + action buttons')
				.addOption('submenu', 'Action menus with format submenus')
				.setValue(this.plugin.settings.formatChooserStyle)
				.onChange(async (value) => {
					this.plugin.settings.formatChooserStyle = value as DisciplesJournalSettings['formatChooserStyle'];
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable "Append to note…"')
			.setDesc('Add an action that appends the selection to the end of a note you pick. Overlaps with Insert at cursor, so it is off by default.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAppendToNote)
				.onChange(async (value) => {
					this.plugin.settings.enableAppendToNote = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('ESV API').setHeading();

		const apiInfoDiv = containerEl.createDiv({cls: 'disciples-journal-api-info'});

		apiInfoDiv.createEl('p', {
			text: 'The ESV API allows this plugin to download and display Bible passages from the ESV translation.'
		});

		apiInfoDiv.createEl('p', {
			text: 'To get a free ESV API token:',
			cls: 'disciples-journal-info-label'
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
				listItem.createEl('span', {text: 'Visit '});
				listItem.createEl('a', {
					text: 'api.esv.org',
					href: 'https://api.esv.org/docs/',
					attr: {target: '_blank'}
				});
			} else {
				instructionsList.createEl('li', {text: step});
			}
		});

		apiInfoDiv.createEl('p', {
			text: 'With a valid token, the plugin can download and display Bible passages directly in your notes.'
		});

		new Setting(containerEl)
			.setName('ESV API token')
			.setDesc('Enter your ESV API token from api.esv.org.')
			.addText(text => text
				.setPlaceholder('Enter your ESV API token')
				.setValue(this.plugin.settings.esvApiToken)
				.onChange(async (value) => {
					this.plugin.settings.esvApiToken = value;
					await this.plugin.saveSettings();
					if (value) {
						new Notice('ESV API token updated', 2000);
					}
				}));

		new Setting(containerEl)
			.setName('Download on demand')
			.setDesc('Enable automatic downloading of Bible content when requested.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.downloadOnDemand)
				.onChange(async (value) => {
					this.plugin.settings.downloadOnDemand = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setDesc("Click this button to clear the cached bible files. Click this after upgrading from 0.7.0 or earlier. Data will be redownloaded on demand")
			.addButton(btn => btn
				.setButtonText("Clear Bible data")
				.onClick(async evt => {
					await BibleFiles.clearData(this.plugin);
				}));

	}
} 
