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
        this.book = book;
        this.chapter = chapter;
        this.verse = verse;
        this.endVerse = endVerse;
        this.endChapter = endChapter;
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