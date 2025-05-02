import {BiblePassage} from "./BiblePassage";

export enum ErrorType {
	InvalidReference,
	BadApiResponse,
	ApiAuthentication,
	RequestsForbidden,
}

export class BibleApiResponse {
	private hasError: boolean;
	private _errorMessage: string | null;
	private _errorType: ErrorType | null;
	private _passage: BiblePassage | null;

	public static error(message: string, errorType: ErrorType): BibleApiResponse {
		return new BibleApiResponse(true, message, errorType, null);
	}

	public static success(passage: BiblePassage): BibleApiResponse {
		return new BibleApiResponse(false, null, null, passage);
	}

	public isError() {
		return this.hasError;
	}

	public get errorMessage(): string {
		if (this.hasError && this._errorMessage) {
			return this._errorMessage;
		}
		throw new Error("BibleApiResponse is in an illegal state");
	}

	public get errorType(): ErrorType {
		if (this.hasError && this._errorType) {
			return this._errorType;
		}
		throw new Error("BibleApiResponse is in an illegal state");
	}

	public get passage(): BiblePassage {
		if (!this.hasError && this._passage) {
			return this._passage;
		}
		throw new Error("BibleApiResponse is in an illegal state");
	}

	private constructor(hasError: boolean, errorMessage: string | null, errorType: ErrorType | null, passage: BiblePassage | null) {
		this.hasError = hasError;
		this._errorMessage = errorMessage;
		this._errorType = errorType;
		this._passage = passage;
	}
}
