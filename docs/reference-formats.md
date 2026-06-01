# Bible reference formats

Supported reference syntax and how it is parsed. Primary code:
`src/core/BibleReference.ts` (`BibleReference.parse`) and
`src/services/BookNames.ts`.

## Supported formats

| Example | Meaning | Parsed fields |
| --- | --- | --- |
| `Genesis 1` | whole chapter | `chapter` |
| `Genesis 1-2` | chapter range | `chapter`, `endChapter` |
| `John 3:16` | single verse | `chapter`, `verse` |
| `Genesis 1:1-10` | verse range in one chapter | `chapter`, `verse`, `endVerse` |
| `Philippians 1:27-2:11` | cross-chapter range | `chapter`, `verse`, `endChapter`, `endVerse` |
| `1 Corinthians 13:4-7` | book name with a number/space | (as above) |
| `Song of Solomon 2:1` | multi-word book name | (as above) |

## How parsing works

`BibleReference.parse(str)`:

1. Extracts the book name with `BookNames.extractBookFromReference`, then
   normalizes it via `BookNames.normalize` (handles abbreviations and multi-word /
   numbered book names). An unknown book → `parse` returns `null`.
2. Normalizes en-dashes (`–`) to hyphens in the chapter/verse remainder.
3. Matches the remainder against patterns **in this order**: cross-chapter
   (`C:V-C:V`) → chapter range (`C-C`) → verse range (`C:V-V`) → single verse
   (`C:V`) → single chapter (`C`). The first match wins.

`parse` returns `null` (not throws) for anything it can't interpret. The
`BibleReference` **constructor**, however, throws if given an unnormalizable book
name — `parse` guards against this by normalizing first.

## The value object

`BibleReference` carries `{ book, chapter, verse?, endVerse?, endChapter? }` and
provides:

- `toString()` — canonical form (round-trips the formats above).
- `isChapterReference()` — true when no specific verse is set.
- `isRange()` — true when `endVerse` or `endChapter` is set.
- `clone()` — deep copy.

These fields also drive note filenames — see
[esv-api.md](esv-api.md) and `BibleFiles.pathForPassage`.
