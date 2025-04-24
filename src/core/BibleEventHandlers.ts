import { BibleReferenceRenderer } from '../components/BibleReferenceRenderer';

/**
 * Handles all Bible reference-related DOM events
 */
export class BibleEventHandlers {
    private bibleReferenceRenderer: BibleReferenceRenderer;
    private previewPopper: HTMLElement | null = null;
    
    constructor(bibleReferenceRenderer: BibleReferenceRenderer) {
        this.bibleReferenceRenderer = bibleReferenceRenderer;
    }
	/**
     * Handle hover on Bible references
     */
    async handleBibleReferenceHover(event: MouseEvent) {
        // Don't create new preview if we already have one active
        if (this.previewPopper) return;
        
        const target = event.target as HTMLElement;
        if (!target || !target.closest) return;
        
        const referenceEl = target.closest('.bible-reference') as HTMLElement;
        if (!referenceEl) return;
        
        const referenceText = referenceEl.textContent;
        if (!referenceText) return;
        
        try {
            // Create new preview
            this.previewPopper = await this.bibleReferenceRenderer.showVersePreview(
                referenceEl, 
                referenceText,
                event
            );
            
            // Add event listeners directly to the preview for better control
            if (this.previewPopper) {
                // When mouse enters the popup, mark it as locked
                this.previewPopper.addEventListener('mouseenter', () => {
                    this.previewPopper?.classList.add('popup-locked');
                });
                
                // When mouse leaves the popup, check if we should close it
                this.previewPopper.addEventListener('mouseleave', (e) => {
                    // Only close if not moving to the reference or another part of the popup
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (relatedTarget && 
                        !relatedTarget.classList.contains('bible-reference') && 
                        !relatedTarget.closest('.bible-verse-preview')) {
                        this.previewPopper?.classList.remove('popup-locked');
                        this.removePreviewPopper(relatedTarget.doc);
                    }
                });
            }
            
            // Also add listeners to the reference element
            referenceEl.addEventListener('mouseleave', (e) => {
                // Don't close if the popup is locked (being hovered) or we're moving to the popup
                if (this.previewPopper) {
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    
                    // If moving to the popup or if popup is locked, don't close
                    if (relatedTarget && 
                        (relatedTarget.classList.contains('bible-verse-preview') || 
                        relatedTarget.closest('.bible-verse-preview') ||
                        this.previewPopper.classList.contains('popup-locked'))) {
                        return;
                    }
                    
                    // Add a 100ms delay before closing to allow for cursor movement
                    setTimeout(() => {
                        // If locked during this delay, don't close
                        if (!this.previewPopper || this.previewPopper.classList.contains('popup-locked')) {
                            return;
                        }
                        this.removePreviewPopper(relatedTarget.doc);
                    }, 100);
                }
            });
        } catch (error) {
            console.error('Error showing Bible reference preview:', error);
        }
    }
    
    /**
     * Handle mouse out from Bible references
     */
    handleBibleReferenceMouseOut(event: MouseEvent) {
        // If we don't have a popup, nothing to do
        if (!this.previewPopper) return;
        
        // If the popup is locked (being hovered), don't close it
        if (this.previewPopper.classList.contains('popup-locked')) {
            return;
        }
        
        const target = event.target as HTMLElement;
        const relatedTarget = event.relatedTarget as HTMLElement;
        
        // If either target is missing, can't make a good decision
        if (!target || !relatedTarget) return;
        
        // If moving to/from the popup or reference, don't close
        if (target.classList.contains('bible-reference') || 
            target.classList.contains('bible-verse-preview') ||
            target.closest('.bible-verse-preview') ||
            relatedTarget.classList.contains('bible-reference') ||
            relatedTarget.classList.contains('bible-verse-preview') ||
            relatedTarget.closest('.bible-verse-preview')) {
            return;
        }
        
        // In all other cases, remove the popup
        this.removePreviewPopper(target.doc);
    }
    
    /**
     * Remove the preview popper if it exists
     */
    removePreviewPopper(doc: Document) {
        if (this.previewPopper) {
            // Remove any hover gap elements
            const hoverGaps = doc.querySelectorAll('.bible-hover-gap');
            hoverGaps.forEach(gap => gap.remove());
            
            this.previewPopper.remove();
            this.previewPopper = null;
        }
    }
}
