export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface BiblePassage {
    reference: string;
    verses: BibleVerse[];
}

export interface BibleReferenceRange {
    book: string;
    startChapter: number;
    startVerse: number;
    endChapter?: number;
    endVerse?: number;
}

export type BibleReferenceType = 'verse' | 'passage' | 'chapter'; 