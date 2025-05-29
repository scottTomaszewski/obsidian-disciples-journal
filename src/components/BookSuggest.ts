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
		wrapper.style.position = 'relative';
		wrapper.style.display = 'inline-block';  // shrink‐wrap to input width

		// make room for the clear “×”
		inputEl.style.paddingRight = '1.5em';
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
		requestAnimationFrame(() => {
			// 1) grab the suggestion container
			//    this is the <div> Obsidian just appended after your input
			const container = this.inputEl.doc
				?.querySelector('.suggestion-container') as HTMLElement;

			if (!container) return;

			// 2) compute your input's screen-coords
			const rect = this.inputEl.getBoundingClientRect();

			// 3) force the dropdown to sit flush with your input's left edge
			container.style.position = 'absolute';
			container.style.left     = `${rect.left}px`;
			container.style.top      = `${rect.bottom}px`;       // drop below
			container.style.minWidth = `${rect.width}px`;        // match widths
		});
	}
}
