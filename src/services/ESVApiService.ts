import { App, requestUrl } from "obsidian";
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
    private bibleContentVaultPath: string = 'Bible';  // Root path for all Bible versions
    private bibleVersion: string = 'ESV';  // Default version
    
    // Store HTML formatted Bible chapters
    private htmlFormattedBible: {
        [reference: string]: {
            canonical: string;
            htmlContent: string;
        }
    } = {};

    constructor(app: App, bookNameService: BookNameService) {
        this.app = app;
    }

    /**
     * Set the ESV API token
     */
    public setApiToken(token: string): void {
        this.apiToken = token;
    }

    /**
     * Set the root path where Bible content will be stored in the vault
     */
    public setContentPath(path: string): void {
        this.bibleContentVaultPath = path;
    }
    
    /**
     * Set the Bible version to use (affects the subdirectory)
     */
    public setBibleVersion(version: string): void {
        this.bibleVersion = version;
    }
    
    /**
     * Get the full vault path including version subdirectory
     */
    private getFullContentPath(): string {
        return `${this.bibleContentVaultPath}/${this.bibleVersion}`;
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
     * Load a collection of HTML formatted Bible chapters from files in the vault
     */
    public async loadBibleChaptersFromVault(): Promise<void> {
        try {
            // Get the path where Bible content is stored
            const fullPath = this.getFullContentPath();
            
            // Check if path exists
            if (!(await this.app.vault.adapter.exists(fullPath))) {
                console.log(`Bible content directory ${fullPath} does not exist yet`);
                return;
            }
            
            // Get all book directories
            const bookDirs = await this.app.vault.adapter.list(fullPath);
            
            // Process each book directory
            for (const bookDir of bookDirs.folders) {
                // Get all chapter files
                const files = await this.app.vault.adapter.list(bookDir);
                
                // Process each chapter file
                for (const file of files.files) {
                    if (file.endsWith('.json')) {
                        try {
                            // Read and parse the file
                            const content = await this.app.vault.adapter.read(file);
                            const data = JSON.parse(content);
                            
                            // Process the data if it's in the expected format
                            if (this.isESVApiFormat(data)) {
                                // Store the chapter content
                                const canonical = data.canonical;
                                const htmlContent = data.passages[0];
                                
                                this.htmlFormattedBible[canonical] = {
                                    canonical,
                                    htmlContent
                                };
                            }
                        } catch (error) {
                            console.error(`Error processing file ${file}:`, error);
                        }
                    }
                }
            }
            
            console.log(`Loaded ${Object.keys(this.htmlFormattedBible).length} Bible chapters from vault`);
        } catch (error) {
            console.error('Error loading Bible chapters from vault:', error);
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
     * Create a DOM-friendly error message for missing token or API errors
     */
    private createErrorMessageContent(doc: Document, type: 'missing-token' | 'api-error', message: string = '', details: string = ''): HTMLElement {
        // We're required to return a string here because it's part of the ESV API response structure
        // This method creates the content in a DOM-safe way then serializes to a string
        const container = doc.createElement('div');
        container.className = type === 'missing-token' ? 'bible-missing-token-warning' : 'bible-api-error';
        
        const titleEl = doc.createElement('p');
        const titleStrong = doc.createElement('strong');
        titleStrong.textContent = type === 'missing-token' ? 'ESV API Token Not Set' : 'Error Loading Bible Passage';
        titleEl.appendChild(titleStrong);
        container.appendChild(titleEl);
        
        if (message) {
            const messageEl = doc.createElement('p');
            messageEl.textContent = message;
            container.appendChild(messageEl);
        }
        
        if (details) {
            const detailsEl = doc.createElement('p');
            detailsEl.textContent = details;
            container.appendChild(detailsEl);
        }
        
        // For the API token link
        if (type === 'missing-token') {
            const linkPara = doc.createElement('p');
            linkPara.textContent = 'You can request a free token from ';
            
            const link = doc.createElement('a');
            link.textContent = 'api.esv.org';
            link.href = 'https://api.esv.org/docs/';
            link.target = '_blank';
            
            linkPara.appendChild(link);
            linkPara.appendChild(doc.createTextNode('.'));
            container.appendChild(linkPara);
        }
        
        return container;
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
                htmlContent: this.createErrorMessageContent(
                    document,
                    'missing-token',
                    'To display Bible passages, you need to set up an ESV API token in the plugin settings.'
                ).outerHTML,
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
                    htmlContent: this.createErrorMessageContent(
                        document,
                        'api-error',
                        'Failed to load the passage from the ESV API.',
                        `Status: ${response.status}. Please check your API token in the plugin settings.`
                    ).outerHTML
                };
            }
        } catch (error) {
            console.error('Error downloading from ESV API:', error);
            
            return {
                reference: reference,
                verses: [],
                htmlContent: this.createErrorMessageContent(
                    document,
                    'api-error',
                    'An error occurred when trying to access the ESV API.',
                    'Please check your internet connection and API token.'
                ).outerHTML
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
            
            // Create the directory structure with version subdirectory
            const fullPath = this.getFullContentPath();
            const bookPath = `${fullPath}/${book}`;
            await this.ensureVaultDirectoryExists(fullPath);
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

    /**
     * Ensures Bible data is loaded, downloading if necessary
     */
    public async ensureBibleData(): Promise<void> {
        try {
            // Check if we have data by looking for specific files in the vault
            const hasData = await this.checkBibleDataExists();
            
            if (!hasData) {
                console.log('Bible data not found, loading from vault...');
                await this.loadBibleChaptersFromVault();
            } else {
                console.log('Bible data already exists');
            }
        } catch (error) {
            console.error('Error ensuring Bible data:', error);
            throw error;
        }
    }
    
    /**
     * Check if Bible data exists in the vault
     */
    private async checkBibleDataExists(): Promise<boolean> {
        try {
            // Check for a common book like Genesis
            const genesisPath = `${this.getFullContentPath()}/Genesis/Genesis 1.md`;
            return await this.app.vault.adapter.exists(genesisPath);
        } catch (error) {
            console.error('Error checking if Bible data exists:', error);
            return false;
        }
    }
} 
