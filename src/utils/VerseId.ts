/** A chapter+verse coordinate within a single book. */
export interface VerseRef {
	chapter: number;
	verse: number;
}

const VERSE_ID = /^v\d{2}(\d{3})(\d{3})-\d+$/;

/**
 * Parse an ESV passage marker id (e.g. "v01001002-1" on a `verse-num`/`chapter-num`
 * `<b>`) into its chapter and verse. Returns null for ids that aren't verse markers.
 * Book digits are ignored — callers know the book from the passage reference.
 */
export function parseVerseId(id: string): VerseRef | null {
	const m = VERSE_ID.exec(id);
	if (!m) return null;
	return { chapter: parseInt(m[1], 10), verse: parseInt(m[2], 10) };
}
