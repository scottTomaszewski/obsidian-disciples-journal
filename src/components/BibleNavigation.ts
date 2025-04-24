import { ButtonComponent, DropdownComponent, Notice } from "obsidian";
import { BibleReference } from "../core/BibleReference";
import { BookNames } from "../services/BookNames";
import {NoteCreationService} from "../services/NoteCreationService";

/**
 * Component for generating Bible navigation elements
 */
export class BibleNavigation {
	private noteCreationService: NoteCreationService;

    constructor(noteCreationService: NoteCreationService) {
		this.noteCreationService = noteCreationService;
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
			await this.noteCreationService.openChapterNote(new BibleReference(book, chapter).toString());
        } catch (error) {
            console.error('Error navigating to chapter:', error);
            new Notice(`Error navigating to chapter: ${error.message}`);
        }
    }
} 
