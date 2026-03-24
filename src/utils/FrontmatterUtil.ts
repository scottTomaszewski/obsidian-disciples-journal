import {parseYaml, stringifyYaml} from "obsidian";
import {BibleReference} from "../core/BibleReference";
import {DisciplesJournalSettings} from "../settings/DisciplesJournalSettings";

/**
 * Keys owned by the API response. Custom frontmatter must not overwrite these.
 */
const API_KEYS = new Set(['query', 'canonical', 'parsed', 'passage_meta', 'passages']);

const PLUGIN_CSS_CLASS = 'hide-dj-passage-properties';

/**
 * Render custom frontmatter through the template engine.
 * Currently a passthrough -- future hook for {{book}}, {{chapter}}, etc.
 */
export function renderCustomFrontmatter(
	rawYaml: string,
	_context?: Record<string, string>
): string {
	return rawYaml;
}

/**
 * Parse user-provided YAML, filtering out API-reserved keys.
 * Returns null on empty input or parse failure.
 */
function parseCustomYaml(customYaml: string): Record<string, any> | null {
	const trimmed = customYaml.trim();
	if (!trimmed) {
		return null;
	}
	try {
		const parsed = parseYaml(trimmed);
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			console.warn('Disciples Journal: custom frontmatter must be a YAML mapping, ignoring.');
			return null;
		}
		// Filter out API-reserved keys
		const filtered: Record<string, any> = {};
		for (const key of Object.keys(parsed)) {
			if (API_KEYS.has(key)) {
				console.warn(`Disciples Journal: custom frontmatter key "${key}" collides with API data, skipping.`);
				continue;
			}
			filtered[key] = parsed[key];
		}
		return Object.keys(filtered).length > 0 ? filtered : null;
	} catch (e) {
		console.warn('Disciples Journal: failed to parse custom frontmatter YAML, ignoring.', e);
		return null;
	}
}

/**
 * Merge cssclasses, ensuring PLUGIN_CSS_CLASS is always present.
 * Handles string, array, or undefined inputs from both sides.
 */
function mergeCssClasses(existing: any, custom: any): string[] {
	const classes = new Set<string>();
	classes.add(PLUGIN_CSS_CLASS);

	for (const val of [existing, custom]) {
		if (Array.isArray(val)) {
			val.forEach(v => classes.add(String(v)));
		} else if (typeof val === 'string' && val.trim()) {
			classes.add(val.trim());
		}
	}

	return Array.from(classes);
}

/**
 * Build the complete frontmatter YAML body for a new note.
 * Returns the YAML content without the --- delimiters.
 */
export function buildFrontmatterString(
	apiData: Record<string, any>,
	customYaml: string
): string {
	// Separate cssclasses from API data so we can place it last
	const {cssclasses: apiCss, ...apiFields} = apiData;
	const customData = parseCustomYaml(customYaml);

	// Extract cssclasses from custom data if present
	let customCss: any = undefined;
	const customFields: Record<string, any> = {};
	if (customData) {
		for (const [key, value] of Object.entries(customData)) {
			if (key === 'cssclasses') {
				customCss = value;
			} else {
				customFields[key] = value;
			}
		}
	}

	// Build the combined object: API fields, then custom fields, then cssclasses last
	const combined: Record<string, any> = {...apiFields};
	for (const [key, value] of Object.entries(customFields)) {
		combined[key] = value;
	}
	combined['cssclasses'] = mergeCssClasses(apiCss, customCss);

	return stringifyYaml(combined);
}

/**
 * Merge custom frontmatter into an existing note's frontmatter YAML string.
 * Returns the new YAML body without --- delimiters.
 */
export function mergeCustomFrontmatterIntoExisting(
	existingFrontmatter: string,
	customYaml: string
): string | null {
	const customData = parseCustomYaml(customYaml);
	if (!customData) {
		return null;
	}

	let existing: Record<string, any>;
	try {
		existing = parseYaml(existingFrontmatter);
		if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
			console.warn('Disciples Journal: existing frontmatter is not a valid YAML mapping, skipping merge.');
			return null;
		}
	} catch (e) {
		console.warn('Disciples Journal: failed to parse existing frontmatter, skipping merge.', e);
		return null;
	}

	// Extract cssclasses from custom data if present
	let customCss: any = undefined;
	const customFields: Record<string, any> = {};
	for (const [key, value] of Object.entries(customData)) {
		if (key === 'cssclasses') {
			customCss = value;
		} else {
			customFields[key] = value;
		}
	}

	// Overlay custom fields onto existing
	for (const [key, value] of Object.entries(customFields)) {
		existing[key] = value;
	}

	// Merge cssclasses if custom has them
	if (customCss !== undefined) {
		existing['cssclasses'] = mergeCssClasses(existing['cssclasses'], customCss);
	}

	return stringifyYaml(existing);
}

/**
 * Get the appropriate custom frontmatter string for a reference type.
 */
export function getCustomFrontmatterForReference(
	ref: BibleReference,
	settings: DisciplesJournalSettings
): string {
	const raw = ref.isChapterReference()
		? settings.chapterNoteFrontmatter
		: settings.passageNoteFrontmatter;
	return renderCustomFrontmatter(raw);
}
