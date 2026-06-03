import { App, FuzzySuggestModal, TFile } from "obsidian";

/** Fuzzy-pick a markdown note to append the selection to. */
export class InsertTargetModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private onChoose: (file: TFile) => void | Promise<void>) {
		super(app);
		this.setPlaceholder("Append to note…");
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		void this.onChoose(file);
	}
}
