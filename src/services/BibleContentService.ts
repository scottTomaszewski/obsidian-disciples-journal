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
					return ESVApiService.toBibleApiResponse(parseYaml(frontmatter.frontmatter), ref);
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

	/**
	 * Resolve a possibly non-contiguous reference string ("Genesis 1:2-3, 5") by parsing
	 * it into runs and resolving each. Returns one BiblePassage whose HTML is the runs'
	 * HTML concatenated and whose reference is the first run (used for the heading/link).
	 * Falls back to single-ref resolution when the string isn't a list.
	 */
	public async getBibleContentList(referenceText: string): Promise<BibleApiResponse> {
		const runs = BibleReference.parseList(referenceText);
		if (!runs || runs.length === 0) {
			const single = BibleReference.parse(referenceText);
			if (!single) return BibleApiResponse.error(`Invalid reference: ${referenceText}`, ErrorType.BadApiResponse);
			return this.getBibleContent(single);
		}
		if (runs.length === 1) return this.getBibleContent(runs[0]);

		let html = "";
		for (const run of runs) {
			const res = await this.getBibleContent(run);
			if (res.isError()) return res;
			html += res.passage.html;
		}
		return BibleApiResponse.success(new BiblePassage(runs[0], html));
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
