import { App } from "obsidian";
import { BiblePassage, BibleReferenceRange, BibleVerse } from "../models/BibleReference";
import { BibleReferenceParser } from "../utils/BibleReferenceParser";

interface Bible {
    [book: string]: {
        [chapter: string]: {
            [verse: string]: string;
        }
    }
}

export class BibleService {
    private bible: Bible | null = null;
    private bookNameMap: Map<string, string> = new Map();

    constructor() {
        this.initializeBookNameMap();
    }

    /**
     * Initialize the map of standardized book names
     */
    private initializeBookNameMap(): void {
        // Old Testament
        this.addBookMapping("Genesis", ["Gen", "Ge", "Gn"]);
        this.addBookMapping("Exodus", ["Exo", "Ex", "Exod"]);
        this.addBookMapping("Leviticus", ["Lev", "Le", "Lv"]);
        this.addBookMapping("Numbers", ["Num", "Nu", "Nm", "Nb"]);
        this.addBookMapping("Deuteronomy", ["Deut", "De", "Dt"]);
        this.addBookMapping("Joshua", ["Josh", "Jos", "Jsh"]);
        this.addBookMapping("Judges", ["Judg", "Jdg", "Jg"]);
        this.addBookMapping("Ruth", ["Rth", "Ru"]);
        this.addBookMapping("1 Samuel", ["1 Sam", "1 Sa", "1S", "I Sa", "1Sam", "1st Samuel"]);
        this.addBookMapping("2 Samuel", ["2 Sam", "2 Sa", "2S", "II Sa", "2Sam", "2nd Samuel"]);
        this.addBookMapping("1 Kings", ["1 Ki", "1 K", "1K", "I K", "1Ki", "1st Kings"]);
        this.addBookMapping("2 Kings", ["2 Ki", "2 K", "2K", "II K", "2Ki", "2nd Kings"]);
        this.addBookMapping("1 Chronicles", ["1 Ch", "1 Chr", "I Ch", "1Ch", "1st Chronicles"]);
        this.addBookMapping("2 Chronicles", ["2 Ch", "2 Chr", "II Ch", "2Ch", "2nd Chronicles"]);
        this.addBookMapping("Ezra", ["Ezr", "Ez"]);
        this.addBookMapping("Nehemiah", ["Neh", "Ne"]);
        this.addBookMapping("Esther", ["Est", "Es"]);
        this.addBookMapping("Job", ["Jb"]);
        this.addBookMapping("Psalms", ["Ps", "Psa", "Psalm", "Pslm"]);
        this.addBookMapping("Proverbs", ["Prov", "Pro", "Pr"]);
        this.addBookMapping("Ecclesiastes", ["Eccl", "Ecc", "Ec", "Qoh"]);
        this.addBookMapping("Song of Solomon", ["Song", "SoS", "Canticles", "Song of Songs", "Cant"]);
        this.addBookMapping("Isaiah", ["Isa", "Is"]);
        this.addBookMapping("Jeremiah", ["Jer", "Je"]);
        this.addBookMapping("Lamentations", ["Lam", "La"]);
        this.addBookMapping("Ezekiel", ["Ezek", "Eze", "Ezk"]);
        this.addBookMapping("Daniel", ["Dan", "Da", "Dn"]);
        this.addBookMapping("Hosea", ["Hos", "Ho"]);
        this.addBookMapping("Joel", ["Jl"]);
        this.addBookMapping("Amos", ["Am"]);
        this.addBookMapping("Obadiah", ["Obad", "Ob"]);
        this.addBookMapping("Jonah", ["Jon", "Jnh"]);
        this.addBookMapping("Micah", ["Mic", "Mi"]);
        this.addBookMapping("Nahum", ["Nah", "Na"]);
        this.addBookMapping("Habakkuk", ["Hab", "Hb"]);
        this.addBookMapping("Zephaniah", ["Zeph", "Zep", "Zp"]);
        this.addBookMapping("Haggai", ["Hag", "Hg"]);
        this.addBookMapping("Zechariah", ["Zech", "Zec", "Zc"]);
        this.addBookMapping("Malachi", ["Mal", "Ml"]);
        
        // New Testament
        this.addBookMapping("Matthew", ["Matt", "Mt"]);
        this.addBookMapping("Mark", ["Mrk", "Mk", "Mr"]);
        this.addBookMapping("Luke", ["Luk", "Lk"]);
        this.addBookMapping("John", ["Jn", "Jhn"]);
        this.addBookMapping("Acts", ["Act", "Ac"]);
        this.addBookMapping("Romans", ["Rom", "Ro", "Rm"]);
        this.addBookMapping("1 Corinthians", ["1 Cor", "1 Co", "I Co", "1Cor", "1st Corinthians"]);
        this.addBookMapping("2 Corinthians", ["2 Cor", "2 Co", "II Co", "2Cor", "2nd Corinthians"]);
        this.addBookMapping("Galatians", ["Gal", "Ga"]);
        this.addBookMapping("Ephesians", ["Eph", "Ep"]);
        this.addBookMapping("Philippians", ["Phil", "Php", "Pp"]);
        this.addBookMapping("Colossians", ["Col", "Co"]);
        this.addBookMapping("1 Thessalonians", ["1 Thess", "1 Th", "I Th", "1Thess", "1st Thessalonians"]);
        this.addBookMapping("2 Thessalonians", ["2 Thess", "2 Th", "II Th", "2Thess", "2nd Thessalonians"]);
        this.addBookMapping("1 Timothy", ["1 Tim", "1 Ti", "I Ti", "1Tim", "1st Timothy"]);
        this.addBookMapping("2 Timothy", ["2 Tim", "2 Ti", "II Ti", "2Tim", "2nd Timothy"]);
        this.addBookMapping("Titus", ["Tit", "Ti"]);
        this.addBookMapping("Philemon", ["Phlm", "Phm", "Pm"]);
        this.addBookMapping("Hebrews", ["Heb", "He"]);
        this.addBookMapping("James", ["Jas", "Jm"]);
        this.addBookMapping("1 Peter", ["1 Pet", "1 Pe", "I Pe", "1Pet", "1st Peter"]);
        this.addBookMapping("2 Peter", ["2 Pet", "2 Pe", "II Pe", "2Pet", "2nd Peter"]);
        this.addBookMapping("1 John", ["1 Jn", "I Jn", "1Jn", "1st John"]);
        this.addBookMapping("2 John", ["2 Jn", "II Jn", "2Jn", "2nd John"]);
        this.addBookMapping("3 John", ["3 Jn", "III Jn", "3Jn", "3rd John"]);
        this.addBookMapping("Jude", ["Jud", "Jd"]);
        this.addBookMapping("Revelation", ["Rev", "Re", "The Revelation", "Apocalypse"]);
    }

