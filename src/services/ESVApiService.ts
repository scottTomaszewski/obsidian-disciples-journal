import { App, Notice, requestUrl } from "obsidian";
import { BiblePassage } from "./BibleContentService";
import { BookNameService } from "./BookNameService";

/**
 * Interface for ESV API Response
 */
export interface ESVApiResponse {
    query: string;
    canonical: string;
    parsed: number[][];
    passage_meta: ESVPassageMeta[];
    passages: string[];
}

/**
 * Interface for ESV Passage Metadata
 */
export interface ESVPassageMeta {
    canonical: string;
    chapter_start: number[];
    chapter_end: number[];
    prev_verse: number | null;
    next_verse: number | null;
    prev_chapter: number | null;
    next_chapter: number[] | null;
}

/**
 * Service for interacting with the ESV API
 */
export class ESVApiService {
    private app: App;
    private apiToken: string = '';
    private bibleContentVaultPath: string = 'Bible/ESV';
    private bookNameService: BookNameService;
    
    // Store HTML formatted Bible chapters
    private htmlFormattedBible: {
        [reference: string]: {
            canonical: string;
            htmlContent: string;
        }
    } = {};

    constructor(app: App, bookNameService: BookNameService) {
        this.app = app;
        this.bookNameService = bookNameService;
    }

    /**
     * Set the ESV API token
     */
    public setApiToken(token: string): void {
        this.apiToken = token;
    }

    /**
     * Set the path where Bible content will be stored in the vault
     */
    public setContentPath(path: string): void {
        this.bibleContentVaultPath = path;
    }

    /**
     * Get HTML formatted Bible content from in-memory storage
     */
    public getHTMLContent(reference: string): BiblePassage | null {
        if (this.htmlFormattedBible[reference]) {
            return {
                reference: this.htmlFormattedBible[reference].canonical,
                verses: [], // Empty since we're using HTML
                htmlContent: this.htmlFormattedBible[reference].htmlContent
            };
        }
        return null;
    }

    /**
     * Load a collection of ESV chapter files into memory
     */
    public loadChapterCollection(data: any): void {
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
     * Check if data is in ESV API format
     */
    public isESVApiFormat(data: any): boolean {
        return typeof data === 'object' && 
               data.hasOwnProperty('passages') && 
               Array.isArray(data.passages) &&
               data.hasOwnProperty('canonical');
    }

    /**
     * Download Bible content from the ESV API
     */
    public async downloadFromESVApi(reference: string): Promise<BiblePassage | null> {
        if (!this.apiToken || this.apiToken.trim() === '') {
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
                    'Authorization': `Token ${this.apiToken}`
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
            const book = this.bookNameService.extractBookFromReference(reference);
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
            const book = this.bookNameService.extractBookFromReference(chapterRef);
            
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
} 