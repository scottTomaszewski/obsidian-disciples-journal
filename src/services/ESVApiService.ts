import {normalizePath, requestUrl, TFile} from "obsidian";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import {BibleReference} from "../core/BibleReference";
import {BookNames} from "./BookNames";
import {BiblePassage} from "../utils/BiblePassage";
import {BibleApiResponse, ErrorType} from "../utils/BibleApiResponse";
import {BibleFiles} from "./BibleFiles";
import {applyCustomFrontmatter, getCustomFrontmatterForReference} from "../utils/FrontmatterUtil";

/**
 * Interface for ESV API Response
 */
export type ESVApiResponse = {
	query: string;
	canonical: string;
	parsed: number[][];
	passage_meta: ESVPassageMeta[];
	passages: string[];
}

/**
 * Interface for ESV Passage Metadata
 */
export interface ESVPassageMeta {
	canonical: string;
	chapter_start: number[];
	chapter_end: number[];
	prev_verse: number | null;
	next_verse: number | null;
	prev_chapter: number | null;
	next_chapter: number[] | null;
}

/**
 * Service for interacting with the ESV API
 */
export class ESVApiService {
	private plugin: DisciplesJournalPlugin;

	// Store HTML formatted Bible chapters
	constructor(plugin: DisciplesJournalPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Convert a raw ESV API response into a BibleApiResponse. Handles both freshly
	 * downloaded responses and ones re-read from a saved note's frontmatter (hence
	 * the loosely-typed input). `contextRef` is only used for error messages.
	 */
	public static toBibleApiResponse(data: unknown, contextRef: BibleReference): BibleApiResponse {
		const response = data as { canonical?: unknown; passages?: unknown } | null;
		const canonical = response && typeof response.canonical === 'string' ? response.canonical : null;
		const canonicalRef = canonical ? BibleReference.parse(canonical) : null;
		if (!canonicalRef) {
			const message = `Failed to parse canonical reference (${String(canonical)}) from ESV API for ${contextRef.toString()}`;
			console.error(message);
			return BibleApiResponse.error(message, ErrorType.BadApiResponse);
		}
		const passages = response && Array.isArray(response.passages) ? response.passages : [];
		const html = typeof passages[0] === 'string' ? passages[0] : '';
		return BibleApiResponse.success(new BiblePassage(canonicalRef, html));
	}

	/**
	 * Download Bible content from the ESV API
	 */
	public async downloadFromESVApi(ref: BibleReference): Promise<BibleApiResponse> {
		if (!this.plugin.settings.esvApiToken) {
			console.error('ESV API token not set. Cannot download content.');
			return BibleApiResponse.error(
				'To display Bible passages, you need to set up an ESV API token in the plugin settings.',
				ErrorType.ApiAuthentication);
		}

		// ESV API has a strange bug where if you request "Obadiah 1" it will only return the first verse. Requesting
		// 999 verses seems to be a workaround
		if (ref.isChapterReference() && BookNames.getChapterCount(ref.book) == 1) {
			ref = new BibleReference(ref.book, ref.chapter, 1, 999);
		}

		try {
			// Encode the reference for the URL
			const encodedRef = encodeURIComponent(ref.toString());
			const apiUrl = `https://api.esv.org/v3/passage/html/?q=${encodedRef}&include-passage-references=false&include-verse-numbers=true&include-first-verse-numbers=true&include-footnotes=true&include-headings=true`;
			const response = await requestUrl({
				url: apiUrl,
				method: 'GET',
				headers: {
					'Authorization': `Token ${this.plugin.settings.esvApiToken}`
				}
			});

			// Check if the request was successful
			if (response.status === 200) {
				const data = response.json as ESVApiResponse;

				// Save the response to a file
				await this.saveESVApiResponseAsMdNote(data);

				// Return the content
				return ESVApiService.toBibleApiResponse(data, ref);
			} else {
				console.error(`ESV API request failed with status ${response.status}: ${response.text}`);
				return BibleApiResponse.error(
					`Failed to load the passage from the ESV API. Status: ${response.status}. Please check your API token in the plugin settings.`,
					ErrorType.BadApiResponse);
			}
		} catch (error) {
			console.error('Error downloading from ESV API:', error);
			return BibleApiResponse.error(
				'An error occurred when trying to access the ESV API. Please check your internet connection and API token.',
				ErrorType.BadApiResponse);
		}
	}

	/**
	 * Save ESV API response to a markdown file (as frontmatter)
	 */
	private async saveESVApiResponseAsMdNote(data: ESVApiResponse): Promise<void> {
		try {
			const passage = BibleReference.parse(data.canonical);
			if (!passage) {
				console.error(`Failed to parse canonical reference from ESV API: ${data.canonical}`);
				return;
			}

			const filePath = normalizePath(BibleFiles.pathForPassage(passage, this.plugin));

			// Ensure the parent folder exists before creating the note.
			const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
			await this.ensureVaultFolderExists(folderPath);

			// Create the note (body only) if it doesn't exist yet; otherwise reuse
			// the existing file and just refresh its frontmatter below.
			const vault = this.plugin.app.vault;
			const existing = vault.getAbstractFileByPath(filePath);
			const file = existing instanceof TFile
				? existing
				: await vault.create(filePath, `\n~~~bible\n${data.canonical}\n~~~\n`);

			// Write the raw API response (plus any custom fields) as frontmatter.
			const customYaml = getCustomFrontmatterForReference(passage, this.plugin.settings);
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				fm.query = data.query;
				fm.canonical = data.canonical;
				fm.parsed = data.parsed;
				fm.passage_meta = data.passage_meta;
				fm.passages = data.passages;
				applyCustomFrontmatter(fm, customYaml);
			});
		} catch (error) {
			console.error('Error saving ESV API response:', error);
		}
	}

	/**
	 * Ensure a vault folder exists, creating any missing path segments.
	 */
	private async ensureVaultFolderExists(path: string): Promise<void> {
		const vault = this.plugin.app.vault;
		const parts = normalizePath(path).split('/').filter(p => p.length > 0);
		let currentPath = '';

		for (const part of parts) {
			currentPath += (currentPath ? '/' : '') + part;
			if (vault.getAbstractFileByPath(currentPath)) {
				continue;
			}
			try {
				await vault.createFolder(currentPath);
			} catch (e) {
				// Ignore races where the folder was created concurrently.
				if (!vault.getAbstractFileByPath(currentPath)) {
					throw e;
				}
			}
		}
	}
}
