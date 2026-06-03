import { Component } from "obsidian";
import { VerseSelection } from "../core/VerseSelection";
import { VerseRef } from "../utils/VerseId";
import { VerseSelectionService, SelectionOwner } from "../core/VerseSelectionService";
import { VerseActionBar } from "./VerseActionBar";
import { wrapPassageVerses } from "./VerseWrapper";
import DisciplesJournalPlugin from "../core/DisciplesJournalPlugin";

let nextId = 0;
const LONG_PRESS_MS = 400;
const MOVE_CANCEL_PX = 10;

export class VerseSelectionController extends Component implements SelectionOwner {
	readonly id = `dj-passage-${nextId++}`;
	private selection: VerseSelection;
	private anchor: VerseRef | null = null;
	private bar: VerseActionBar | null = null;

	// touch state
	private pressTimer: number | null = null;
	private dragging = false;
	private touchStart: { x: number; y: number } | null = null;

	constructor(
		private plugin: DisciplesJournalPlugin,
		public readonly sourceEl: HTMLElement,
		private book: string,
		private service: VerseSelectionService,
	) {
		super();
		this.selection = new VerseSelection(book);
	}

	onload(): void {
		wrapPassageVerses(this.sourceEl);
		this.sourceEl.addClass("dj-selectable");

		this.registerDomEvent(this.sourceEl, "click", (e) => this.onClick(e));
		this.registerDomEvent(this.sourceEl, "touchstart", (e) => this.onTouchStart(e), { passive: true });
		this.registerDomEvent(this.sourceEl, "touchmove", (e) => this.onTouchMove(e), { passive: false });
		this.registerDomEvent(this.sourceEl, "touchend", () => this.onTouchEnd());

		this.register(this.service.onChange(() => this.reflect()));
	}

	onunload(): void {
		// If this passage owned the selection (e.g. note re-rendered), drop it.
		this.service.clearIfOwner(this);
		this.clearPressTimer();
	}

	private verseAt(node: Element | null): { ref: VerseRef } | null {
		const el = node?.closest<HTMLElement>(".dj-verse") ?? null;
		if (!el || !this.sourceEl.contains(el)) return null;
		const chapter = Number(el.dataset.chapter);
		const verse = Number(el.dataset.verse);
		if (!chapter || !verse) return null;
		return { ref: { chapter, verse } };
	}

	private onClick(e: MouseEvent): void {
		const hit = this.verseAt(e.target instanceof Element ? e.target : null);
		if (!hit) return;
		e.preventDefault();
		if (e.shiftKey && this.anchor) {
			this.selection.selectRange(this.anchor, hit.ref);
		} else {
			this.selection.toggle(hit.ref);
			this.anchor = hit.ref;
		}
		this.commit();
	}

	private onTouchStart(e: TouchEvent): void {
		const hit = this.verseAt(e.target instanceof Element ? e.target : null);
		if (!hit) return;
		const t = e.touches[0];
		this.touchStart = { x: t.clientX, y: t.clientY };
		this.anchor = hit.ref;
		this.pressTimer = this.sourceEl.win.setTimeout(() => {
			// Long-press engaged: select the pressed verse for immediate feedback, then
			// subsequent moves extend the range (and stop the page scrolling).
			this.dragging = true;
			this.selection.add(hit.ref);
			this.commit();
		}, LONG_PRESS_MS);
	}

	private onTouchMove(e: TouchEvent): void {
		if (!this.touchStart) return;
		const t = e.touches[0];
		if (!this.dragging) {
			// Moved before the long-press fired → treat as a scroll, cancel selection.
			const moved = Math.hypot(t.clientX - this.touchStart.x, t.clientY - this.touchStart.y);
			if (moved > MOVE_CANCEL_PX) this.clearPressTimer();
			return;
		}
		e.preventDefault(); // we own the gesture now; stop the page scrolling
		const under = this.sourceEl.doc.elementFromPoint(t.clientX, t.clientY);
		const hit = this.verseAt(under);
		if (hit && this.anchor) {
			this.selection.selectRange(this.anchor, hit.ref);
			this.commit();
		}
	}

	private onTouchEnd(): void {
		const wasDragging = this.dragging;
		this.clearPressTimer();
		if (!wasDragging && this.anchor) {
			// short tap → toggle a single verse
			this.selection.toggle(this.anchor);
			this.commit();
		}
		this.dragging = false;
		this.touchStart = null;
	}

	private clearPressTimer(): void {
		if (this.pressTimer !== null) {
			this.sourceEl.win.clearTimeout(this.pressTimer);
			this.pressTimer = null;
		}
		this.dragging = false;
	}

	/** Push our selection into the shared service (it decides ownership). */
	private commit(): void {
		this.service.set(this.selection, this);
	}

	/** Re-render highlight + bar from the service's current state. */
	private reflect(): void {
		const active = this.service.get();
		const owned = active?.owner.id === this.id ? active.selection : null;

		this.sourceEl.querySelectorAll<HTMLElement>(".dj-verse").forEach((el) => {
			const ref = { chapter: Number(el.dataset.chapter), verse: Number(el.dataset.verse) };
			el.toggleClass("dj-verse-selected", !!owned && owned.has(ref));
		});

		if (owned) {
			if (!this.bar) {
				this.bar = new VerseActionBar(this.plugin, this.sourceEl, () => this.clearSelection());
				this.addChild(this.bar);
			}
			this.bar.render(owned);
		} else {
			this.hideBar();
		}
	}

	clearSelection(): void {
		this.selection.clear();
		this.anchor = null;
		this.service.clearIfOwner(this);
	}

	private hideBar(): void {
		if (this.bar) {
			this.removeChild(this.bar);
			this.bar = null;
		}
	}
}
