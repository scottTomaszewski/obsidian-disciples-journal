import {parseYaml} from "obsidian";
import {BibleReference} from "../core/BibleReference";
import {DisciplesJournalSettings} from "../settings/DisciplesJournalSettings";

/**
 * Keys owned by the API response. Custom frontmatter must not overwrite these.
 */
const API_KEYS = new Set(['query', 'canonical', 'parsed', 'passage_meta', 'passages']);

const PLUGIN_CSS_CLASS = 'hide-dj-passage-properties';

/**
 * Available template variables for custom frontmatter.
 * Used both for rendering and for generating help text in settings.
 */
export const TEMPLATE_VARIABLES: { variable: string; description: string }[] = [
	{variable: '{{book}}', description: 'Book name (e.g., Genesis)'},
	{variable: '{{chapter}}', description: 'Chapter number (e.g., 1)'},
	{variable: '{{verse}}', description: 'Start verse number (empty for chapter notes)'},
	{variable: '{{endVerse}}', description: 'End verse number (empty if not a range)'},
	{variable: '{{endChapter}}', description: 'End chapter number (empty if not cross-chapter)'},
	{variable: '{{reference}}', description: 'Full reference string (e.g., Genesis 1:5-10)'},
];

/**
 * Build a template context from a BibleReference.
 */
export function buildTemplateContext(ref: BibleReference): Record<string, string> {
	return {
		book: ref.book,
		chapter: String(ref.chapter),
		verse: ref.verse !== undefined ? String(ref.verse) : '',
		endVerse: ref.endVerse !== undefined ? String(ref.endVerse) : '',
		endChapter: ref.endChapter !== undefined ? String(ref.endChapter) : '',
		reference: ref.toString(),
	};
}

/**
 * Render custom frontmatter by substituting {{variable}} placeholders
 * with values from the provided context.
 */
export function renderCustomFrontmatter(
	rawYaml: string,
	context?: Record<string, string>
): string {
	if (!context) {
		return rawYaml;
	}
	return rawYaml.replace(/\{\{(\w+)}}/g, (match: string, key: string) => {
		return key in context ? context[key] : match;
	});
}

/**
 * Parse user-provided YAML, filtering out API-reserved keys.
 * Returns null on empty input or parse failure.
 */
function parseCustomYaml(customYaml: string): Record<string, unknown> | null {
	const trimmed = customYaml.trim();
	if (!trimmed) {
		return null;
	}
	try {
		const parsed = parseYaml(trimmed) as unknown;
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			console.warn('Disciples Journal: custom frontmatter must be a YAML mapping, ignoring.');
			return null;
		}
		// Filter out API-reserved keys
		const source = parsed as Record<string, unknown>;
		const filtered: Record<string, unknown> = {};
		for (const key of Object.keys(source)) {
			if (API_KEYS.has(key)) {
				console.warn(`Disciples Journal: custom frontmatter key "${key}" collides with API data, skipping.`);
				continue;
			}
			filtered[key] = source[key];
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
function mergeCssClasses(existing: unknown, custom: unknown): string[] {
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
 * Apply custom frontmatter onto a mutable frontmatter object, as handed to
 * `FileManager.processFrontMatter()`. API-reserved keys in the custom YAML are
 * filtered out (see {@link parseCustomYaml}), and the plugin css class is always
 * ensured present. Any existing `cssclasses` on the object are preserved.
 *
 * Pass through {@link getCustomFrontmatterForReference} first so template
 * variables are resolved.
 */
export function applyCustomFrontmatter(
	fm: Record<string, unknown>,
	customYaml: string
): void {
	const customData = parseCustomYaml(customYaml);

	// Extract cssclasses from custom data if present
	let customCss: unknown = undefined;
	const customFields: Record<string, unknown> = {};
	if (customData) {
		for (const [key, value] of Object.entries(customData)) {
			if (key === 'cssclasses') {
				customCss = value;
			} else {
				customFields[key] = value;
			}
		}
	}

	// Overlay custom fields onto the frontmatter object
	for (const [key, value] of Object.entries(customFields)) {
		fm[key] = value;
	}

	// Always (re)write cssclasses last so the plugin class is present and any
	// existing/custom classes are merged in.
	fm['cssclasses'] = mergeCssClasses(fm['cssclasses'], customCss);
}

/**
 * Get the appropriate custom frontmatter string for a reference type,
 * with template variables resolved.
 */
export function getCustomFrontmatterForReference(
	ref: BibleReference,
	settings: DisciplesJournalSettings
): string {
	const raw = ref.isChapterReference()
		? settings.chapterNoteFrontmatter
		: settings.passageNoteFrontmatter;
	return renderCustomFrontmatter(raw, buildTemplateContext(ref));
}
