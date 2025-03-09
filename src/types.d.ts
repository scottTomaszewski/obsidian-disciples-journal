declare module '*.json' {
    const value: any;
    export default value;
}

// Define the structure of the Bible data for better type checking
interface ESVVerse {
    pk: number;
    translation: string;
    book: number | string;
    chapter: number;
    verse: number;
    text: string;
    comment?: string;
}

declare const ESV: ESVVerse[]; 