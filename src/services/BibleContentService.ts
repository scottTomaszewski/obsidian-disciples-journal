import { BibleReference } from "../core/BibleReference";
import { BibleReferenceParser } from "../core/BibleReferenceParser";
import { BookNameService } from "./BookNameService";
import { ESVApiService } from "./ESVApiService";

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
}

/**
 * Main service for retrieving Bible content
 */
export class BibleContentService {
    private bible: Bible | null = null;
    private bookNameService: BookNameService;
    private esvApiService: ESVApiService;
    private useHtmlFormat: boolean = false;
    private downloadOnDemand: boolean = true;
    private bibleReferenceParser: BibleReferenceParser;

    constructor(bookNameService: BookNameService, esvApiService: ESVApiService) {
        this.bookNameService = bookNameService;
        this.esvApiService = esvApiService;
        this.bibleReferenceParser = new BibleReferenceParser(bookNameService);
    }

    /**
     * Set whether to use HTML format when available
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
     * Load Bible data from a data source
     */
    public loadBible(bibleData: any): void {
        // Process the raw data into our expected format
        if (!bibleData) {
            console.log("No Bible data provided, skipping load");
            return;
        }

        try {
            console.log("Loading Bible data...");

            // Check if the data is already in our expected format
            if (this.isStructuredBibleFormat(bibleData)) {
                console.log("Data is in structured Bible format");
                this.bible = bibleData;
            } else if (this.isESVApiFormat(bibleData)) {
                console.log("Data is in ESV API format");
                // Convert the ESV API format to our structured format
                this.loadESVApiData(bibleData);
            } else {
                console.error("Unsupported Bible data format");
            }

            console.log("Bible data loaded successfully");
        } catch (error) {
            console.error("Error loading Bible data:", error);
        }
    }

    /**
     * Check if data is in structured Bible format
     */
    private isStructuredBibleFormat(data: any): boolean {
        if (!data) return false;
        
        // Check if the data structure matches our expected format
        // This is a simple check, might need to be enhanced based on actual data structure
        return typeof data === 'object' && 
               Object.keys(data).length > 0 && 
               Object.keys(data).every(bookKey => {
                  const book = data[bookKey];
                  return typeof book === 'object' && 
                         Object.keys(book).every(chapterKey => {
                           const chapter = book[chapterKey];
                           return typeof chapter === 'object';
                         });
               });
    }

    /**
     * Check if data is in ESV API format
     */
    private isESVApiFormat(data: any): boolean {
        if (!data) return false;
        
        // Check if the data matches ESV API response format
        return typeof data === 'object' &&
               data.canonical !== undefined &&
               data.passages !== undefined &&
               Array.isArray(data.passages);
    }

    /**
     * Load data from ESV API format
     */
    private loadESVApiData(data: any): void {
        // Initialize Bible data structure if needed
        if (!this.bible) {
            this.bible = {};
        }

        // Parse the canonical reference to get book, chapter, etc.
        const reference = this.bibleReferenceParser.parse(data.canonical);
        if (!reference) {
            console.error("Could not parse canonical reference:", data.canonical);
            return;
        }

        // Process each passage in the response
        for (const passageText of data.passages) {
            // Extract verses from the passage text (simplified implementation)
            // In a real implementation, you would need proper parsing of ESV HTML
            const lines = passageText.split("\n");
            for (const line of lines) {
                // Very simplified parsing example
                const verseMatch = line.match(/(\d+):((\d+)[^\d]+)(.*)/);
                if (verseMatch) {
                    const chapter = parseInt(verseMatch[1]);
                    const verse = parseInt(verseMatch[3]);
                    const text = verseMatch[4].trim();
                    
                    // Ensure book and chapter objects exist
                    if (!this.bible[reference.book]) {
                        this.bible[reference.book] = {};
                    }
                    if (!this.bible[reference.book][chapter.toString()]) {
                        this.bible[reference.book][chapter.toString()] = {};
                    }
                    
                    // Add the verse
                    this.bible[reference.book][chapter.toString()][verse.toString()] = text;
                }
            }
        }
    }

    /**
     * Get a specific verse by reference
     */
    public getVerse(book: string, chapter: number, verse: number): BibleVerse | null {
        if (!this.bible) {
            console.log("Bible data not loaded");
            return null;
        }

        // Standardize the book name
        const standardBook = this.bookNameService.standardizeBookName(book);
        if (!standardBook) {
            console.log(`Invalid book name: ${book}`);
            return null;
        }

        // Check if the chapter and verse exist
        if (this.bible[standardBook] && 
            this.bible[standardBook][chapter.toString()] && 
            this.bible[standardBook][chapter.toString()][verse.toString()]) {
            
            // Return the verse object
            return {
                book: standardBook,
                chapter: chapter,
                verse: verse,
                text: this.bible[standardBook][chapter.toString()][verse.toString()]
            };
        }

        return null;
    }