    /**
     * Helper method to add book name mappings
     */
    private addBookMapping(standardName: string, alternateNames: string[]): void {
        this.bookNameMap.set(standardName.toLowerCase(), standardName);
        alternateNames.forEach(name => {
            this.bookNameMap.set(name.toLowerCase(), standardName);
        });
    }

    /**
     * Load the Bible data directly from a provided Bible object
     * This method is called from the main plugin with the imported Bible data
     */
    public loadBible(bibleData: any): void {
        // Process the raw data into our expected format
        try {
            // Check if we have valid data
            if (!bibleData) {
                throw new Error("No Bible data provided");
            }
            
            // Convert the data into our required format if needed
            const formattedData: Bible = {};
            
            // If the data is already in our expected format, use it directly
            if (typeof bibleData === 'object' && 
                bibleData.hasOwnProperty('Genesis') && 
                bibleData.Genesis.hasOwnProperty('1')) {
                this.bible = bibleData as Bible;
                return;
            }
            
            // Map numeric book IDs to names
            const bookIdMap: {[key: string]: string} = {
                "1": "Genesis", "2": "Exodus", "3": "Leviticus", "4": "Numbers", "5": "Deuteronomy",
                "6": "Joshua", "7": "Judges", "8": "Ruth", "9": "1 Samuel", "10": "2 Samuel",
                "11": "1 Kings", "12": "2 Kings", "13": "1 Chronicles", "14": "2 Chronicles",
                "15": "Ezra", "16": "Nehemiah", "17": "Esther", "18": "Job", "19": "Psalms",
                "20": "Proverbs", "21": "Ecclesiastes", "22": "Song of Solomon", "23": "Isaiah",
                "24": "Jeremiah", "25": "Lamentations", "26": "Ezekiel", "27": "Daniel", "28": "Hosea",
                "29": "Joel", "30": "Amos", "31": "Obadiah", "32": "Jonah", "33": "Micah",
                "34": "Nahum", "35": "Habakkuk", "36": "Zephaniah", "37": "Haggai", "38": "Zechariah",
                "39": "Malachi", "40": "Matthew", "41": "Mark", "42": "Luke", "43": "John",
                "44": "Acts", "45": "Romans", "46": "1 Corinthians", "47": "2 Corinthians", "48": "Galatians",
                "49": "Ephesians", "50": "Philippians", "51": "Colossians", "52": "1 Thessalonians",
                "53": "2 Thessalonians", "54": "1 Timothy", "55": "2 Timothy", "56": "Titus",
                "57": "Philemon", "58": "Hebrews", "59": "James", "60": "1 Peter", "61": "2 Peter",
                "62": "1 John", "63": "2 John", "64": "3 John", "65": "Jude", "66": "Revelation"
            };
            
            // Process the ESV.json format
            if (Array.isArray(bibleData)) {
                console.log(`Processing ${bibleData.length} verses from ESV data`);
                
                // Track our progress
                let processedVerses = 0;
                const totalVerses = bibleData.length;
                const progressInterval = Math.floor(totalVerses / 10); // Report progress at 10% intervals
                
                bibleData.forEach(verse => {
                    // Increment processed count
                    processedVerses++;
                    
                    // Log progress
                    if (processedVerses % progressInterval === 0) {
                        const percentComplete = Math.floor((processedVerses / totalVerses) * 100);
                        console.log(`Bible data processing: ${percentComplete}% complete`);
                    }
                    
                    // Get proper book name from ID or use as is if it's a string
                    let bookName: string;
                    if (typeof verse.book === 'number') {
                        bookName = bookIdMap[verse.book.toString()] || `Book ${verse.book}`;
                    } else {
                        bookName = verse.book.toString();
                    }
                    
                    const chapter = verse.chapter.toString();
                    const verseNum = verse.verse.toString();
                    const text = verse.text;
                    
                    // Create the nested objects if they don't exist
                    if (!formattedData[bookName]) {
                        formattedData[bookName] = {};
                    }
                    
                    if (!formattedData[bookName][chapter]) {
                        formattedData[bookName][chapter] = {};
                    }
                    
                    // Add the verse text
                    formattedData[bookName][chapter][verseNum] = text;
                });
                
                console.log(`Bible data processing complete: ${processedVerses} verses processed`);
            } else {
                console.error("Unsupported Bible data format:", typeof bibleData);
                throw new Error("Unsupported Bible data format");
            }
            
            this.bible = formattedData;
            console.log("Bible data loaded successfully into structured format");
        } catch (error) {
            console.error("Failed to process Bible data:", error);
            throw new Error("Failed to process Bible data");
        }
    }

