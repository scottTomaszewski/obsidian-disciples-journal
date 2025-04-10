import { App, ButtonComponent, DropdownComponent, Notice, Setting, TFile } from "obsidian";
import { BibleReference } from "../core/BibleReference";
import { BookNameService } from "../services/BookNameService";
import { BibleContentService } from "../services/BibleContentService";
import { BibleFormatter } from "../utils/BibleFormatter";

/**
 * Component for generating Bible navigation elements
 */
export class BibleNavigation {
    private app: App;
    private bookNameService: BookNameService;
    private vaultPath: string;
    private bibleContentService: BibleContentService;
    private downloadOnDemand: boolean = true;
    
    // Bible book structure (book name and chapter count)
    private bibleStructure: {[book: string]: number} = {
        // Old Testament
        "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
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
    private bookOrder: string[] = [
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
    
    constructor(
        app: App, 
        bookNameService: BookNameService, 
        bibleContentService: BibleContentService,
        vaultPath: string = 'Bible/ESV',
        downloadOnDemand: boolean = true
    ) {
        this.app = app;
        this.bookNameService = bookNameService;
        this.bibleContentService = bibleContentService;
        this.vaultPath = vaultPath;
        this.downloadOnDemand = downloadOnDemand;
    }
    
    /**
     * Set the vault path for Bible content
     */
    public setVaultPath(path: string): void {
        this.vaultPath = path;
    }
    
    /**
     * Set whether to download content on demand
     */
    public setDownloadOnDemand(value: boolean): void {
        this.downloadOnDemand = value;
    }
    
    /**
     * Create navigation elements for a Bible chapter
     */
    public createNavigationElements(containerEl: HTMLElement, reference: BibleReference): void {
        const book = this.bookNameService.standardizeBookName(reference.book) || reference.book;
        const chapter = reference.chapter;
        
        // Get book chapter count
        const chapterCount = this.bibleStructure[book] || 1;
        
        // Determine if we're at the first or last chapter of the book
        const isFirstChapter = chapter === 1;
        const isLastChapter = chapter === chapterCount;
        
        // Determine if we're at the first or last book of the Bible
        const bookIndex = this.bookOrder.indexOf(book);
        const isFirstBook = bookIndex === 0;
        const isLastBook = bookIndex === this.bookOrder.length - 1;
        
        // Create the navigation container
        const navEl = containerEl.createDiv({ cls: 'bible-navigation' });
        
        // Previous chapter button
        if (isFirstChapter && isFirstBook) {
            // No previous chapter if we're at Genesis 1
            navEl.createSpan({ 
                cls: 'nav-prev nav-disabled', 
                text: '◄ Previous' 
            });
        } else if (isFirstChapter) {
            // Previous book, last chapter
            const prevBook = this.bookOrder[bookIndex - 1];
            const prevChapter = this.bibleStructure[prevBook];
            
            const prevButton = new ButtonComponent(navEl)
                .setButtonText(`◄ ${prevBook} ${prevChapter}`)
                .setClass('nav-prev')
                .setClass('nav-button')
                .onClick(async () => {
                    const loadingNotice = new Notice("Loading chapter...", 0);
                    await this.navigateToChapter(prevBook, prevChapter);
                    loadingNotice.hide();
                });
        } else {
            // Previous chapter in same book
            const prevButton = new ButtonComponent(navEl)
                .setButtonText(`◄ ${book} ${chapter - 1}`)
                .setClass('nav-prev')
                .setClass('nav-button')
                .onClick(async () => {
                    const loadingNotice = new Notice("Loading chapter...", 0);
                    await this.navigateToChapter(book, chapter - 1);
                    loadingNotice.hide();
                });
        }
        
        // Book and chapter selector
        const selectorEl = navEl.createSpan({
            cls: 'nav-book-selector',
            text: `📖 ${book} ${chapter}`
        });
        
        const selectorContainer = navEl.createDiv({
            cls: 'nav-book-data'
        });
        selectorContainer.style.display = 'none';
        
        // Create the book dropdown
        const bookDropdownContainer = selectorContainer.createDiv();
        const bookDropdown = new DropdownComponent(bookDropdownContainer);
        
        // Add all books to the dropdown
        for (const bookName of this.bookOrder) {
            bookDropdown.addOption(bookName, bookName);
        }
        bookDropdown.setValue(book);
        
        // Create the chapter dropdown
        const chapterDropdownContainer = selectorContainer.createDiv({ cls: 'nav-chapter-container' });
        const chapterDropdown = new DropdownComponent(chapterDropdownContainer);
        
        // Add current book's chapters to the dropdown
        this.populateChapterDropdown(chapterDropdown, book, chapter);
        
        // When book selection changes, update chapter dropdown
        bookDropdown.onChange(value => {
            this.populateChapterDropdown(chapterDropdown, value, 1);
        });
        
        // Add Go button
        const goButton = new ButtonComponent(selectorContainer)
            .setButtonText('Go')
            .setClass('nav-go-button')
            .onClick(async () => {
                const selectedBook = bookDropdown.getValue();
                const selectedChapter = parseInt(chapterDropdown.getValue());
                const loadingNotice = new Notice("Loading chapter...", 0);
                await this.navigateToChapter(selectedBook, selectedChapter);
                loadingNotice.hide();
            });
        
        // Toggle selector on click
        selectorEl.addEventListener('click', () => {
            selectorContainer.style.display = 
                selectorContainer.style.display === 'none' ? 'block' : 'none';
        });
        
        // Next chapter button
        if (isLastChapter && isLastBook) {
            // No next chapter if we're at Revelation 22
            navEl.createSpan({ 
                cls: 'nav-next nav-disabled', 
                text: 'Next ►' 
            });
        } else if (isLastChapter) {
            // Next book, first chapter
            const nextBook = this.bookOrder[bookIndex + 1];
            
            const nextButton = new ButtonComponent(navEl)
                .setButtonText(`► ${nextBook} 1`)
                .setClass('nav-next')
                .setClass('nav-button')
                .onClick(async () => {
                    const loadingNotice = new Notice("Loading chapter...", 0);
                    await this.navigateToChapter(nextBook, 1);
                    loadingNotice.hide();
                });
        } else {
            // Next chapter in same book
            const nextButton = new ButtonComponent(navEl)
                .setButtonText(`${book} ${chapter + 1} ►`)
                .setClass('nav-next')
                .setClass('nav-button')
                .onClick(async () => {
                    const loadingNotice = new Notice("Loading chapter...", 0);
                    await this.navigateToChapter(book, chapter + 1);
                    loadingNotice.hide();
                });
        }
    }
    
    /**
     * Populate the chapter dropdown for a specific book
     */
    private populateChapterDropdown(
        dropdown: DropdownComponent, 
        book: string, 
        selectedChapter: number
    ): void {
        // Clear existing options
        dropdown.selectEl.empty();
        
        // Get the chapter count for this book
        const chapterCount = this.bibleStructure[book] || 1;
        
        // Add chapter options
        for (let i = 1; i <= chapterCount; i++) {
            dropdown.addOption(i.toString(), i.toString());
        }
        
        // Set the selected chapter
        dropdown.setValue(selectedChapter.toString());
    }
    
    /**
     * Navigate to a specific chapter
     */
    public async navigateToChapter(book: string, chapter: number): Promise<void> {
        try {
            // Create the file path using the utility
            const filePath = BibleFormatter.buildChapterPath(this.vaultPath, book, chapter);
            
            // Try to find the file
            let abstractFile = this.app.vault.getAbstractFileByPath(filePath);
            
            // If file exists, open it
            if (abstractFile && abstractFile instanceof TFile) {
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(abstractFile);
                return;
            }
            
            // File doesn't exist, try to create it if download on demand is enabled
            if (this.downloadOnDemand) {
                try {
                    // Create a BibleReference
                    const reference = new BibleReference(book, chapter);
                    const referenceStr = reference.toString();
                    
                    // Get the Bible content
                    const passage = await this.bibleContentService.getBibleContent(referenceStr);
                    
                    if (!passage) {
                        new Notice(`Failed to load content for ${book} ${chapter}`);
                        return;
                    }
                    
                    // Format the content
                    const content = BibleFormatter.formatChapterContent(passage);
                    
                    // Ensure the book directory exists
                    const bookPath = `${this.vaultPath}/${book}`;
                    await this.app.vault.adapter.mkdir(bookPath);
                    
                    // Create the file
                    const newFile = await this.app.vault.create(filePath, content);
                    
                    // Open the new file
                    const leaf = this.app.workspace.getLeaf();
                    await leaf.openFile(newFile);
                } catch (error) {
                    new Notice(`Error creating chapter note: ${error.message}`);
                    console.error('Error creating chapter note:', error);
                }
            } else {
                new Notice(`Chapter ${book} ${chapter} not found.`);
            }
        } catch (error) {
            console.error('Error navigating to chapter:', error);
            new Notice(`Error navigating to chapter: ${error.message}`);
        }
    }
} 