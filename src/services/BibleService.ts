import { App, Notice, requestUrl } from "obsidian";
import { BiblePassage, BibleReferenceRange, BibleReferenceType, BibleVerse, ESVApiResponse } from "../models/BibleReference";
import { BibleReferenceParser } from "../utils/BibleReferenceParser";

interface Bible {
    [book: string]: {
        [chapter: string]: {
            [verse: string]: string;
        }
    }
}

// New interface for HTML formatted Bible chapters
interface HTMLFormattedBible {
    [reference: string]: {
        canonical: string;
        htmlContent: string;
    }
}

export class BibleService {
    private bible: Bible | null = null;
    private htmlFormattedBible: HTMLFormattedBible = {};
    private bookNameMap: Map<string, string> = new Map();
    private useHtmlFormat: boolean = false;
    private app: App;
    private esvApiToken: string = '';
    private downloadOnDemand: boolean = true;
    private bibleContentVaultPath: string = 'Bible/ESV';

    constructor(app: App) {
        this.app = app;
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
            
            // Check if the data is in ESV API HTML format
            if (this.isESVApiFormat(bibleData)) {
                console.log("Loading Bible data in ESV API HTML format");
                this.loadESVApiData(bibleData);
                this.useHtmlFormat = true;
                return;
            }
            
            // Check if we have a collection of HTML formatted files
            if (this.isESVChapterCollection(bibleData)) {
                console.log("Loading Bible data from ESV chapter collection");
                this.loadESVChapterCollection(bibleData);
                this.useHtmlFormat = true;
                return;
            }
            
            // Convert the data into our required format if needed
            const formattedData: Bible = {};
            
            // If the data is already in our expected format, use it directly
            if (typeof bibleData === 'object' && 
                bibleData.hasOwnProperty('Genesis') && 
                bibleData.Genesis.hasOwnProperty('1')) {
                this.bible = bibleData as Bible;
                this.useHtmlFormat = false;
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
            this.useHtmlFormat = false;
            console.log("Bible data loaded successfully into structured format");
        } catch (error) {
            console.error("Failed to process Bible data:", error);
            throw new Error("Failed to process Bible data");
        }
    }

    /**
     * Determine if data is in ESV API format
     */
    private isESVApiFormat(data: any): boolean {
        return typeof data === 'object' && 
               data.hasOwnProperty('passages') && 
               Array.isArray(data.passages) &&
               data.hasOwnProperty('canonical');
    }
    
