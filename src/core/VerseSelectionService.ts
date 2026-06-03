import { Component } from "obsidian";
import { VerseSelection } from "./VerseSelection";

/** Anything that can own the current selection (a per-passage controller). */
export interface SelectionOwner {
	readonly id: string;
}

interface ActiveSelection {
	selection: VerseSelection;
	owner: SelectionOwner;
}

/**
 * Holds the single active verse selection across all panes/windows. Controllers
 * subscribe; only the owning controller renders highlight + action bar.
 */
export class VerseSelectionService extends Component {
	private active: ActiveSelection | null = null;
	private listeners = new Set<() => void>();

	/** Subscribe to selection changes. Returns an unsubscribe function. */
	onChange(cb: () => void): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	get(): ActiveSelection | null {
		return this.active;
	}

	/** Replace the active selection (or clear with an empty one). */
	set(selection: VerseSelection, owner: SelectionOwner): void {
		this.active = selection.isEmpty() ? null : { selection, owner };
		this.emit();
	}

	clear(): void {
		if (!this.active) return;
		this.active = null;
		this.emit();
	}

	/** Clear only if `owner` currently owns the selection (e.g. its passage re-rendered). */
	clearIfOwner(owner: SelectionOwner): void {
		if (this.active?.owner.id === owner.id) this.clear();
	}

	onunload(): void {
		this.listeners.clear();
		this.active = null;
	}

	private emit(): void {
		for (const cb of this.listeners) cb();
	}
}
