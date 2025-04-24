import { App, TFile } from 'obsidian';
import { BibleContentService } from './BibleContentService';
import { BibleReference } from '../core/BibleReference';
import { BibleFormatter } from '../utils/BibleFormatter';
import { DisciplesJournalSettings } from '../settings/DisciplesJournalSettings';

/**
 * Service for creating and opening Bible chapter notes
 */
export class NoteCreationService {
    private app: App;
    private bibleContentService: BibleContentService;
    private settings: DisciplesJournalSettings;
    
    constructor(
        app: App,
        bibleContentService: BibleContentService,
        settings: DisciplesJournalSettings
    ) {
        this.app = app;
        this.bibleContentService = bibleContentService;
        this.settings = settings;
    }
    
    /**
     * Get the full path with version
     */
    private getFullContentPath(): string {
        return `${this.settings.bibleContentVaultPath}/${this.settings.preferredBibleVersion}`;
    }
    
    /**
     * Open or create a chapter note
     */
    public async openChapterNote(reference: string) {
        try {
            // Parse the reference string to ensure it's valid
            const parsedRef = BibleReference.parse(reference);
            if (!parsedRef) {
                console.error(`Invalid reference: ${reference}`);
                return;
            }
            
            // Get full content path including version
            const fullPath = this.getFullContentPath();
            const chapterPath = `${fullPath}/${parsedRef.book}/${parsedRef.book} ${parsedRef.chapter}.md`;
            
            // Check if note exists
            const fileExists = await this.app.vault.adapter.exists(chapterPath);
            
            if (!fileExists && this.settings.downloadOnDemand) {
                // Create the note with content from the API
                await this.createChapterNote(parsedRef);
            }
            
            // Try opening the note
            const file = this.app.vault.getAbstractFileByPath(chapterPath);

            if (file && file instanceof TFile) {
                const leaf = this.app.workspace.getLeaf(false);
                await leaf.openFile(file);
                
                // If there's a specific verse, scroll to it
                if (parsedRef.verse) {
                    setTimeout(() => {
                        // Find the verse element and scroll to it
                        const verseEl = leaf.getContainer().doc.querySelector(`.verse-${parsedRef.verse}`);
                        if (verseEl) {
                            verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 300); // Give it a moment to load
                }
            } else {
                console.error(`Could not find or create the chapter note: ${chapterPath}`);
            }
        } catch (error) {
            console.error('Error opening chapter note:', error);
        }
    }
    
    /**
     * Create a new chapter note
     */
    async createChapterNote(reference: BibleReference) {
        try {
            // Create a properly formatted reference string
            const referenceStr = reference.toString();
            
            // Get the content from the Bible API and format it for a note
            const passage = await this.bibleContentService.getBibleContent(referenceStr);
            
            // Check if passage is null
            if (!passage) {
                console.error(`Failed to get Bible content for ${referenceStr}`);
                throw new Error(`Failed to get Bible content for ${referenceStr}`);
            }
            
            // Use the formatter utility to format the content
            const content = BibleFormatter.formatChapterContent(passage);
            
            // Save the content to a note with the version path
            const fullPath = this.getFullContentPath();
            const bookPath = `${fullPath}/${reference.book}`;
            const chapterPath = `${fullPath}/${reference.book}/${reference.book} ${reference.chapter}.md`;
            
            // Ensure the directory exists
            await this.app.vault.adapter.mkdir(bookPath);
            
            // Create the note
            await this.app.vault.create(chapterPath, content);
            
            return chapterPath;
        } catch (error) {
            console.error('Error creating chapter note:', error);
            throw error;
        }
    }
} 
