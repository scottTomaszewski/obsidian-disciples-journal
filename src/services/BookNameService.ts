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
    
    /**
     * Extract book name from a reference (e.g., "Genesis 1:1" -> "Genesis")
     */
    public extractBookFromReference(reference: string): string {
        // Handle multi-chapter references
        if (reference.includes('-')) {
            reference = reference.split('-')[0].trim();
        }
        
        // Split by space and get all parts except the last (which is the chapter)
        const parts = reference.split(' ');
        
        // Handle multi-word book names (e.g., "1 Samuel", "Song of Solomon")
        if (parts.length === 2) {
            // Simple case like "Genesis 1"
            return parts[0];
        } else if (parts.length > 2) {
            // Get all except the last part (which is the chapter number)
            return parts.slice(0, parts.length - 1).join(' ');
        }
        
        // Fallback
        return reference;
    }
} 