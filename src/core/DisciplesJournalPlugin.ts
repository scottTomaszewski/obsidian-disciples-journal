import {Plugin, MarkdownView, Notice, normalizePath} from 'obsidian';
import {ESVApiService} from '../services/ESVApiService';
import {BibleContentService} from '../services/BibleContentService';
import {BibleReferenceRenderer} from '../components/BibleReferenceRenderer';
import {BibleStyles} from '../components/BibleStyles';
import {
	DisciplesJournalSettings,
	DEFAULT_SETTINGS,
	DisciplesJournalSettingsTab
} from '../settings/DisciplesJournalSettings';
import {BibleFiles} from 'src/services/BibleFiles';
import {BibleMarkupProcessor} from './BibleMarkupProcessor';
import {createInlineReferenceExtension} from "../components/BibleReferenceInlineExtension";
import {BibleReference} from './BibleReference';
import {BibleEventHandlers} from './BibleEventHandlers';
import {applyCustomFrontmatter, getCustomFrontmatterForReference} from "../utils/FrontmatterUtil";
import {OpenBibleModal} from "../components/OpenBibleModal";
import {VerseSelectionService} from './VerseSelectionService';

/**
 * Disciples Journal Plugin for Obsidian
 * Enhances Bible references with hover previews and in-note embedding
 */
export default class DisciplesJournalPlugin extends Plugin {
	settings: DisciplesJournalSettings;

	// Services
	private esvApiService: ESVApiService;
	private bibleContentService: BibleContentService;
	private bibleFiles: BibleFiles;

	// Components
	private bibleStyles: BibleStyles;
	private bibleReferenceRenderer: BibleReferenceRenderer;
	private bibleEventHandlers: BibleEventHandlers;
	private bibleMarkupProcessor: BibleMarkupProcessor;
	private verseSelectionService: VerseSelectionService;

	async onload() {
		// Initialize settings
		await this.loadSettings();

		// Initialize services
		this.esvApiService = new ESVApiService(this);
		this.bibleContentService = new BibleContentService(this, this.esvApiService);

		// Holds the single active verse selection across panes; unloads with the plugin.
		this.verseSelectionService = new VerseSelectionService();
		this.addChild(this.verseSelectionService);

		// Check if ESV API token is set and show a notice if it's not
		if (!this.settings.esvApiToken) {
			new Notice('Disciples Journal: ESV API token not set. Bible content may not load correctly. Visit the plugin settings to add your API token.', 10000);
		}

		// Initialize components
		this.bibleStyles = new BibleStyles();
		this.bibleFiles = new BibleFiles(this, this.bibleContentService);

		this.bibleReferenceRenderer = new BibleReferenceRenderer(
			this.bibleContentService,
			this.bibleFiles,
			this,
			this.verseSelectionService
		);

		// Single, long-lived hover-preview event handler owned by the plugin.
		// addChild loads it now (registering its listeners/timer) and unloads it
		// with the plugin, so the global document listeners no longer leak.
		this.bibleEventHandlers = new BibleEventHandlers(this.bibleReferenceRenderer);
		this.addChild(this.bibleEventHandlers);
		this.bibleReferenceRenderer.setEventHandlers(this.bibleEventHandlers);

		// Initialize markup processor
		this.bibleMarkupProcessor = new BibleMarkupProcessor(this.bibleReferenceRenderer, this.settings);

		// Register bible reference processor
		this.registerMarkdownCodeBlockProcessor('bible', (source, el, ctx) =>
			this.bibleMarkupProcessor.processBibleCodeBlock(source, el, ctx));

		// Register markdown post processor for inline references
		this.registerMarkdownPostProcessor((el, ctx) =>
			this.bibleMarkupProcessor.processInlineBibleReferences(el, ctx));

		// Register editor extension for Live Preview
		if (this.settings.displayInlineVerses) {
			this.registerEditorExtension(createInlineReferenceExtension(this.bibleContentService, this.bibleEventHandlers));
		}

		// Register commands
		this.addCommand({
			id: 'open-bible',
			name: 'Open Bible',
			callback: () => new OpenBibleModal(this.app, this.bibleFiles).open()
		});

		this.addCommand({
			id: 'update-bible-note-frontmatter',
			name: 'Update frontmatter on all Bible notes',
			callback: () => this.updateAllBibleNoteFrontmatter()
		});

		// Ribbon icon
		this.addRibbonIcon('book-open', 'Open Bible', () => {
			new OpenBibleModal(this.app, this.bibleFiles).open();
		});

		// Register settings tab
		this.addSettingTab(new DisciplesJournalSettingsTab(this.app, this));

		// Register active leaf change to update styles
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.handleActiveLeafChange()));
	}

	onunload() {
	}

	async loadSettings() {
		const savedData = (await this.loadData()) as Partial<DisciplesJournalSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
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
	public async openChapterNote(reference: BibleReference) {
		return this.bibleFiles.openChapterNote(reference);
	}

	/**
	 * Scan all Bible notes and update their frontmatter with the current custom frontmatter settings.
	 */
	private async updateAllBibleNoteFrontmatter() {
		const basePath = normalizePath(this.settings.bibleContentVaultPath);
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
				const canonical: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.canonical;
				if (typeof canonical !== 'string') {
					skippedCount++;
					continue;
				}

				const ref = BibleReference.parse(canonical);
				if (!ref) {
					skippedCount++;
					continue;
				}

				const customYaml = getCustomFrontmatterForReference(ref, this.settings);
				if (!customYaml.trim()) {
					skippedCount++;
					continue;
				}

				await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					applyCustomFrontmatter(fm, customYaml);
				});
				updatedCount++;
			} catch (e) {
				console.warn(`Disciples Journal: failed to update frontmatter for ${file.path}`, e);
				skippedCount++;
			}
		}

		new Notice(`Updated frontmatter on ${updatedCount} Bible note(s). Skipped ${skippedCount}.`);
	}
} 
