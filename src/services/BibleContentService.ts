import { BibleReference } from "../core/BibleReference";
import { BibleReferenceParser } from "../core/BibleReferenceParser";
import { BookNameService } from "./BookNameService";
import { ESVApiService } from "./ESVApiService";
import { BibleDataConverter } from "./BibleDataConverter";

/**
 * Interface for a single Bible verse
 */
export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

/**
 * Structure for traditional Bible content storage (legacy format)
 */
interface Bible {
    [book: string]: {
        [chapter: string]: {
            [verse: string]: string;
        }
    }
}

/**
 * Interface for Bible passage content
 */
export interface BiblePassage {
    reference: string;
    verses: BibleVerse[];
    htmlContent?: string;
    missingToken?: boolean;
}

/**
 * Main service for retrieving Bible content
 */
export class BibleContentService {
    private bible: any = null;
    private bookNameService: BookNameService;
    private esvApiService: ESVApiService;
    private useHtmlFormat: boolean = false;
    private downloadOnDemand: boolean = true;
    private bibleReferenceParser: BibleReferenceParser;
    private dataConverter: BibleDataConverter;

    constructor(bookNameService: BookNameService, esvApiService: ESVApiService) {
        this.bookNameService = bookNameService;
        this.esvApiService = esvApiService;
        this.bibleReferenceParser = new BibleReferenceParser(bookNameService);
        this.dataConverter = new BibleDataConverter(bookNameService);
    }

    /**
     * Set whether to use HTML format or plain text
     */
    public setUseHtmlFormat(use: boolean): void {
        this.useHtmlFormat = use;
    }

    /**
     * Set whether to download content on demand
     */
    public setDownloadOnDemand(download: boolean): void {
        this.downloadOnDemand = download;
    }

    /**
     * Load Bible data into memory
     */
    public loadBible(bibleData: any): void {
        if (!bibleData) {
            this.bible = null;
            return;
        }
        
        this.bible = this.dataConverter.convertToBibleData(bibleData);
    }

    /**
     * Get a single verse by reference
     */
    public getVerse(book: string, chapter: number, verse: number): BibleVerse | null {
        if (!this.bible) return null;
        
        try {
            const normalizedBook = this.bookNameService.getNormalizedBookName(book);
            if (!normalizedBook) return null;
            
            // Check if the book exists in the Bible data
            if (!this.bible[normalizedBook]) return null;
            
            // Check if the chapter exists
            const chapterStr = chapter.toString();
            if (!this.bible[normalizedBook][chapterStr]) return null;
            
            // Check if the verse exists
            const verseStr = verse.toString();
            if (!this.bible[normalizedBook][chapterStr][verseStr]) return null;
            
            // Return the verse
            return {
                book: normalizedBook,
                chapter: chapter,
                verse: verse,
                text: this.bible[normalizedBook][chapterStr][verseStr]
            };
        } catch (error) {
            console.error('Error getting verse:', error);
            return null;
        }
    }

    /**
     * Get a passage by reference
     * This handles everything from single verses to full chapters
     */
    public getPassage(reference: BibleReference): BiblePassage | null {
        if (!this.bible) return null;
        
        try {
            const normalizedBook = this.bookNameService.getNormalizedBookName(reference.book);
            if (!normalizedBook) return null;
            
            // Prepare the result
            const result: BiblePassage = {
                reference: reference.toString(),
                verses: []
            };
            
            // Get the chapter
            const chapterStr = reference.chapter.toString();
            if (!this.bible[normalizedBook][chapterStr]) return null;
            
            // If verse is specified, get just that verse or verse range
            if (reference.verse) {
                // Single verse
                if (!reference.endVerse) {
                    const verse = this.getVerse(normalizedBook, reference.chapter, reference.verse);
                    if (verse) {
                        result.verses.push(verse);
                    }
                } 
                // Verse range
                else {
                    // Add all verses in the range
                    for (let v = reference.verse; v <= reference.endVerse; v++) {
                        const verse = this.getVerse(normalizedBook, reference.chapter, v);
                        if (verse) {
                            result.verses.push(verse);
                        }
                    }
                }
            }
            // No verse specified, get the whole chapter
            else {
                // Get all verses in the chapter
                const chapter = this.bible[normalizedBook][chapterStr];
                if (chapter) {
                    const verseNumbers = Object.keys(chapter).map(v => parseInt(v)).sort((a, b) => a - b);
                    
                    for (const verseNum of verseNumbers) {
                        const verse = this.getVerse(normalizedBook, reference.chapter, verseNum);
                        if (verse) {
                            result.verses.push(verse);
                        }
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error getting passage:', error);
            return null;
        }
    }

    /**
     * Get a full chapter
     */
    public getChapter(book: string, chapter: number): BiblePassage | null {
        const reference = new BibleReference(book, chapter);
        return this.getPassage(reference);
    }

    /**
     * Get Bible content from any source (local or API)
     */
    public async getBibleContent(referenceString: string): Promise<BiblePassage | null> {
        try {
            // Parse the reference
            const parsedRef = this.bibleReferenceParser.parse(referenceString);
            if (!parsedRef) {
                console.error(`Invalid reference: ${referenceString}`);
                return null;
            }
            
            // Try to get from local Bible data first
            let passage = this.getPassage(parsedRef);
            
            // If not available locally and download on demand is enabled, try the API
            if (!passage && this.downloadOnDemand) {
                // Try to get from the ESV API
                passage = await this.esvApiService.downloadFromESVApi(referenceString);
            }
            
            return passage;
        } catch (error) {
            console.error('Error getting Bible content:', error);
            return null;
        }
    }
} 