    /**
     * Get a single verse by reference
     */
    public getVerse(book: string, chapter: number, verse: number): BibleVerse | null {
        if (!this.bible) {
            throw new Error("Bible data not loaded");
        }

        const standardBook = this.standardizeBookName(book);
        if (!standardBook || !this.bible[standardBook]) {
            return null;
        }

        const chapterData = this.bible[standardBook][chapter.toString()];
        if (!chapterData) {
            return null;
        }

        const verseText = chapterData[verse.toString()];
        if (!verseText) {
            return null;
        }

        return {
            book: standardBook,
            chapter,
            verse,
            text: verseText
        };
    }

    /**
     * Get a passage by reference range
     */
    public getPassage(reference: BibleReferenceRange): BiblePassage | null {
        if (!this.bible) {
            throw new Error("Bible data not loaded");
        }

        const verses: BibleVerse[] = [];
        const standardBook = this.standardizeBookName(reference.book);
        if (!standardBook || !this.bible[standardBook]) {
            return null;
        }

        const startChapter = reference.startChapter;
        const startVerse = reference.startVerse;
        const endChapter = reference.endChapter || startChapter;
        const endVerse = reference.endVerse || startVerse;

        // Loop through chapters and verses in the range
        for (let chapter = startChapter; chapter <= endChapter; chapter++) {
            const chapterData = this.bible[standardBook][chapter.toString()];
            if (!chapterData) continue;

            const firstVerse = chapter === startChapter ? startVerse : 1;
            const lastVerse = chapter === endChapter ? endVerse : Object.keys(chapterData).length;

            for (let verse = firstVerse; verse <= lastVerse; verse++) {
                const verseText = chapterData[verse.toString()];
                if (verseText) {
                    verses.push({
                        book: standardBook,
                        chapter,
                        verse,
                        text: verseText
                    });
                }
            }
        }

        if (verses.length === 0) {
            return null;
        }

        // Format the reference string
        let referenceString = `${standardBook} ${startChapter}`;
        if (startVerse > 1 || endVerse) {
            referenceString += `:${startVerse}`;
            if (endChapter > startChapter) {
                referenceString += `-${endChapter}:${endVerse}`;
            } else if (endVerse && endVerse > startVerse) {
                referenceString += `-${endVerse}`;
            }
        }

        return {
            reference: referenceString,
            verses
        };
    }

