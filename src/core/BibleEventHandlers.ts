import { Component } from 'obsidian';
import { BiblePassage } from 'src/utils/BiblePassage';
import { BibleReferenceRenderer } from '../components/BibleReferenceRenderer';

/**
 * Handles all Bible reference-related DOM events.
 *
 * Owned as a single long-lived instance by the plugin (added via `addChild`), so
 * its document listeners and poll timer are registered through the `Component`
 * lifecycle and torn down automatically on plugin unload.
 */
export class BibleEventHandlers extends Component {
	private bibleReferenceRenderer: BibleReferenceRenderer;
	private previewPopper: HTMLElement | null = null;
	private activeReferenceEl: HTMLElement | null = null;
	private lastMouseX: number = 0;
	private lastMouseY: number = 0;
	// Documents we've already attached the global mousemove/click listeners to.
	private trackedDocs: WeakSet<Document> = new WeakSet();

	constructor(bibleReferenceRenderer: BibleReferenceRenderer) {
		super();
		this.bibleReferenceRenderer = bibleReferenceRenderer;
	}

	override onload() {
		// Track the main document up front; pop-out documents are tracked lazily
		// when a hover happens inside them (see handleBibleReferenceHover).
		this.trackDocument(activeDocument);

		// A single persistent poll that closes the preview once the mouse leaves
		// both the reference and the preview. Registered so it's cleared on unload.
		this.registerInterval(window.setInterval(() => this.checkMousePosition(), 200));
	}

	override onunload() {
		// Listeners and the interval are cleared by Component; just remove any
		// preview element still in the DOM.
		this.clearAllPreviews();
	}

	/**
	 * Attach the global mouse-tracking and click-to-dismiss listeners to a
	 * document, once per document (deduped via trackedDocs). Registering through
	 * the Component means they're removed automatically on unload.
	 */
	private trackDocument(doc: Document) {
		if (this.trackedDocs.has(doc)) return;
		this.trackedDocs.add(doc);

		this.registerDomEvent(doc, 'mousemove', (e: MouseEvent) => {
			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
		});

		this.registerDomEvent(doc, 'click', (e: MouseEvent) => {
			const clickTarget = e.target as HTMLElement;
			if (this.previewPopper &&
				clickTarget &&
				!clickTarget.closest('.bible-verse-preview') &&
				!clickTarget.closest('.bible-reference')) {
				this.clearAllPreviews();
			}
		});
	}

	/**
	 * Handle hover on Bible references
	 */
	async handleBibleReferenceHover(event: MouseEvent, passage: BiblePassage) {
		const target = event.target as HTMLElement;
		if (!target || !target.closest) return;

		const referenceEl = target.closest('.bible-reference') as HTMLElement;
		if (!referenceEl) return;

		// Ensure the document this reference lives in has its listeners (pop-out support).
		this.trackDocument(referenceEl.ownerDocument);

		// If we're hovering the same reference that already has a preview, do nothing
		if (this.previewPopper && this.activeReferenceEl === referenceEl) {
			return;
		}

		// If we have an existing preview but for a different reference, remove it
		if (this.previewPopper) {
			this.clearAllPreviews();
		}

		const referenceText = referenceEl.textContent;
		if (!referenceText) return;

		// Store reference to the active element
		this.activeReferenceEl = referenceEl;

		// Store current mouse position
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;

		try {
			// Create new preview
			this.previewPopper = await this.bibleReferenceRenderer.showVersePreview(
				referenceEl,
				passage,
				event
			);
		} catch (error) {
			console.error('Error showing Bible reference preview:', error);
		}
	}

	/**
	 * Poll callback: close the preview once the mouse is outside both the
	 * reference and the preview. No-op when no preview is showing.
	 */
	private checkMousePosition() {
		if (!this.previewPopper || !this.activeReferenceEl) {
			return;
		}

		// Get bounding rects for both elements
		const previewRect = this.previewPopper.getBoundingClientRect();
		const referenceRect = this.activeReferenceEl.getBoundingClientRect();

		// Check if mouse is inside either element
		const isMouseOverPreview =
			this.lastMouseX >= previewRect.left &&
			this.lastMouseX <= previewRect.right &&
			this.lastMouseY >= previewRect.top &&
			this.lastMouseY <= previewRect.bottom;

		const isMouseOverReference =
			this.lastMouseX >= referenceRect.left &&
			this.lastMouseX <= referenceRect.right &&
			this.lastMouseY >= referenceRect.top &&
			this.lastMouseY <= referenceRect.bottom;

		// If mouse is not over either element, close the preview
		if (!isMouseOverPreview && !isMouseOverReference) {
			this.clearAllPreviews();
		}
	}

	/**
	 * Handle mouse out from Bible references - for backwards compatibility
	 */
	handleBibleReferenceMouseOut(event: MouseEvent) {
		// We're using the interval-based tracking now, so this method is largely
		// for backwards compatibility

		// If no preview active, nothing to do
		if (!this.previewPopper) return;

		const relatedTarget = event.relatedTarget as HTMLElement;

		// If moving directly to the preview element, don't close
		if (relatedTarget &&
			(relatedTarget.classList.contains('bible-verse-preview') ||
			 relatedTarget.closest('.bible-verse-preview'))) {
			return;
		}

		// The interval will handle cleanup if needed
	}

	/**
	 * Remove the preview popper if it exists
	 */
	removePreviewPopper(doc: Document) {
		if (this.previewPopper) {
			// Remove any hover gap elements
			try {
				const hoverGaps = doc.querySelectorAll('.bible-hover-gap');
				hoverGaps.forEach(gap => gap.remove());
			} catch {
				// Ignore any errors during cleanup
			}

			this.previewPopper.remove();
			this.previewPopper = null;
		}
	}

	/**
	 * Clear all previews and reset state
	 */
	clearAllPreviews() {
		if (this.previewPopper) {
			const doc = this.previewPopper.ownerDocument;
			this.removePreviewPopper(doc);
		}

		this.activeReferenceEl = null;
	}
}
