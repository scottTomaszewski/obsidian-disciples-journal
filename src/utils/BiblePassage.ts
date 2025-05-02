import {BibleReference} from "../core/BibleReference";

export class BiblePassage {
	private _ref: BibleReference;
	private _html: string;

	constructor(ref: BibleReference, html: string) {
		this._ref = ref;
		this._html = html;
	}

	get reference(): BibleReference {
		return this._ref;
	}

	get html(): string {
		return this._html;
	}
}
