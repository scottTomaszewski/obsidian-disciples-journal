import { App, ButtonComponent, DropdownComponent, Notice, TFile } from "obsidian";
import { BibleReference } from "../core/BibleReference";
import { BookNames } from "../services/BookNames";
import { BibleContentService } from "../services/BibleContentService";
import { BibleFormatter } from "../utils/BibleFormatter";

/**
 * Component for generating Bible navigation elements
 */
export class BibleNavigation {
    private app: App;
    private vaultPath: string;
    private bibleContentService: BibleContentService;
    private downloadOnDemand: boolean = true;
    
    constructor(
        app: App, 
        bibleContentService: BibleContentService,
        vaultPath: string = 'Bible/ESV',
        downloadOnDemand: boolean = true
    ) {
        this.app = app;
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
        const book = BookNames.normalizedBookName(reference.book) || reference.book;
        const chapter = reference.chapter;
        
        // Get book chapter count
        const chapterCount = BookNames.getChapterCount(book);
        
        // Determine if we're at the first or last chapter of the book
        const isFirstChapter = chapter === 1;
        const isLastChapter = chapter === chapterCount;
        
        // Determine if we're at the first or last book of the Bible
        const bookOrder = BookNames.getBookOrder();
        const bookIndex = bookOrder.indexOf(book);
        const isFirstBook = bookIndex === 0;
        const isLastBook = bookIndex === bookOrder.length - 1;
        
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
            const prevBook = bookOrder[bookIndex - 1];
            const prevChapter = BookNames.getChapterCount(prevBook);
			new ButtonComponent(navEl)
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
			new ButtonComponent(navEl)
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
            cls: 'nav-book-data dj-hidden'
        });
        
        // Create the book dropdown
        const bookDropdownContainer = selectorContainer.createDiv();
        const bookDropdown = new DropdownComponent(bookDropdownContainer);
        
        // Add all books to the dropdown
        for (const bookName of bookOrder) {
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
		new ButtonComponent(selectorContainer)
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
            selectorContainer.classList.toggle('dj-hidden');
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
            const nextBook = bookOrder[bookIndex + 1];
			new ButtonComponent(navEl)
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
			new ButtonComponent(navEl)
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
        const chapterCount = BookNames.getChapterCount(book);
        
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
