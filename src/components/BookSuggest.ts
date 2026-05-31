import { App, AbstractInputSuggest } from 'obsidian';
import { BookNames } from '../services/BookNames';

export class BookSuggest extends AbstractInputSuggest<string> {
	private readonly onBookSelected: (book: string) => void;
	private inputEl: HTMLInputElement;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onBookSelected: (book: string) => void
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.onBookSelected = onBookSelected;

		const wrapper = inputEl.parentElement!;
		wrapper.addClass('disciples-journal-book-suggest-wrapper');

		// make room for the clear “×”
		inputEl.addClass('disciples-journal-book-suggest-input');
		const clearBtn = wrapper.createEl('button', {
			cls: 'clear-input-button',
			text: '×',
			attr: { type: 'button', 'aria-label': 'Clear input' }
		});

		clearBtn.addEventListener('click', (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			inputEl.value = '';
			this.close();      // hide suggester
			inputEl.focus();   // put focus back in the field
		});
	}

	getSuggestions(query: string): string[] {
		const lowerCaseQuery = query.toLowerCase();
		const bookOrder = BookNames.getBookOrder();
		return bookOrder.filter((book) =>
			book.toLowerCase().includes(lowerCaseQuery)
		);
	}

	renderSuggestion(book: string, el: HTMLElement): void {
		el.setText(book);
	}

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent) {
		super.selectSuggestion(value, evt);
		this.onBookSelected(value);
		this.close();
	}

	// Hack to handle the transformX in the css so that the select pops up in the right spot
	override open(): void {
		super.open();

		// give Obsidian time to insert & position the popover…
		window.requestAnimationFrame(() => {
			// 1) grab the suggestion container
			//    this is the <div> Obsidian just appended after your input
			const container = this.inputEl.doc.querySelector('.suggestion-container');
			if (!(container instanceof HTMLElement)) return;

			// 2) compute your input's screen-coords
			const rect = this.inputEl.getBoundingClientRect();

			// 3) force the dropdown to sit flush with your input's left edge
			//    (dynamic positioning depends on runtime geometry)
			container.setCssStyles({
				position: 'absolute',
				left: `${rect.left}px`,
				top: `${rect.bottom}px`,
				minWidth: `${rect.width}px`,
			});
		});
	}
}
