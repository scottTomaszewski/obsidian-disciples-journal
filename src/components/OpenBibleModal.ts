import {App, SuggestModal, Notice} from "obsidian";
import {BookNames} from "../services/BookNames";
import {BibleChapterFiles} from "../services/BibleChapterFiles";

interface BibleTarget {
	label: string;
	book: string;
	chapter: number;
}

/**
 * Modal that lets the user pick a book and chapter to open.
 * First shows all books; after selecting a book, shows its chapters.
 */
export class OpenBibleModal extends SuggestModal<BibleTarget> {
	private bibleBookFiles: BibleChapterFiles;
	private selectedBook: string | null = null;

	constructor(app: App, bibleBookFiles: BibleChapterFiles) {
		super(app);
		this.bibleBookFiles = bibleBookFiles;
		this.setPlaceholder('Type a book name...');
	}

	getSuggestions(query: string): BibleTarget[] {
		const lowerQuery = query.toLowerCase().trim();

		if (!this.selectedBook) {
			// Show books filtered by query
			return BookNames.getBookOrder()
				.filter(book => book.toLowerCase().includes(lowerQuery))
				.map(book => ({
					label: book,
					book: book,
					chapter: 0, // sentinel: means "select this book"
				}));
		}

		// Book is selected -- show chapters filtered by query
		const chapterCount = BookNames.getChapterCount(this.selectedBook);
		const chapters: BibleTarget[] = [];
		for (let i = 1; i <= chapterCount; i++) {
			chapters.push({
				label: `${this.selectedBook} ${i}`,
				book: this.selectedBook,
				chapter: i,
			});
		}
		if (lowerQuery) {
			return chapters.filter(c => String(c.chapter).startsWith(lowerQuery));
		}
		return chapters;
	}

	renderSuggestion(item: BibleTarget, el: HTMLElement): void {
		el.setText(item.label);
	}

	async onChooseSuggestion(item: BibleTarget, _evt: MouseEvent | KeyboardEvent): Promise<void> {
		if (item.chapter === 0) {
			// Book selected -- reopen modal for chapter selection
			const chapterCount = BookNames.getChapterCount(item.book);
			if (chapterCount === 1) {
				// Single-chapter book, open directly
				const loadingNotice = new Notice("Loading chapter...", 0);
				await this.bibleBookFiles.openChapterNote(`${item.book} 1`);
				loadingNotice.hide();
			} else {
				// Reopen for chapter selection
				const chapterModal = new OpenBibleChapterModal(this.app, this.bibleBookFiles, item.book);
				chapterModal.open();
			}
		} else {
			const loadingNotice = new Notice("Loading chapter...", 0);
			await this.bibleBookFiles.openChapterNote(`${item.book} ${item.chapter}`);
			loadingNotice.hide();
		}
	}
}

/**
 * Second-stage modal: pick a chapter within a specific book.
 */
class OpenBibleChapterModal extends SuggestModal<BibleTarget> {
	private bibleBookFiles: BibleChapterFiles;
	private book: string;

	constructor(app: App, bibleBookFiles: BibleChapterFiles, book: string) {
		super(app);
		this.bibleBookFiles = bibleBookFiles;
		this.book = book;
		this.setPlaceholder(`${book} -- type a chapter number...`);
	}

	getSuggestions(query: string): BibleTarget[] {
		const chapterCount = BookNames.getChapterCount(this.book);
		const chapters: BibleTarget[] = [];
		for (let i = 1; i <= chapterCount; i++) {
			chapters.push({
				label: `${this.book} ${i}`,
				book: this.book,
				chapter: i,
			});
		}
		const trimmed = query.trim();
		if (trimmed) {
			return chapters.filter(c => String(c.chapter).startsWith(trimmed));
		}
		return chapters;
	}

	renderSuggestion(item: BibleTarget, el: HTMLElement): void {
		el.setText(item.label);
	}

	async onChooseSuggestion(item: BibleTarget, _evt: MouseEvent | KeyboardEvent): Promise<void> {
		const loadingNotice = new Notice("Loading chapter...", 0);
		await this.bibleBookFiles.openChapterNote(`${item.book} ${item.chapter}`);
		loadingNotice.hide();
	}
}
