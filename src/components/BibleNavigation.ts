import {App, ButtonComponent, DropdownComponent, Notice} from "obsidian";
import {BibleReference} from "../core/BibleReference";
import {BookNames} from "../services/BookNames";
import {BibleChapterFiles} from "../services/BibleChapterFiles";
import { BookSuggest } from "./BookSuggest";

/**
 * Component for generating Bible navigation elements
 */
export class BibleNavigation {
	private bibleBookFiles: BibleChapterFiles;
	private app: App;

	constructor(noteCreationService: BibleChapterFiles, app: App) {
		this.bibleBookFiles = noteCreationService;
		this.app = app;
	}

	/**
	 * Create navigation elements for a Bible chapter
	 */
	public createNavigationElements(containerEl: HTMLElement, reference: BibleReference): void {
		const book = BookNames.normalize(reference.book) || reference.book;
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
		const navEl = containerEl.createDiv({cls: 'bible-navigation'});

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

		// Create the book input element
		const bookSelectionContainer = selectorContainer.createEl('div', {cls: 'nav-book-select-container'});
		const bookInputEl = bookSelectionContainer.createEl('input', {
			type: 'text',
			attr: { placeholder: 'Search book...' },
			value: book
		});

		// Instantiate BookSuggest
		new BookSuggest(this.app, bookInputEl, (bookName: string) => {
			this.populateChapterDropdown(chapterDropdown, bookName, 1);
			bookInputEl.value = bookName; // Ensure input value is updated on select
		});

		// Create the chapter dropdown
		const chapterDropdownContainer = selectorContainer.createDiv({cls: 'nav-chapter-container'});
		const chapterDropdown = new DropdownComponent(chapterDropdownContainer);

		// Add current book's chapters to the dropdown
		this.populateChapterDropdown(chapterDropdown, book, chapter);

		// Add Go button
		new ButtonComponent(selectorContainer)
			.setButtonText('Go')
			.setClass('nav-go-button')
			.onClick(async () => {
				const selectedBook = bookInputEl.value; // Use bookInputEl value
				const normalizedBook = BookNames.normalize(selectedBook);
				if (!normalizedBook || !bookOrder.includes(normalizedBook)) {
					new Notice("Invalid book selected.");
					return;
				}
				const selectedChapter = parseInt(chapterDropdown.getValue());
				const loadingNotice = new Notice("Loading chapter...", 0);
				await this.navigateToChapter(normalizedBook, selectedChapter);
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
			await this.bibleBookFiles.openChapterNote(new BibleReference(book, chapter).toString());
		} catch (error) {
			console.error('Error navigating to chapter:', error);
			new Notice(`Error navigating to chapter: ${error.message}`);
		}
	}
} 