    /**
     * Get a passage by reference
     */
    public getPassage(reference: BibleReference): BiblePassage | null {
        if (!reference) return null;

        const standardBook = this.bookNameService.standardizeBookName(reference.book);
        if (!standardBook) return null;

        // Single verse
        if (reference.verse !== undefined && !reference.isRange()) {
            const verse = this.getVerse(standardBook, reference.chapter, reference.verse);
            if (!verse) return null;

            return {
                reference: `${standardBook} ${reference.chapter}:${reference.verse}`,
                verses: [verse]
            };
        }

        // Verse range within the same chapter
        if (reference.verse !== undefined && reference.endVerse !== undefined && 
            reference.endChapter === undefined) {
            const verses: BibleVerse[] = [];
            
            for (let v = reference.verse; v <= reference.endVerse; v++) {
                const verse = this.getVerse(standardBook, reference.chapter, v);
                if (verse) verses.push(verse);
            }

            if (verses.length === 0) return null;

            return {
                reference: `${standardBook} ${reference.chapter}:${reference.verse}-${reference.endVerse}`,
                verses: verses
            };
        }

        // Chapter range
        if (reference.endChapter !== undefined) {
            const verses: BibleVerse[] = [];
            
            for (let c = reference.chapter; c <= reference.endChapter; c++) {
                // First chapter might start at a specific verse
                let startVerse = (c === reference.chapter && reference.verse !== undefined) 
                    ? reference.verse : 1;
                
                // Get all verses in this chapter
                if (this.bible && this.bible[standardBook] && this.bible[standardBook][c.toString()]) {
                    const chapterVerses = this.bible[standardBook][c.toString()];
                    const verseNums = Object.keys(chapterVerses).map(v => parseInt(v)).sort((a, b) => a - b);
                    
                    // Last chapter might end at a specific verse
                    const endVerse = (c === reference.endChapter && reference.endVerse !== undefined)
                        ? reference.endVerse
                        : Math.max(...verseNums);
                    
                    for (let v = startVerse; v <= endVerse; v++) {
                        const verse = this.getVerse(standardBook, c, v);
                        if (verse) verses.push(verse);
                    }
                }
            }

            if (verses.length === 0) return null;

            // Format reference string
            let refStr = `${standardBook} ${reference.chapter}`;
            if (reference.verse !== undefined) refStr += `:${reference.verse}`;
            refStr += `-${reference.endChapter}`;
            if (reference.endVerse !== undefined) refStr += `:${reference.endVerse}`;

            return {
                reference: refStr,
                verses: verses
            };
        }

        // Entire chapter
        if (reference.verse === undefined) {
            const verses: BibleVerse[] = [];
            
            if (this.bible && this.bible[standardBook] && this.bible[standardBook][reference.chapter.toString()]) {
                const chapterVerses = this.bible[standardBook][reference.chapter.toString()];
                const verseNums = Object.keys(chapterVerses).map(v => parseInt(v)).sort((a, b) => a - b);
                
                for (const v of verseNums) {
                    const verse = this.getVerse(standardBook, reference.chapter, v);
                    if (verse) verses.push(verse);
                }
            }

            if (verses.length === 0) return null;

            return {
                reference: `${standardBook} ${reference.chapter}`,
                verses: verses
            };
        }

        return null;
    }

    /**
     * Get an entire chapter
     */
    public getChapter(book: string, chapter: number): BiblePassage | null {
        // Create a reference for the chapter
        const chapterRef = new BibleReference(book, chapter);
        return this.getPassage(chapterRef);
    }

    /**
     * Get Bible content based on reference string
     */
    public async getBibleContent(referenceString: string): Promise<BiblePassage | null> {
        // Skip if reference string is empty or null
        if (!referenceString || !referenceString.trim()) {
            return null;
        }

        try {
            // Parse the reference string to get the structured reference
            const reference = this.bibleReferenceParser.parse(referenceString);
            if (!reference) {
                console.log(`Could not parse reference: ${referenceString}`);
                return null;
            }

            // First check if we have HTML content available through the ESV API service
            if (this.useHtmlFormat) {
                const htmlContent = this.esvApiService.getHTMLContent(referenceString);
                if (htmlContent) {
                    return htmlContent;
                }
            }

            // If the content is not found and download on demand is enabled, try to download it
            if (this.downloadOnDemand) {
                const downloadedContent = await this.esvApiService.downloadFromESVApi(referenceString);
                if (downloadedContent) {
                    return downloadedContent;
                }
            }

            // As a fallback, try to get the content from our structured Bible data
            const passageContent = this.getPassage(reference);
            if (passageContent) {
                return passageContent;
            }

            return null;
        } catch (error) {
            console.error(`Error getting Bible content for "${referenceString}":`, error);
            return null;
        }
    }
} 