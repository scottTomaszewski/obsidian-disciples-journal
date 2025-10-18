import {BookNames} from "../services/BookNames";

/**
 * Represents a Bible Reference with book, chapter, and verse information
 */
export class BibleReference {
	book: string;
	chapter: number;
	verse?: number;
	endVerse?: number;
	endChapter?: number;

	/**
	 * Create a new Bible reference
	 */
	constructor(book: string, chapter: number, verse?: number, endVerse?: number, endChapter?: number) {
		const normalizedBook = BookNames.normalize(book);
		if (!normalizedBook) {
			throw new Error(`Illegal book name: ${book}`)
		}
		this.book = normalizedBook;
		this.chapter = chapter;
		this.verse = verse;
		this.endVerse = endVerse;
		this.endChapter = endChapter;
	}

	/**
	 * Parse a string into a BibleReference object
	 * Handles various formats like:
	 * - John 3:16
	 * - Genesis 1:1-10
	 * - Ephesians 1-2
	 * - Philippians 1:27-2:11
	 */
	public static parse(reference: string): BibleReference | null {
		reference = reference.trim();

		if (!reference) {
			return null;
		}

		try {
			// Extract book name
			const book = BookNames.extractBookFromReference(reference);
			if (!book) {
				return null;
			}

			// Standardize the book name
			const standardizedBook = BookNames.normalize(book);
			if (!standardizedBook) {
				return null;
			}

			// Remove the book name to parse the chapter and verse
			let chapterVerseText = reference.substring(book.length).trim();
			chapterVerseText = chapterVerseText.replace("–", "-").replace("–", "-");

			// Cross-chapter reference pattern (e.g., "1:2-3:4")
			const crossChapterPattern = /^(\d+):(\d+)-(\d+):(\d+)$/;
			const crossChapterMatch = chapterVerseText.match(crossChapterPattern);
			if (crossChapterMatch) {
				const chapter = parseInt(crossChapterMatch[1]);
				const verse = parseInt(crossChapterMatch[2]);
				const endChapter = parseInt(crossChapterMatch[3]);
				const endVerse = parseInt(crossChapterMatch[4]);

				return new BibleReference(standardizedBook, chapter, verse, endVerse, endChapter);
			}

			// Chapter range pattern (e.g., "1-2")
			const chapterRangePattern = /^(\d+)-(\d+)$/;
			const chapterRangeMatch = chapterVerseText.match(chapterRangePattern);
			if (chapterRangeMatch) {
				const chapter = parseInt(chapterRangeMatch[1]);
				const endChapter = parseInt(chapterRangeMatch[2]);

				return new BibleReference(standardizedBook, chapter, undefined, endChapter);
			}

			// Verse range pattern (e.g., "1:2-10")
			const verseRangePattern = /^(\d+):(\d+)-(\d+)$/;
			const verseRangeMatch = chapterVerseText.match(verseRangePattern);
			if (verseRangeMatch) {
				const chapter = parseInt(verseRangeMatch[1]);
				const verse = parseInt(verseRangeMatch[2]);
				const endVerse = parseInt(verseRangeMatch[3]);

				return new BibleReference(standardizedBook, chapter, verse, endVerse, undefined);
			}

			// Single verse pattern (e.g., "1:2")
			const singleVersePattern = /^(\d+):(\d+)$/;
			const singleVerseMatch = chapterVerseText.match(singleVersePattern);
			if (singleVerseMatch) {
				const chapter = parseInt(singleVerseMatch[1]);
				const verse = parseInt(singleVerseMatch[2]);

				return new BibleReference(standardizedBook, chapter, verse);
			}

			// Single chapter pattern (e.g., "1")
			const singleChapterPattern = /^(\d+)$/;
			const singleChapterMatch = chapterVerseText.match(singleChapterPattern);
			if (singleChapterMatch) {
				const chapter = parseInt(singleChapterMatch[1]);

				return new BibleReference(standardizedBook, chapter);
			}

			return null;
		} catch (error) {
			console.error(`Error parsing Bible reference "${reference}":`, error);
			return null;
		}
	}

	/**
	 * Get the formatted reference as a string
	 */
	public toString(): string {
		let reference = `${this.book} ${this.chapter}`;

		// Add verse if present
		if (this.verse !== undefined) {
			reference += `:${this.verse}`;

			// Add end verse if present (for ranges within same chapter)
			if (this.endVerse !== undefined && this.endChapter === undefined) {
				reference += `-${this.endVerse}`;
			}
		}

		// Handle cross-chapter reference
		if (this.endChapter !== undefined) {
			reference += `-${this.endChapter}`;

			// Add end verse if present for a cross-chapter reference
			if (this.endVerse !== undefined) {
				reference += `:${this.endVerse}`;
			}
		}

		return reference;
	}

	/**
	 * Create a deep copy of the reference
	 */
	public clone(): BibleReference {
		return new BibleReference(
			this.book,
			this.chapter,
			this.verse,
			this.endVerse,
			this.endChapter
		);
	}

	/**
	 * Determine if this reference is a range (spans multiple verses)
	 */
	public isRange(): boolean {
		return this.endVerse !== undefined || this.endChapter !== undefined;
	}

	/**
	 * Check if this is a chapter reference (no specific verse)
	 */
	public isChapterReference(): boolean {
		return this.verse === undefined;
	}

	/**
	 * Compare this reference with another to check if they refer to the same passage
	 */
	public equals(other: BibleReference): boolean {
		return this.book === other.book &&
			this.chapter === other.chapter &&
			this.verse === other.verse &&
			this.endVerse === other.endVerse &&
			this.endChapter === other.endChapter;
	}

	/**
	 * Returns a reference string suitable for display in UI
	 */
	public getDisplayReference(): string {
		// For UI display, we might want to abbreviate the book name
		// or format the reference in a specific way
		return this.toString();
	}

	/**
	 * Returns a reference string suitable for use as a key in the Bible data
	 */
	public getDataKey(): string {
		// For data keys, we often want to use a standardized format
		// This assumes the book name is already standardized
		return `${this.book} ${this.chapter}${this.verse ? `:${this.verse}` : ''}`;
	}

	/**
	 * Creates a reference for the entire chapter containing this reference
	 */
	public getChapterReference(): BibleReference {
		// Create a new reference with the same book and chapter, but no verse info
		return new BibleReference(this.book, this.chapter);
	}
} 
