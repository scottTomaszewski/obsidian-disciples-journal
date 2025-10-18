import {requestUrl, stringifyYaml} from "obsidian";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import {BibleReference} from "../core/BibleReference";
import {BookNames} from "./BookNames";
import {BiblePassage} from "../utils/BiblePassage";
import {BibleApiResponse, ErrorType} from "../utils/BibleApiResponse";
import {BibleFiles} from "./BibleFiles";

/**
 * Interface for ESV API Response
 */
export interface ESVApiResponse {
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
	 * Get the full vault path including version subdirectory
	 */
	private getFullContentPath(): string {
		return `${this.plugin.settings.bibleContentVaultPath}/ESV`;
	}

	/**
	 * Download Bible content from the ESV API
	 */
	// TODO - this should probably take in a BibleReference instead of a string
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
				const canonicalRef = BibleReference.parse(data.canonical);
				if (!canonicalRef) {
					const message = `Failed to parse canonical reference (${data.canonical}) from ESV API for ${ref.toString()}`;
					console.error(message);
					return BibleApiResponse.error(message, ErrorType.BadApiResponse);
				}
				return BibleApiResponse.success(new BiblePassage(canonicalRef, data.passages[0]));
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
			// Extract book and chapter from the canonical reference
			const parts = data.canonical.split(' ');
			if (parts.length < 2) return;
			const book = parts.slice(0, -1).join(' ');

			// Create the directory structure with version subdirectory
			const fullPath = this.getFullContentPath();
			const bookPath = `${fullPath}/${book}`;
			await this.ensureVaultDirectoryExists(fullPath);
			await this.ensureVaultDirectoryExists(bookPath);

			// Save the raw API response as JSON
			const passage = BibleReference.parse(data.canonical);
			const filePath = BibleFiles.pathForPassage(passage, this.plugin);
			console.log(filePath);
			let content = "---\n"
			content += stringifyYaml(data);
			content += "\n---\n\n";
			content += "~~~bible\n"
			content += data.canonical;
			content += "\n~~~\n\n";
			await this.plugin.app.vault.adapter.write(filePath, content);
		} catch (error) {
			console.error('Error saving ESV API response:', error);
		}
	}

	/**
	 * Ensure vault directory exists, creating it if necessary
	 */
	private async ensureVaultDirectoryExists(path: string): Promise<void> {
		const parts = path.split('/').filter(p => p.length > 0);
		let currentPath = '';

		for (const part of parts) {
			currentPath += (currentPath ? '/' : '') + part;
			if (!(await this.plugin.app.vault.adapter.exists(currentPath))) {
				await this.plugin.app.vault.adapter.mkdir(currentPath);
			}
		}
	}
}
