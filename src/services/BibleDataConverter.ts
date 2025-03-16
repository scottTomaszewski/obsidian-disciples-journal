import { BookNameService } from "./BookNameService";
import { BibleReferenceParser } from "../core/BibleReferenceParser";

/**
 * Structure for traditional Bible content storage
 */
interface Bible {
    [book: string]: {
        [chapter: string]: {
            [verse: string]: string;
        }
    }
}

/**
 * Class to handle conversion between different Bible data formats
 */
export class BibleDataConverter {
    private bookNameService: BookNameService;
    private bibleReferenceParser: BibleReferenceParser;
    
    constructor(bookNameService: BookNameService) {
        this.bookNameService = bookNameService;
        this.bibleReferenceParser = new BibleReferenceParser(bookNameService);
    }
    
    /**
     * Convert any Bible data to our structured format
     */
    public convertToBibleData(bibleData: any): Bible | null {
        if (!bibleData) {
            return null;
        }
        
        try {
            // Check if the data is already in our expected format
            if (this.isStructuredBibleFormat(bibleData)) {
                return bibleData;
            } else if (this.isESVApiFormat(bibleData)) {
                // Convert the ESV API format to our structured format
                return this.convertESVApiData(bibleData);
            } else {
                console.error("Unsupported Bible data format");
                return null;
            }
        } catch (error) {
            console.error("Error converting Bible data:", error);
            return null;
        }
    }
    
    /**
     * Check if data is in structured Bible format
     */
    private isStructuredBibleFormat(data: any): boolean {
        if (!data) return false;
        
        // Check if the data structure matches our expected format
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
     * Convert ESV API data to structured Bible format
     */
    private convertESVApiData(data: any): Bible {
        // Initialize Bible data structure
        const bible: Bible = {};
        
        // Parse the canonical reference to get book, chapter, etc.
        const reference = this.bibleReferenceParser.parse(data.canonical);
        if (!reference) {
            console.error("Could not parse canonical reference:", data.canonical);
            return bible;
        }
        
        // Process each passage in the response
        for (const passageText of data.passages) {
            // Extract verses from the passage text
            const lines = passageText.split("\n");
            for (const line of lines) {
                // Very simplified parsing example
                const verseMatch = line.match(/(\d+):((\d+)[^\d]+)(.*)/);
                if (verseMatch) {
                    const chapter = parseInt(verseMatch[1]);
                    const verse = parseInt(verseMatch[3]);
                    const text = verseMatch[4].trim();
                    
                    // Ensure book and chapter objects exist
                    if (!bible[reference.book]) {
                        bible[reference.book] = {};
                    }
                    if (!bible[reference.book][chapter.toString()]) {
                        bible[reference.book][chapter.toString()] = {};
                    }
                    
                    // Add the verse
                    bible[reference.book][chapter.toString()][verse.toString()] = text;
                }
            }
        }
        
        return bible;
    }
} 