export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface BiblePassage {
    reference: string;
    verses: BibleVerse[];
    htmlContent?: string;
}

export interface BibleReferenceRange {
    book: string;
    startChapter: number;
    startVerse: number;
    endChapter?: number;
    endVerse?: number;
}

export type BibleReferenceType = 'verse' | 'passage' | 'chapter'; 

// ESV API HTML format interfaces
export interface ESVApiResponse {
    query: string;
    canonical: string;
    parsed: number[][];
    passage_meta: ESVPassageMeta[];
    passages: string[];
}

export interface ESVPassageMeta {
    canonical: string;
    chapter_start: number[];
    chapter_end: number[];
    prev_verse: number | null;
    next_verse: number | null;
    prev_chapter: number | null;
    next_chapter: number[] | null;
} 