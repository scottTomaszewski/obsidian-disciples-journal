import { BibleReference } from "./BibleReference";
import { VerseRef } from "../utils/VerseId";

/**
 * A mutable, ordered, de-duplicated set of verses within one book. Produces
 * contiguous BibleReference runs and a human display label. Pure (no DOM / Obsidian).
 */
export class VerseSelection {
	readonly book: string;
	private verses: VerseRef[] = [];

	constructor(book: string) {
		this.book = book;
	}

	private indexOf(v: VerseRef): number {
		return this.verses.findIndex((x) => x.chapter === v.chapter && x.verse === v.verse);
	}

	has(v: VerseRef): boolean {
		return this.indexOf(v) !== -1;
	}

	isEmpty(): boolean {
		return this.verses.length === 0;
	}

	count(): number {
		return this.verses.length;
	}

	clear(): void {
		this.verses = [];
	}

	add(v: VerseRef): void {
		if (!this.has(v)) {
			this.verses.push({ chapter: v.chapter, verse: v.verse });
			this.sort();
		}
	}

	toggle(v: VerseRef): void {
		const i = this.indexOf(v);
		if (i === -1) this.add(v);
		else this.verses.splice(i, 1);
	}

	/** Add every verse from anchor..focus when they share a chapter; else just add focus. */
	selectRange(anchor: VerseRef, focus: VerseRef): void {
		if (anchor.chapter !== focus.chapter) {
			this.add(focus);
			return;
		}
		const lo = Math.min(anchor.verse, focus.verse);
		const hi = Math.max(anchor.verse, focus.verse);
		for (let v = lo; v <= hi; v++) this.add({ chapter: anchor.chapter, verse: v });
	}

	/** Sorted copy of the selected verses. */
	verseList(): VerseRef[] {
		return this.verses.map((v) => ({ chapter: v.chapter, verse: v.verse }));
	}

	private sort(): void {
		this.verses.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
	}

	/** Collapse consecutive verses within a chapter into BibleReference ranges. */
	runs(): BibleReference[] {
		const out: BibleReference[] = [];
		let start: VerseRef | null = null;
		let prev: VerseRef | null = null;

		const flush = () => {
			if (!start || !prev) return;
			const endVerse = prev.verse === start.verse ? undefined : prev.verse;
			out.push(new BibleReference(this.book, start.chapter, start.verse, endVerse));
		};

		for (const v of this.verses) {
			if (prev && v.chapter === prev.chapter && v.verse === prev.verse + 1) {
				prev = v;
				continue;
			}
			flush();
			start = v;
			prev = v;
		}
		flush();
		return out;
	}

	/** YouVersion-style label, e.g. "Genesis 1:2-3, 5" or "Genesis 1:31, 2:1". */
	label(): string {
		const runs = this.runs();
		if (runs.length === 0) return this.book;
		let lastChapter: number | null = null;
		const parts: string[] = [];
		for (const r of runs) {
			const versePart = r.endVerse !== undefined ? `${r.verse}-${r.endVerse}` : `${r.verse}`;
			parts.push(r.chapter === lastChapter ? versePart : `${r.chapter}:${versePart}`);
			lastChapter = r.chapter;
		}
		return `${this.book} ${parts.join(", ")}`;
	}
}