    /**
     * Determine if data is a collection of ESV chapter files
     */
    private isESVChapterCollection(data: any): boolean {
        // Check if it's an object with multiple book/chapter keys
        if (typeof data !== 'object') return false;
        
        // Check for a sample of expected properties in a Genesis 1 object
        if (data['Genesis 1'] && 
            data['Genesis 1'].hasOwnProperty('canonical') && 
            data['Genesis 1'].hasOwnProperty('passages')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Load data in ESV API HTML format
     */
    private loadESVApiData(data: ESVApiResponse): void {
        try {
            // Store the HTML content for the reference
            const reference = data.canonical;
            
            this.htmlFormattedBible[reference] = {
                canonical: data.canonical,
                htmlContent: data.passages[0] // ESV API typically returns one passage per request
            };
            
            console.log(`Loaded HTML content for "${reference}"`);
        } catch (error) {
            console.error("Error loading ESV API data:", error);
            throw error;
        }
    }
    
    /**
     * Load a collection of ESV chapter files
     */
    private loadESVChapterCollection(data: any): void {
        try {
            // Iterate through all references in the collection
            for (const reference in data) {
                if (this.isESVApiFormat(data[reference])) {
                    this.htmlFormattedBible[reference] = {
                        canonical: data[reference].canonical,
                        htmlContent: data[reference].passages[0]
                    };
                }
            }
            
            console.log(`Loaded ${Object.keys(this.htmlFormattedBible).length} HTML-formatted Bible chapters`);
        } catch (error) {
            console.error("Error loading ESV chapter collection:", error);
            throw error;
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
     * Set the ESV API token
     */
    public setESVApiToken(token: string): void {
        this.esvApiToken = token;
    }

    /**
     * Set the download on demand setting
     */
    public setDownloadOnDemand(enabled: boolean): void {
        this.downloadOnDemand = enabled;
    }

    /**
     * Set the Bible content vault path
     */
    public setBibleContentVaultPath(path: string): void {
        this.bibleContentVaultPath = path;
    }

    /**
     * Download Bible content from the ESV API
     */
    public async downloadFromESVApi(reference: string): Promise<BiblePassage | null> {
        if (!this.esvApiToken || this.esvApiToken.trim() === '') {
            new Notice('ESV API token not set. Please set it in the plugin settings.');
            console.error('ESV API token not set');
            return null;
        }

        try {
            // Encode the reference for the URL
            const encodedReference = encodeURIComponent(reference);
            
            // Prepare the API URL
            const apiUrl = `https://api.esv.org/v3/passage/html/?q=${encodedReference}`;
            
            // Make the API request
            const response = await requestUrl({
                url: apiUrl,
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.esvApiToken}`
                }
            });
            
            // Check if the request was successful
            if (response.status !== 200) {
                console.error(`API request failed with status ${response.status}: ${response.text}`);
                return null;
            }
            
            // Parse the response
            const data = response.json as ESVApiResponse;
            
            // Store the result in our HTML formatted Bible
            if (data.passages && data.passages.length > 0) {
                const canonical = data.canonical;
                
                this.htmlFormattedBible[canonical] = {
                    canonical: canonical,
                    htmlContent: data.passages[0]
                };
                
                // Also store the result in files for future use
                await this.saveESVApiResponse(canonical, data);
                
                // Also create a Markdown note in the vault for navigation
                await this.createBibleChapterNote(canonical, data);
                
                // Return the passage
                return {
                    reference: canonical,
                    verses: [], // Empty since we're using HTML
                    htmlContent: data.passages[0]
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error downloading from ESV API:', error);
            return null;
        }
    }
    
    /**
     * Save an ESV API response to a file in the plugin directory
     */
    private async saveESVApiResponse(reference: string, data: ESVApiResponse): Promise<void> {
        try {
            // Save to plugin directory for loading on startup
            const adapter = this.app.vault.adapter;
            const pluginDir = (this.app as any).plugins.plugins['disciples-journal']?.manifest?.dir || '';
            
            if (!pluginDir) {
                console.error('Could not determine plugin directory');
                return;
            }
            
            // Ensure the data directory exists
            const dataDir = `${pluginDir}/src/data/esv`;
            
            if (!(await adapter.exists(dataDir))) {
                await adapter.mkdir(dataDir);
            }
            
            // Extract book name from the reference (e.g., "Genesis 1:1" -> "Genesis")
            const book = this.extractBookFromReference(reference);
            const bookDir = `${dataDir}/${book}`;
            
            // Create book subdirectory if it doesn't exist
            if (!(await adapter.exists(bookDir))) {
                await adapter.mkdir(bookDir);
            }
            
            // Save the file to the book subdirectory
            const filePath = `${bookDir}/${reference}.json`;
            await adapter.write(filePath, JSON.stringify(data, null, 2));
            
            console.log(`Saved ESV API response for "${reference}" to ${filePath}`);
        } catch (error) {
            console.error('Error saving ESV API response to plugin directory:', error);
        }
    }

    /**
     * Create a Bible chapter note in the vault
     */
    private async createBibleChapterNote(reference: string, data: ESVApiResponse): Promise<void> {
        try {
            // Extract the chapter reference from the full reference
            // e.g., "Genesis 1:1" -> "Genesis 1"
            let chapterRef = reference;
            if (reference.includes(':')) {
                const parts = reference.split(':');
                chapterRef = parts[0]; // Get just the book and chapter part
            }
            
            // Extract book name from reference
            const book = this.extractBookFromReference(chapterRef);
            
            // Create the content path (Bible/ESV/Genesis/Genesis 1.md)
            const contentPath = `${this.bibleContentVaultPath}/${book}`;
            
            // Ensure directories exist
            await this.ensureVaultDirectoryExists(contentPath);
            
            // Format data as Markdown
            const noteContent = this.formatBibleChapterAsMarkdown(chapterRef, data);
            
            // Create or update the note
            const fileName = `${contentPath}/${chapterRef}.md`;
            const fileExists = await this.app.vault.adapter.exists(fileName);
            
            if (fileExists) {
                // Update the file
                await this.app.vault.adapter.write(fileName, noteContent);
                console.log(`Updated Bible chapter note: ${fileName}`);
            } else {
                // Create the file
                await this.app.vault.adapter.write(fileName, noteContent);
                console.log(`Created Bible chapter note: ${fileName}`);
            }
        } catch (error) {
            console.error('Error creating Bible chapter note:', error);
        }
    }
    
    /**
     * Format Bible chapter data as Markdown
     */
    private formatBibleChapterAsMarkdown(reference: string, data: ESVApiResponse): string {
        let content = `# ${reference}\n\n`;
        
        // Add HTML content in a code block for rendering
        content += "```bible\n";
        content += reference;
        content += "\n```\n\n";
        
        // Add copyright attribution
        content += "---\n\n";
        content += "Scripture quotations marked \"ESV\" are from the ESV® Bible ";
        content += "(The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, ";
        content += "a publishing ministry of Good News Publishers. Used by permission. All rights reserved.\n";
        
        return content;
    }
    
    /**
     * Ensure vault directory exists, creating it if necessary
     */
    private async ensureVaultDirectoryExists(path: string): Promise<void> {
        const parts = path.split('/').filter(p => p.length > 0);
        let currentPath = '';
        
        for (const part of parts) {
            currentPath += (currentPath ? '/' : '') + part;
            if (!(await this.app.vault.adapter.exists(currentPath))) {
                await this.app.vault.adapter.mkdir(currentPath);
                console.log(`Created directory: ${currentPath}`);
            }
        }
    }
    
    /**
     * Extract book name from a reference (e.g., "Genesis 1:1" -> "Genesis")
     */
    private extractBookFromReference(reference: string): string {
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

    /**
     * Get Bible content by parsing a reference string
     * Updated to handle both traditional and HTML formats, with on-demand downloading
     */
    public async getBibleContent(referenceString: string): Promise<BiblePassage | null> {
        // First check if we have this exact reference in HTML format
        if (this.useHtmlFormat) {
            // Try exact match first
            if (this.htmlFormattedBible[referenceString]) {
                return {
                    reference: this.htmlFormattedBible[referenceString].canonical,
                    verses: [], // Empty since we're using HTML
                    htmlContent: this.htmlFormattedBible[referenceString].htmlContent
                };
            }
            
            // Try standardized reference
            const reference = BibleReferenceParser.parseReference(referenceString);
            if (!reference) return null;
            
            // Format the reference string to try matching in our htmlFormattedBible
            const formattedRef = this.formatStandardReference(reference);
            
            if (this.htmlFormattedBible[formattedRef]) {
                return {
                    reference: this.htmlFormattedBible[formattedRef].canonical,
                    verses: [], // Empty since we're using HTML
                    htmlContent: this.htmlFormattedBible[formattedRef].htmlContent
                };
            }
            
            // If we have download-on-demand enabled, try to download the content
            if (this.downloadOnDemand && this.esvApiToken && this.esvApiToken.trim() !== '') {
                console.log(`Attempting to download content for "${referenceString}" from ESV API`);
                const downloadedContent = await this.downloadFromESVApi(referenceString);
                if (downloadedContent) {
                    return downloadedContent;
                }
            }
            
            // If we don't have the HTML for this reference, fall back to the traditional method
            // This will only work if we've also loaded the traditional Bible data
        }
        
        // Use traditional method as fallback
        const reference = BibleReferenceParser.parseReference(referenceString);
        if (!reference) {
            return null;
        }

        const referenceType = BibleReferenceParser.getReferenceType(reference);
        
        if (referenceType === 'verse') {
            const verse = this.getVerse(reference.book, reference.startChapter, reference.startVerse);
            if (!verse) {
                // Try downloading if enabled
                if (this.downloadOnDemand && this.esvApiToken && this.esvApiToken.trim() !== '') {
                    const verseRef = `${reference.book} ${reference.startChapter}:${reference.startVerse}`;
                    return await this.downloadFromESVApi(verseRef);
                }
                return null;
            }
            return {
                reference: `${verse.book} ${verse.chapter}:${verse.verse}`,
                verses: [verse]
            };
        } else if (referenceType === 'chapter') {
            const chapter = this.getChapter(reference.book, reference.startChapter);
            if (!chapter) {
                // Try downloading if enabled
                if (this.downloadOnDemand && this.esvApiToken && this.esvApiToken.trim() !== '') {
                    const chapterRef = `${reference.book} ${reference.startChapter}`;
                    return await this.downloadFromESVApi(chapterRef);
                }
                return null;
            }
            return chapter;
        } else {
            const passage = this.getPassage(reference);
            if (!passage) {
                // Try downloading if enabled
                if (this.downloadOnDemand && this.esvApiToken && this.esvApiToken.trim() !== '') {
                    let passageRef = this.formatStandardReference(reference);
                    return await this.downloadFromESVApi(passageRef);
                }
                return null;
            }
            return passage;
        }
    }

    /**
     * Format a reference into a standardized string for lookup
     */
    private formatStandardReference(reference: BibleReferenceRange): string {
        const standardBook = this.standardizeBookName(reference.book);
        if (!standardBook) return "";
        
        // For a chapter reference
        if (reference.startVerse === 1 && !reference.endVerse) {
            return `${standardBook} ${reference.startChapter}`;
        }
        
        // For a single verse
        if (!reference.endChapter && !reference.endVerse) {
            return `${standardBook} ${reference.startChapter}:${reference.startVerse}`;
        }
        
        // For a range in the same chapter
        if (!reference.endChapter && reference.endVerse) {
            return `${standardBook} ${reference.startChapter}:${reference.startVerse}-${reference.endVerse}`;
        }
        
        // For a range across chapters
        return `${standardBook} ${reference.startChapter}:${reference.startVerse}-${reference.endChapter}:${reference.endVerse}`;
    }

    /**
     * Standardize book name to match the format in the Bible data
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
}