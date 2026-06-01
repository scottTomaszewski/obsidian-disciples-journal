# ESV API integration

Disciples Journal sources passage text from the [ESV API](https://api.esv.org/).
This doc covers how requests are made, how content is stored, and the caching model.
Primary code: `src/services/ESVApiService.ts` and `src/services/BibleContentService.ts`.

## Authentication

- The user supplies an **ESV API token** in plugin settings (Settings → Disciples
  Journal → ESV API). It is stored in `settings.esvApiToken`.
- Requests send `Authorization: Token <esvApiToken>`.
- With no token set, `onload` shows a notice, and any download attempt returns a
  `BibleApiResponse` error of type `ApiAuthentication`.

## When the API is called

Content resolution runs through `BibleContentService.getBibleContent(ref)`, which
only reaches the network as a last resort:

1. In-memory `passageCache` (keyed by `BibleReference`).
2. A local note on disk — its frontmatter is parsed back into a response via
   `ESVApiService.toBibleApiResponse`.
3. The ESV API — **only if** `settings.downloadOnDemand` is enabled. Otherwise it
   returns a `RequestsForbidden` error and logs.

## The request

`downloadFromESVApi(ref)` calls Obsidian's `requestUrl` (not `fetch`, per the
obsidian-plugin-development guidelines) against:

```
https://api.esv.org/v3/passage/html/?q=<ref>
  &include-passage-references=false
  &include-verse-numbers=true
  &include-first-verse-numbers=true
  &include-footnotes=true
  &include-headings=true
```

The HTML format is requested so the renderer can preserve ESV typesetting
(poetry, headings, footnotes, Words of Christ).

### Footnotes are always fetched, then hidden at render time

`include-footnotes=true` is hardcoded, so footnotes are **always** baked into the
stored HTML — hiding them is a *render-time* concern, not an API one (and changing
the toggle doesn't require re-downloading). Two independent settings control it:

- `hideFootnotes` — rendered full passages; applied as CSS by `BibleStyles`.
- `hideFootnotesInPreview` — hover preview; `BibleReferenceRenderer.showVersePreview`
  removes `.footnotes` / `.extra_text` / `.footnote` nodes from the cloned HTML.

Both default to `false`. To change footnote behavior, look here — not at the request.

### Single-chapter-book workaround

The ESV API returns only the first verse when you request a whole single-chapter
book (e.g. `Obadiah 1`). As a workaround, for chapter references to books with a
single chapter the request is widened to verses `1-999`. See `downloadFromESVApi`
and `BookNames.getChapterCount`.

## Storage: notes as cache

A successful download is persisted by `saveESVApiResponseAsMdNote`:

- **Location** — `<bibleContentVaultPath>/<preferredBibleVersion>/<Book>/` with
  filenames from `BibleFiles.pathForPassage` (`Book N.md` for chapters,
  `Book NvV[-E].md` for verse ranges). Missing folders are created.
- **Body** — a `bible` code block containing the canonical reference.
- **Frontmatter** — the raw API response is written field-by-field
  (`query`, `canonical`, `parsed`, `passage_meta`, `passages`) via
  `app.fileManager.processFrontMatter`, plus any user-configured custom frontmatter
  (`FrontmatterUtil`).

Because the frontmatter **is** the cache, reopening a chapter reads the note and
runs `toBibleApiResponse` on the stored JSON instead of re-hitting the API. The
`Update frontmatter on all Bible notes` command re-applies custom frontmatter
across existing notes.

## Errors

All failures funnel through `BibleApiResponse.error(message, ErrorType)`
(`ApiAuthentication`, `BadApiResponse`, `RequestsForbidden`, …). User-visible cases
surface an Obsidian `Notice`; internal ones are logged to the console.
