import { BiblePassage } from 'src/utils/BiblePassage';
import { BibleReferenceRenderer } from '../components/BibleReferenceRenderer';

/**
 * Handles all Bible reference-related DOM events
 */
export class BibleEventHandlers {
	private bibleReferenceRenderer: BibleReferenceRenderer;
	private previewPopper: HTMLElement | null = null;
	private activeReferenceEl: HTMLElement | null = null;
	private mouseTrackingInterval: number | null = null;
	private lastMouseX: number = 0;
	private lastMouseY: number = 0;
	private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
	private clickHandler: ((e: MouseEvent) => void) | null = null;

	constructor(bibleReferenceRenderer: BibleReferenceRenderer) {
		this.bibleReferenceRenderer = bibleReferenceRenderer;
		
		// Set up the global mouse move tracker
		this.mouseMoveHandler = (e: MouseEvent) => {
			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
		};
		document.addEventListener('mousemove', this.mouseMoveHandler);
		
		// Set up global click handler to close previews
		this.clickHandler = (e: MouseEvent) => {
			const clickTarget = e.target as HTMLElement;
			if (this.previewPopper && 
				clickTarget && 
				!clickTarget.closest('.bible-verse-preview') && 
				!clickTarget.closest('.bible-reference')) {
				this.clearAllPreviews();
			}
		};
		document.addEventListener('click', this.clickHandler);
	}

	/**
	 * Handle hover on Bible references
	 */
	async handleBibleReferenceHover(event: MouseEvent, passage: BiblePassage) {
		const target = event.target as HTMLElement;
		if (!target || !target.closest) return;

		const referenceEl = target.closest('.bible-reference') as HTMLElement;
		if (!referenceEl) return;

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

			if (!this.previewPopper) return;
			
			// Set up tracking interval to check mouse position
			this.setupMouseTrackingInterval();
			
		} catch (error) {
			console.error('Error showing Bible reference preview:', error);
		}
	}
	
	/**
	 * Set up interval to track mouse position and hide preview when needed
	 */
	private setupMouseTrackingInterval() {
		// Clear any existing interval
		if (this.mouseTrackingInterval) {
			clearInterval(this.mouseTrackingInterval);
		}
		
		this.mouseTrackingInterval = window.setInterval(() => {
			if (!this.previewPopper || !this.activeReferenceEl) {
				clearInterval(this.mouseTrackingInterval!);
				this.mouseTrackingInterval = null;
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
		}, 200); // Check every 200ms
	}

	/**
	 * Handle mouse out from Bible references - for backwards compatibility
	 */
	handleBibleReferenceMouseOut(event: MouseEvent) {
		// We're using the interval-based tracking now, so this method is largely
		// for backwards compatibility
		
		// If no preview active, nothing to do
		if (!this.previewPopper) return;
		
		const target = event.target as HTMLElement;
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
			if (doc && doc.querySelectorAll) {
				try {
					const hoverGaps = doc.querySelectorAll('.bible-hover-gap');
					hoverGaps.forEach(gap => gap.remove());
				} catch (e) {
					// Ignore any errors during cleanup
				}
			}

			this.previewPopper.remove();
			this.previewPopper = null;
		}
	}
	
	/**
	 * Clear all previews and reset state
	 */
	clearAllPreviews() {
		if (this.mouseTrackingInterval) {
			clearInterval(this.mouseTrackingInterval);
			this.mouseTrackingInterval = null;
		}
		
		if (this.previewPopper) {
			const doc = this.previewPopper.ownerDocument;
			this.removePreviewPopper(doc);
		}
		
		this.activeReferenceEl = null;
	}
	
	/**
	 * Clean up event handlers when plugin is unloaded
	 */
	cleanup() {
		this.clearAllPreviews();
		
		// Remove global event listeners
		if (this.mouseMoveHandler) {
			document.removeEventListener('mousemove', this.mouseMoveHandler);
			this.mouseMoveHandler = null;
		}
		
		if (this.clickHandler) {
			document.removeEventListener('click', this.clickHandler);
			this.clickHandler = null;
		}
	}
}