    /**
     * Get an entire chapter
     */
    public getChapter(book: string, chapter: number): BiblePassage | null {
        if (!this.bible) {
            throw new Error("Bible data not loaded");
        }

        const standardBook = this.standardizeBookName(book);
        if (!standardBook || !this.bible[standardBook]) {
            return null;
        }

        const chapterData = this.bible[standardBook][chapter.toString()];
        if (!chapterData) {
            return null;
        }

        const verses: BibleVerse[] = [];
        const verseNumbers = Object.keys(chapterData).map(v => parseInt(v)).sort((a, b) => a - b);

        for (const verse of verseNumbers) {
            verses.push({
                book: standardBook,
                chapter,
                verse,
                text: chapterData[verse.toString()]
            });
        }

        return {
            reference: `${standardBook} ${chapter}`,
            verses
        };
    }

    /**
     * Get Bible content by parsing a reference string
     */
    public getBibleContent(referenceString: string): BiblePassage | null {
        const reference = BibleReferenceParser.parseReference(referenceString);
        if (!reference) {
            return null;
        }

        const referenceType = BibleReferenceParser.getReferenceType(reference);
        
        if (referenceType === 'verse') {
            const verse = this.getVerse(reference.book, reference.startChapter, reference.startVerse);
            if (!verse) {
                return null;
            }
            return {
                reference: `${verse.book} ${verse.chapter}:${verse.verse}`,
                verses: [verse]
            };
        } else if (referenceType === 'chapter') {
            return this.getChapter(reference.book, reference.startChapter);
        } else {
            return this.getPassage(reference);
        }
    }

    /**
     * Standardize book name to match the format in the Bible data
     */
    private standardizeBookName(bookName: string): string | null {
        const lowercaseBook = bookName.toLowerCase().trim();
        // Try direct match
        if (this.bookNameMap.has(lowercaseBook)) {
            return this.bookNameMap.get(lowercaseBook)!;
        }
        
        // Try partial match
        for (const [key, value] of this.bookNameMap.entries()) {
            if (lowercaseBook.includes(key) || key.includes(lowercaseBook)) {
                return value;
            }
        }
        
        return null;
    }
} 