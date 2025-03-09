import { BibleReferenceRange, BibleReferenceType } from "../models/BibleReference";

export class BibleReferenceParser {
    // Regular expression to match Bible references
    // This pattern handles various formats like:
    // Genesis 1:1
    // Gen 1:1
    // Genesis 1:1-10
    // Genesis 1:1-2:10
    // Genesis 1
    // 1 John 2:3
    private static referenceRegex = 
        /(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(\d+)(?::(\d+)(?:-(\d+))?)?(?:-(\d+)(?::(\d+))?)?/;

    /**
     * Parse a Bible reference string into its components
     * Examples: "Genesis 1:1", "John 3:16-18", "Psalm 23", "Matthew 5:3-7:29"
     */
    public static parseReference(text: string): BibleReferenceRange | null {
        // Clean up the text to normalize whitespace
        const cleanText = text.trim().replace(/\s+/g, ' ');
        const match = this.referenceRegex.exec(cleanText);
        
        if (!match) {
            console.log(`Failed to parse reference: "${text}"`);
            return null;
        }

        try {
            const [_, book, chapter, startVerse, endVerseInSameChapter, endChapter, endVerse] = match;
            
            // Extract book, ensuring it's properly formatted
            const bookName = book.trim();
            
            // Parse the chapter number
            const chapterNum = parseInt(chapter);
            if (isNaN(chapterNum)) {
                console.log(`Invalid chapter number in "${text}"`);
                return null;
            }
            
            // Handle case where reference is to a whole chapter (e.g., "Genesis 1")
            if (!startVerse) {
                return {
                    book: bookName,
                    startChapter: chapterNum,
                    startVerse: 1,
                };
            }
            
            // Parse the starting verse
            const startVerseNum = parseInt(startVerse);
            if (isNaN(startVerseNum)) {
                console.log(`Invalid start verse number in "${text}"`);
                return null;
            }
            
            // Handle case where reference is to a single verse (e.g., "Genesis 1:1")
            if (!endVerseInSameChapter && !endChapter) {
                return {
                    book: bookName,
                    startChapter: chapterNum,
                    startVerse: startVerseNum,
                };
            }

            // Handle case where reference is to a range within the same chapter (e.g., "Genesis 1:1-10")
            if (endVerseInSameChapter) {
                const endVerseNum = parseInt(endVerseInSameChapter);
                if (isNaN(endVerseNum)) {
                    console.log(`Invalid end verse number in "${text}"`);
                    return null;
                }
                
                return {
                    book: bookName,
                    startChapter: chapterNum,
                    startVerse: startVerseNum,
                    endChapter: chapterNum,
                    endVerse: endVerseNum,
                };
            }

            // Handle case where reference spans multiple chapters (e.g., "Matthew 5:3-7:29")
            if (endChapter) {
                const endChapterNum = parseInt(endChapter);
                if (isNaN(endChapterNum)) {
                    console.log(`Invalid end chapter number in "${text}"`);
                    return null;
                }
                
                // If there's no end verse specified, assume the entire chapter
                let endVerseNum = 1;
                if (endVerse) {
                    endVerseNum = parseInt(endVerse);
                    if (isNaN(endVerseNum)) {
                        console.log(`Invalid end verse number in "${text}"`);
                        return null;
                    }
                }
                
                return {
                    book: bookName,
                    startChapter: chapterNum,
                    startVerse: startVerseNum,
                    endChapter: endChapterNum,
                    endVerse: endVerseNum,
                };
            }
            
            // This shouldn't happen with our regex, but just in case
            console.log(`Unable to parse reference format: "${text}"`);
            return null;
            
        } catch (error) {
            console.error(`Error parsing reference "${text}":`, error);
            return null;
        }
    }

    /**
     * Determine the type of reference (verse, passage, chapter)
     */
    public static getReferenceType(reference: BibleReferenceRange): BibleReferenceType {
        // If no end chapter or verse is specified, it's a single verse
        if (!reference.endChapter && !reference.endVerse) {
            return 'verse';
        }
        
        // If the end chapter is different from the start chapter, it's a multi-chapter passage
        if (reference.endChapter && reference.endChapter !== reference.startChapter) {
            return 'passage';
        }
        
        // If the start verse is 1 and no end verse is specified, it's a whole chapter
        if (reference.startVerse === 1 && !reference.endVerse) {
            return 'chapter';
        }
        
        // Otherwise, it's a passage within a chapter
        return 'passage';
    }
} 