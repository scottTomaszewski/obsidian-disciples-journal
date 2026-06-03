import { parseVerseId } from "../utils/VerseId";

/**
 * Post-process a rendered ESV passage so each verse's inline text is wrapped in a
 * `<span class="dj-verse" data-chapter data-verse>`, making verses selectable and
 * highlightable. Idempotent: skips a passage that's already wrapped.
 *
 * ESV HTML marks verses only with `<b class="verse-num|chapter-num" id="vBBCCCVVV-N">`;
 * a verse's text runs as loose nodes until the next marker, sometimes across <p>
 * boundaries — so we wrap per block element and tag spans with the verse number.
 */
export function wrapPassageVerses(passageEl: HTMLElement): void {
	if (passageEl.querySelector(".dj-verse")) return;
	const doc = passageEl.doc;

	const blocks = passageEl.querySelectorAll("p, li");
	blocks.forEach((block) => {
		let current: HTMLSpanElement | null = null;
		// Snapshot child nodes first; we re-parent them as we go.
		const nodes = Array.from(block.childNodes);
		for (const node of nodes) {
			const marker =
				node.instanceOf(HTMLElement) && (node.hasClass("verse-num") || node.hasClass("chapter-num"))
					? parseVerseId(node.id)
					: null;

			if (marker) {
				current = doc.createElement("span");
				current.addClass("dj-verse");
				current.dataset.chapter = String(marker.chapter);
				current.dataset.verse = String(marker.verse);
				block.insertBefore(current, node);
			}

			if (current) {
				current.appendChild(node); // moves node out of block into the span
			}
			// Nodes before the first marker (rare) stay where they are.
		}
	});
}
