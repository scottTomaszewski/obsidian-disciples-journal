import { BookNameService } from "../services/BookNameService";
import { BibleReference } from "./BibleReference";

/**
 * Utility for parsing Bible references from text
 */
export class BibleReferenceParser {
    private bookNameService: BookNameService;
    
    /**
     * Creates a new BibleReferenceParser
     */
    constructor(bookNameService: BookNameService) {
        this.bookNameService = bookNameService;
    }
    
    /**
     * Parse a string into a BibleReference object
     * Handles various formats like:
     * - John 3:16
     * - Genesis 1:1-10
     * - Ephesians 1-2
     * - Philippians 1:27-2:11
     */
    public parse(reference: string): BibleReference | null {
        reference = reference.trim();
        
        if (!reference) {
            return null;
        }
        
        try {
            // Extract book name
            const book = this.bookNameService.extractBookFromReference(reference);
            if (!book) {
                return null;
            }
            
            // Standardize the book name
            const standardizedBook = this.bookNameService.standardizeBookName(book);
            if (!standardizedBook) {
                return null;
            }
            
            // Remove the book name to parse the chapter and verse
            const chapterVerseText = reference.substring(book.length).trim();
            
            // Cross-chapter reference pattern (e.g., "1:2-3:4")
            const crossChapterPattern = /^(\d+):(\d+)-(\d+):(\d+)$/;
            const crossChapterMatch = chapterVerseText.match(crossChapterPattern);
            if (crossChapterMatch) {
                const chapter = parseInt(crossChapterMatch[1]);
                const verse = parseInt(crossChapterMatch[2]);
                const endChapter = parseInt(crossChapterMatch[3]);
                const endVerse = parseInt(crossChapterMatch[4]);
                
                return new BibleReference(standardizedBook, chapter, verse, endChapter, endVerse);
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
                
                return new BibleReference(standardizedBook, chapter, verse, undefined, endVerse);
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
     * Check if a string may be a valid Bible reference
     */
    public isValidReference(text: string): boolean {
        return this.parse(text) !== null;
    }
    
    /**
     * Find Bible references in a block of text
     */
    public findReferences(text: string): BibleReference[] {
        // Pattern to find potential Bible references
        // Looks for patterns like "Book Chapter:Verse" or "Book Chapter"
        const possibleRefs = text.match(/\b[1-3]?\s*[A-Za-z]+\s+\d+(?::\d+)?(?:-\d+(?::\d+)?)?\b/g) || [];
        
        const references: BibleReference[] = [];
        for (const ref of possibleRefs) {
            const parsedRef = this.parse(ref);
            if (parsedRef) {
                references.push(parsedRef);
            }
        }
        
        return references;
    }
} 