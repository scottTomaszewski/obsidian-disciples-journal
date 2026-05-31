import {BibleReference} from "../core/BibleReference";
import {ESVApiService} from "./ESVApiService";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import {BiblePassage} from "../utils/BiblePassage";
import {BibleApiResponse, ErrorType} from "../utils/BibleApiResponse";
import {BibleFiles} from "./BibleFiles";
import {getFrontMatterInfo, parseYaml} from "obsidian";

/**
 * Main service for retrieving Bible content
 */
export class BibleContentService {
	private plugin: DisciplesJournalPlugin;
	private passageCache: Map<BibleReference, BiblePassage>;
	private esvApiService: ESVApiService;

	constructor(plugin: DisciplesJournalPlugin, esvApiService: ESVApiService) {
		this.plugin = plugin;
		this.esvApiService = esvApiService;
		this.passageCache = new Map();
	}

	/**
	 * Get Bible content from any source (local or API)
	 */
	public async getBibleContent(ref: BibleReference): Promise<BibleApiResponse> {
		//  Return cached result if available
		const passage = this.getCachedRef(ref);
		if (passage) {
			return BibleApiResponse.success(passage);
		}

		// Load from local file
		const passageMdFile = BibleFiles.fileExistsForPassage(ref, this.plugin)
			? BibleFiles.getFileForPassage(ref, this.plugin)
			: null;
		if (passageMdFile) {
			try {
				const fileContent = await this.plugin.app.vault.read(passageMdFile);
				const frontmatter = getFrontMatterInfo(fileContent);
				
				if (frontmatter && frontmatter.frontmatter) {
					return this.convertEsvApiResponseToGeneric(parseYaml(frontmatter.frontmatter), ref);
				} else {
					const message = `No frontmatter found in file for reference ${ref.toString()}. Loading from API instead.`;
					console.error(message);
					// return BibleApiResponse.error(message, ErrorType.BadApiResponse);
				}
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				const message = `Error reading file for reference ${ref.toString()}: ${detail}`;
				console.error(message);
				return BibleApiResponse.error(message, ErrorType.BadApiResponse);
			}
		}

		// Otherwise, grab from the API
		if (this.plugin.settings.downloadOnDemand) {
			const response = await this.esvApiService.downloadFromESVApi(ref);
			if (response.isError()) {
				return response
			} else {
				this.cacheRef(response.passage);
				return response;
			}
		} else {
			console.error(`Settings "downloadOnDemand" is false. Skipping request to get passage ${ref.toString()}`);
			return BibleApiResponse.error(`Settings prevent download of passage ${ref.toString()}`, ErrorType.RequestsForbidden)
		}
	}

	// TODO - I would like this to go away once I normalize things a bit.  This code is duplicated within ESVAPIService
	private convertEsvApiResponseToGeneric(frontmatter: unknown, ref: BibleReference) {
		const fm = frontmatter as { canonical?: unknown; passages?: unknown } | null;
		const canonical = fm && typeof fm.canonical === 'string' ? fm.canonical : null;
		const canonicalRef = canonical ? BibleReference.parse(canonical) : null;
		if (!canonicalRef) {
			const message = `Failed to parse canonical reference (${String(canonical)}) from ESV API for ${ref.toString()}`;
			console.error(message);
			return BibleApiResponse.error(message, ErrorType.BadApiResponse);
		}
		const passages = fm && Array.isArray(fm.passages) ? (fm.passages as unknown[]) : [];
		const html = typeof passages[0] === 'string' ? passages[0] : '';
		return BibleApiResponse.success(new BiblePassage(canonicalRef, html));
	}

	private getCachedRef(ref: BibleReference): BiblePassage | undefined {
		if (this.passageCache.has(ref)) {
			return this.passageCache.get(ref);
		}
	}

	private cacheRef(passage: BiblePassage) {
		this.passageCache.set(passage.reference, passage);
	}
}
