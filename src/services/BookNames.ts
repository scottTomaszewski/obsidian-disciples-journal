/**
 * Service for handling Bible book name standardization and mapping
 */
export class BookNames {
    /**
     * Standardize a book name to its canonical form
     */
    public static normalizedBookName(bookName: string): string | null {
        if (!bookName) {
            return null;
        }
        
        // Clean up the book name
        const cleanedName = bookName.trim();
        
        // First try a direct lookup
        if (BookNames._instance.bookNameMap.has(cleanedName.toLowerCase())) {
            return BookNames._instance.bookNameMap.get(cleanedName.toLowerCase()) as string;
        }
        
        // Try to find a partial match
        for (const [key, value] of BookNames._instance.bookNameMap.entries()) {
            // Check if the key is a substring of the cleaned name
            if (cleanedName.toLowerCase().startsWith(key)) {
                return value;
            }
        }
        
        return null;
    }
    
    /**
     * Extract a book name from a reference string
     */
    public static extractBookFromReference(reference: string): string {
        if (!reference) {
            return "";
        }
        
        // First try to match book names with numbers (e.g., "1 John")
        const numberedBookRegex = /^(\d+\s*[A-Za-z]+)/;
        const numberedMatch = reference.match(numberedBookRegex);
        if (numberedMatch) {
            return numberedMatch[1];
        }
        
        // If no numbered book was found, try to match a regular book name
        // We iterate through all keys in the book name map to find the longest matching book name
        let longestMatch = "";
        let bookName = "";
        
        // Start by extracting the first word (potential book name)
        const firstWordMatch = reference.match(/^([A-Za-z]+)/);
        if (firstWordMatch) {
            bookName = firstWordMatch[1];
            
            // Check if this is a valid book name
            const standardizedName = BookNames.normalizedBookName(bookName);
            if (standardizedName) {
                longestMatch = bookName;
            }
        }
        
        // Try matching with two words (for books like "Song of")
        const twoWordsMatch = reference.match(/^([A-Za-z]+\s+[A-Za-z]+)/);
        if (twoWordsMatch) {
            bookName = twoWordsMatch[1];
            
            // Check if this is a valid book name
            const standardizedName = BookNames.normalizedBookName(bookName);
            if (standardizedName) {
                longestMatch = bookName;
            }
        }
        
        // Try matching with three words (for books like "Song of Solomon")
        const threeWordsMatch = reference.match(/^([A-Za-z]+\s+[A-Za-z]+\s+[A-Za-z]+)/);
        if (threeWordsMatch) {
            bookName = threeWordsMatch[1];
            
            // Check if this is a valid book name
            const standardizedName = BookNames.normalizedBookName(bookName);
            if (standardizedName) {
                longestMatch = bookName;
            }
        }
        
        return longestMatch;
    }
    
    /**
     * Get the chapter count for a given book name
     */
    public static getChapterCount(bookName: string): number {
        const standardizedName = BookNames.normalizedBookName(bookName);
        if (standardizedName) {
            return BookNames.bibleStructure[standardizedName] || 1;
        }
        return 1; // Default to 1 if book not found
    }

    /**
     * Get the ordered list of book names
     */
    public static getBookOrder(): string[] {
        return [...BookNames.bookOrder]; // Return a copy to prevent modification
    }

	// Bible book structure (book name and chapter count)
    private static bibleStructure: {[book: string]: number} = {
        // Old Testament
        "Genesis": 50,"Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
        "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
        "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
        "Ezra": 10, "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150,
        "Proverbs": 31, "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66,
        "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14,
        "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7,
        "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14,
        "Malachi": 4,
        // New Testament
        "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
        "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6,
        "Ephesians": 6, "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5,
        "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4, "Titus": 3,
        "Philemon": 1, "Hebrews": 13, "James": 5, "1 Peter": 5, "2 Peter": 3,
        "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
    };
    
    // Order of books in the Bible
    private static bookOrder: string[] = [
        // Old Testament
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
        "Ezra", "Nehemiah", "Esther", "Job", "Psalms",
        "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
        "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea",
        "Joel", "Amos", "Obadiah", "Jonah", "Micah",
        "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
        "Malachi",
        // New Testament
        "Matthew", "Mark", "Luke", "John", "Acts",
        "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
        "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
        "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus",
        "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
        "1 John", "2 John", "3 John", "Jude", "Revelation"
    ];

    private static _instance:BookNames = new BookNames();

    private bookNameMap: Map<string, string> = new Map();

    private constructor() {
        this.initializeBookNameMap();
    }

    // public static getInstance(): BookNames {
    //     if (!BookNames.instance) {
    //         BookNames.instance = new BookNames();
    //     }
    //     return BookNames.instance;
    // }

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
        this.addBookMapping("Mark", ["Mk", "Mr"]);
        this.addBookMapping("Luke", ["Lk", "Lu"]);
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
        this.addBookMapping("Philemon", ["Phm", "Pm"]);
        this.addBookMapping("Hebrews", ["Heb", "He"]);
        this.addBookMapping("James", ["Jas", "Jm"]);
        this.addBookMapping("1 Peter", ["1 Pet", "1 Pe", "I Pe", "1Pet", "1st Peter"]);
        this.addBookMapping("2 Peter", ["2 Pet", "2 Pe", "II Pe", "2Pet", "2nd Peter"]);
        this.addBookMapping("1 John", ["1 Jn", "I Jn", "1Jn", "1st John"]);
        this.addBookMapping("2 John", ["2 Jn", "II Jn", "2Jn", "2nd John"]);
        this.addBookMapping("3 John", ["3 Jn", "III Jn", "3Jn", "3rd John"]);
        this.addBookMapping("Jude", ["Jud", "Jd"]);
        this.addBookMapping("Revelation", ["Rev", "Re", "The Revelation"]);
    }

    /**
     * Add a mapping for a book and its alternative names
     */
    private addBookMapping(standardName: string, alternateNames: string[]): void {
        // Add the standard name (lowercase for case-insensitive matching)
        this.bookNameMap.set(standardName.toLowerCase(), standardName);
        
        // Add alternate names
        for (const alternateName of alternateNames) {
            this.bookNameMap.set(alternateName.toLowerCase(), standardName);
        }
    }
} 
