import {Plugin, MarkdownView, Notice, getFrontMatterInfo, parseYaml} from 'obsidian';
import {ESVApiService} from '../services/ESVApiService';
import {BibleContentService} from '../services/BibleContentService';
import {BibleReferenceRenderer} from '../components/BibleReferenceRenderer';
import {BibleStyles} from '../components/BibleStyles';
import {
	DisciplesJournalSettings,
	DEFAULT_SETTINGS,
	DisciplesJournalSettingsTab
} from '../settings/DisciplesJournalSettings';
import {BibleChapterFiles} from 'src/services/BibleChapterFiles';
import {BibleMarkupProcessor} from './BibleMarkupProcessor';
import {createInlineReferenceExtension} from "../components/BibleReferenceInlineExtension";
import {BibleReference} from './BibleReference';
import {getCustomFrontmatterForReference, mergeCustomFrontmatterIntoExisting} from "../utils/FrontmatterUtil";

/**
 * Disciples Journal Plugin for Obsidian
 * Enhances Bible references with hover previews and in-note embedding
 */
export default class DisciplesJournalPlugin extends Plugin {
	settings: DisciplesJournalSettings;

	// Services
	private esvApiService: ESVApiService;
	private bibleContentService: BibleContentService;
	private bibleBookFiles: BibleChapterFiles;

	// Components
	private bibleStyles: BibleStyles;
	private bibleReferenceRenderer: BibleReferenceRenderer;
	private bibleMarkupProcessor: BibleMarkupProcessor;

	async onload() {
		console.log('Loading Disciples Journal plugin');

		// Initialize settings
		await this.loadSettings();

		// Initialize services
		this.esvApiService = new ESVApiService(this);
		this.bibleContentService = new BibleContentService(this, this.esvApiService);

		// Check if ESV API token is set and show a notice if it's not
		if (!this.settings.esvApiToken) {
			new Notice('Disciples Journal: ESV API token not set. Bible content may not load correctly. Visit the plugin settings to add your API token.', 10000);
		}

		// Initialize components
		this.bibleStyles = new BibleStyles();
		this.bibleBookFiles = new BibleChapterFiles(this, this.bibleContentService);

		this.bibleReferenceRenderer = new BibleReferenceRenderer(
			this.bibleContentService,
			this.bibleBookFiles,
			this
		);

		// Initialize markup processor
		this.bibleMarkupProcessor = new BibleMarkupProcessor(this.bibleReferenceRenderer, this.settings);

		// Register bible reference processor
		this.registerMarkdownCodeBlockProcessor('bible', this.bibleMarkupProcessor.processBibleCodeBlock.bind(this.bibleMarkupProcessor));

		// Register markdown post processor for inline references
		this.registerMarkdownPostProcessor(this.bibleMarkupProcessor.processInlineBibleReferences.bind(this.bibleMarkupProcessor));

		// Register editor extension for Live Preview
		if (this.settings.displayInlineVerses) {
			this.registerEditorExtension(createInlineReferenceExtension(this.bibleReferenceRenderer, this.bibleContentService));
		}

		// Register commands
		this.addCommand({
			id: 'update-bible-note-frontmatter',
			name: 'Update frontmatter on all Bible notes',
			callback: () => this.updateAllBibleNoteFrontmatter()
		});

		// Register settings tab
		this.addSettingTab(new DisciplesJournalSettingsTab(this.app, this));

		// Register active leaf change to update styles
		this.registerEvent(this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this)));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
					blockIndentation: this.settings.blockIndentation,
					hideFootnotes: this.settings.hideFootnotes,
					hideFootnotesInPreview: this.settings.hideFootnotesInPreview
				}
			);
		});
	}

	/**
	 * Open or create a chapter note (Public method for external access)
	 */
	public async openChapterNote(reference: string) {
		return this.bibleBookFiles.openChapterNote(reference);
	}

	/**
	 * Scan all Bible notes and update their frontmatter with the current custom frontmatter settings.
	 */
	private async updateAllBibleNoteFrontmatter() {
		const basePath = this.settings.bibleContentVaultPath;
		const files = this.app.vault.getFiles().filter(
			f => f.path.startsWith(basePath + '/') && f.extension === 'md'
		);

		if (files.length === 0) {
			new Notice('No Bible notes found to update.');
			return;
		}

		let updatedCount = 0;
		let skippedCount = 0;

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const fmInfo = getFrontMatterInfo(content);
				if (!fmInfo || !fmInfo.frontmatter) {
					skippedCount++;
					continue;
				}

				const fmData = parseYaml(fmInfo.frontmatter);
				if (!fmData || !fmData.canonical) {
					skippedCount++;
					continue;
				}

				const ref = BibleReference.parse(fmData.canonical);
				if (!ref) {
					skippedCount++;
					continue;
				}

				const customYaml = getCustomFrontmatterForReference(ref, this.settings);
				if (!customYaml.trim()) {
					skippedCount++;
					continue;
				}

				const mergedFrontmatter = mergeCustomFrontmatterIntoExisting(fmInfo.frontmatter, customYaml);
				if (!mergedFrontmatter) {
					skippedCount++;
					continue;
				}

				// Reconstruct the file: new frontmatter + original body.
				// contentStart is the index after the closing "---\n", so bodyContent
				// preserves whatever whitespace/content followed the original frontmatter.
				const bodyContent = content.substring(fmInfo.contentStart);
				const newContent = `---\n${mergedFrontmatter}---\n${bodyContent}`;

				await this.app.vault.adapter.write(file.path, newContent);
				updatedCount++;
			} catch (e) {
				console.warn(`Disciples Journal: failed to update frontmatter for ${file.path}`, e);
				skippedCount++;
			}
		}

		new Notice(`Updated frontmatter on ${updatedCount} Bible note(s). Skipped ${skippedCount}.`);
	}
} 
