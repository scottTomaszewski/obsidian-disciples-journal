import { App, Notice, requestUrl } from "obsidian";
import { BiblePassage } from "./BibleContentService";
import { BookNameService } from "./BookNameService";
import { BibleFormatter } from "../utils/BibleFormatter";

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
     * Load a collection of HTML formatted Bible chapters
     */
    public loadChapterCollection(data: any): void {
        if (!data) return;
        
        try {
            // Process each chapter in the collection
            for (const key in data) {
                const chapterData = data[key];
                if (this.isESVApiFormat(chapterData)) {
                    // Store the HTML content
                    const canonical = chapterData.canonical;
                    const htmlContent = chapterData.passages[0];
                    
                    this.htmlFormattedBible[canonical] = {
                        canonical,
                        htmlContent
                    };
                }
            }
        } catch (error) {
            console.error('Error loading chapter collection:', error);
        }
    }

    /**
     * Check if data is in ESV API format
     */
    public isESVApiFormat(data: any): boolean {
        return data && 
               typeof data === 'object' && 
               data.canonical !== undefined && 
               data.passages !== undefined && 
               Array.isArray(data.passages) && 
               data.passages.length > 0;
    }

    /**
     * Download Bible content from the ESV API
     */
    public async downloadFromESVApi(reference: string): Promise<BiblePassage | null> {
        if (!this.apiToken) {
            console.warn('ESV API token not set. Cannot download content.');
            return {
                reference: reference,
                verses: [],
                htmlContent: `<div class="bible-missing-token-warning">
                    <p><strong>ESV API Token Not Set</strong></p>
                    <p>To display Bible passages, you need to set up an ESV API token in the plugin settings.</p>
                    <p>You can request a free token from <a href="https://api.esv.org/docs/" target="_blank">api.esv.org</a>.</p>
                </div>`,
                missingToken: true
            };
        }
        
        try {
            // Encode the reference for the URL
            const encodedRef = encodeURIComponent(reference);
            
            // Build the API URL with parameters
            const apiUrl = `https://api.esv.org/v3/passage/html/?q=${encodedRef}&include-passage-references=false&include-verse-numbers=true&include-first-verse-numbers=true&include-footnotes=true&include-headings=true`;
            
            // Make the request
            const response = await requestUrl({
                url: apiUrl,
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.apiToken}`
                }
            });
            
            // Check if the request was successful
            if (response.status === 200) {
                const data = response.json as ESVApiResponse;
                
                // Save the response to a file
                await this.saveESVApiResponse(reference, data);
                
                // Return the content
                return {
                    reference: data.canonical,
                    verses: [], // Empty since we're using HTML
                    htmlContent: data.passages[0]
                };
            } else {
                console.error(`ESV API request failed with status ${response.status}: ${response.text}`);
                return {
                    reference: reference,
                    verses: [],
                    htmlContent: `<div class="bible-api-error">
                        <p><strong>Error Loading Bible Passage</strong></p>
                        <p>Failed to load the passage from the ESV API. Status: ${response.status}</p>
                        <p>Please check your API token in the plugin settings.</p>
                    </div>`
                };
            }
        } catch (error) {
            console.error('Error downloading from ESV API:', error);
            return {
                reference: reference,
                verses: [],
                htmlContent: `<div class="bible-api-error">
                    <p><strong>Error Loading Bible Passage</strong></p>
                    <p>An error occurred when trying to access the ESV API.</p>
                    <p>Please check your internet connection and API token.</p>
                </div>`
            };
        }
    }

    /**
     * Save ESV API response to a file
     */
    private async saveESVApiResponse(reference: string, data: ESVApiResponse): Promise<void> {
        try {
            // Extract book and chapter from the canonical reference
            const parts = data.canonical.split(' ');
            if (parts.length < 2) return;
            
            const chapter = parts[parts.length - 1];
            const book = parts.slice(0, -1).join(' ');
            
            // Create the directory structure
            const bookPath = `${this.bibleContentVaultPath}/${book}`;
            await this.ensureVaultDirectoryExists(bookPath);
            
            // Save the raw API response as JSON
            const jsonPath = `${bookPath}/${data.canonical}.json`;
            await this.app.vault.adapter.write(jsonPath, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving ESV API response:', error);
        }
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
            }
        }
    }
} 