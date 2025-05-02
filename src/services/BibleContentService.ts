import {BibleReference} from "../core/BibleReference";
import {ESVApiService} from "./ESVApiService";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";
import {BiblePassage} from "../utils/BiblePassage";
import {BibleApiResponse, ErrorType} from "../utils/BibleApiResponse";

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

		// Otherwise, grab from the API
		if (this.plugin.settings.downloadOnDemand) {
			//console.log(`Pulling passage(s) (${referenceString}) from ESV API`)
			// Try to get from the ESV API
			const response = await this.esvApiService.downloadFromESVApi(ref);
			if (response.isError()) {
				return response
			} else {
				this.cacheRef(response.passage);
				return response;
			}
		} else {
			console.error(`Settings "downloadOnDemand" is false. Skipping request to get passage ${ref}`);
			return BibleApiResponse.error(`Settings prevent download of passage ${ref}`, ErrorType.RequestsForbidden)
		}
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
