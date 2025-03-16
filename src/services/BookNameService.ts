/**
 * Service for handling Bible book name standardization and mapping
 */
export class BookNameService {
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

    /**
     * Standardize a book name to its canonical form
     */
    public standardizeBookName(bookName: string): string | null {
        if (!bookName) {
            return null;
        }
        
        // Clean up the book name
        const cleanedName = bookName.trim();
        
        // First try a direct lookup
        if (this.bookNameMap.has(cleanedName.toLowerCase())) {
            return this.bookNameMap.get(cleanedName.toLowerCase()) as string;
        }
        
        // Try to find a partial match
        for (const [key, value] of this.bookNameMap.entries()) {
            // Check if the key is a substring of the cleaned name
            if (cleanedName.toLowerCase().startsWith(key)) {
                return value;
            }
        }
        
        return null;
    }
    
    /**
     * Get normalized book name (alias for standardizeBookName for clarity)
     */
    public getNormalizedBookName(bookName: string): string | null {
        return this.standardizeBookName(bookName);
    }
    
    /**
     * Extract a book name from a reference string
     */
    public extractBookFromReference(reference: string): string {
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
            const standardizedName = this.standardizeBookName(bookName);
            if (standardizedName) {
                longestMatch = bookName;
            }
        }
        
        // Try matching with two words (for books like "Song of")
        const twoWordsMatch = reference.match(/^([A-Za-z]+\s+[A-Za-z]+)/);
        if (twoWordsMatch) {
            bookName = twoWordsMatch[1];
            
            // Check if this is a valid book name
            const standardizedName = this.standardizeBookName(bookName);
            if (standardizedName) {
                longestMatch = bookName;
            }
        }
        
        // Try matching with three words (for books like "Song of Solomon")
        const threeWordsMatch = reference.match(/^([A-Za-z]+\s+[A-Za-z]+\s+[A-Za-z]+)/);
        if (threeWordsMatch) {
            bookName = threeWordsMatch[1];
            
            // Check if this is a valid book name
            const standardizedName = this.standardizeBookName(bookName);
            if (standardizedName) {
                longestMatch = bookName;
            }
        }
        
        return longestMatch;
    }
} 