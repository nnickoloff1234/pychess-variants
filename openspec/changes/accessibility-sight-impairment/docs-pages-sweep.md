# The docs and rules pages — sweep

Asked for 2026-09-27. **Findings only.** Method and limits: `focus-and-tabindex-sweep.md`.

These pages matter more than their traffic suggests, because **our user already uses them**:
*"i can use Pychess either for speaking here, or for example to read the rules of unknown chess
variant to play via my own created program."* They read our rules, then go elsewhere to play. And
*"short help for active chess variant"* is on their wanted list.

**Surface:** 323 built pages in `templates/docs/`, in 8 languages (en + es, fr, hu, it, pt, zh_CN,
zh_TW), compiled from 333 markdown sources in `static/docs/` by `md2html.sh` → `md2html.js`
(`showdown`, github flavour). **The markdown is the source of truth for content; the pipeline is the
leverage point for anything systematic.**

---

## D1. THE DOCS ARE THE MOST ACCESSIBLE PART OF THE SITE — and that is why our user uses them

**This is the headline, and it is a good one.** The docs are written **prose-first with illustrative
diagrams**, not diagram-first. Every movement diagram is followed by a paragraph that states the rule
in words. Verified across three variants:

- `capablanca.md:21-23` — diagram, then *"The archbishop (A) is a compound piece combining the moves
  of the **bishop** and **knight**."*
- `shogi.md:66-68` — diagram, then *"The dragon horse is a promoted bishop, which gains the king's
  moves on top of a bishop's."*
- `xiangqi.md:56-58` — diagram, then a full paragraph on the horse's move **including the blocking
  rule**, which explains the piece better than the diagram does.

**And every image is labelled: 1734 of 1734 have alt text**, across 475 distinct strings — real labels
like `Archbishop moves`, `Chancellor`, `Horses`, not boilerplate and not filenames-as-alt.

So a blind reader gets the actual rules of every variant we document. **That is not luck — it is how
these documents are written**, and it is the reason a blind user told us our rules pages are usable
while our game page is not. **Whatever else changes, do not let this regress.**

## D2. `<html lang>` BITES HARDEST HERE — the sharpest version of the earlier finding

`headings-and-landmarks-sweep.md` H2 found `templates/base.html:2` is a bare `<html>` with no `lang`.
The docs make it acute rather than theoretical:

- `server/views/variants.py:99-109` selects the docs file **by locale**:
  `item = "docs/" + (variant) + "%s.html" % locale`. Same at `server/views/faq.py:16` via
  `get_locale_ext(context)`.
- So **the server deliberately picks a Spanish, Chinese or Hungarian document — and then serves it
  inside a page that never declares what language it is in.**
- A screen reader chooses its speech synthesiser and pronunciation rules from `lang`. A Spanish rules
  page read by an English synthesiser is not degraded, it is unusable — and 7 of the 8 languages here
  are in that position.
- **WCAG 3.1.1 Language of Page — Level A.** The value is already emitted as `data-lang` on `<body>`
  (`base.html:71`), so `<html lang="{{ lang }}">` is one line.

**This is the most valuable single line in any sweep in this change**, and the docs are the reason.

## D3. Alt text labels the diagram rather than describing it — acceptable, but inconsistent

Given D1 the labelling choice is defensible: the diagram illustrates prose that already carries the
rule, so a short label is right and a long description would duplicate the paragraph below it.

Two things worth tidying rather than fixing:

- **Only one alt string in 1651 is longer than 35 characters**, and **873 of 1651 echo the image
  filename**. Fine as labels; worth knowing that none of them describes content.
- **The second image of each piece is inconsistently named.** Every piece section has two images —
  the piece's symbols, then its movement diagram. `xiangqi.md` labels the second *"Horse movement"*,
  *"Chariot movement"*; `shogi.md` labels it *"HorseDiagram"*, *"GoldDiagram"*. A screen reader reads
  `HorseDiagram` as one run-together word. **Making movement diagrams consistently
  `<Piece> movement` is cheap and purely a markdown edit.**

## D4. Board-setup diagrams have no prose equivalent

`![Boards]` opens `shogi.md:3`, `xiangqi.md:3`, `bughouse.md:3` — and is followed by an introduction
to the game, not by the starting array in words. So a blind reader learning shogi gets every piece's
move but never the initial position.

Arguably outside what a rules page owes. **Noted because our user's purpose is implementing variants**,
and the starting position is the one thing they would need that the prose does not give. A FEN in a
code block would satisfy it completely and is one line per variant.

## D5. The pipeline emits invalid `<th id="">` — 431 of them

`showdown` produces `<th id="">` on every table header cell: **431 across 115 tables** in the built
docs (16 markdown files use tables).

- An empty `id` attribute is invalid HTML.
- **It is however harmless to screen readers**: the tables are real `<table>`/`<thead>`/`<th>`, which
  gives implicit column-header semantics, so table navigation works. This is pipeline noise, not an
  accessibility defect.
- Fix belongs in `md2html.js` or a post-processing step in `md2html.sh` — **one place, all 323 pages.**

**Not yet checked, and worth one look:** whether any of the 16 table files has *both* row and column
headers. Those need `scope="col"` / `scope="row"`, which showdown will not add. Simple tables do not.

## D6. Heading defects in docs are markdown-source defects

Carried from `headings-and-landmarks-sweep.md` H4 and H5, restated here because the fix location is
what matters:

- **`docs/terminology.*` has 6 `<h1>` each, across 8 translations** — that is **one markdown source
  document in eight languages**, so one fix covers eight built files.
- `docs/battleofideologies.html`, `docs/dragon.html`, `docs/dragon.zh_CN.html` skip h1 → h3.
- Because docs are **fragments** included in a wrapper, their heading levels have to agree with the
  wrapper's. Worth settling what level a docs page's top heading should be **before** editing 323
  files' worth of sources.

---

## Summary

| | What | Where the fix goes | Size |
|---|---|---|---|
| **D1** | **Prose-first docs already serve blind readers** | — | **nothing; protect it** |
| **D2** | **`<html lang>` missing while the server picks by locale** | `base.html:2` | **one line, Level A** |
| D3 | Movement-diagram alts inconsistent (`HorseDiagram`) | markdown sources | per file, cheap |
| D4 | No starting position in text | markdown sources | one FEN per variant |
| D5 | `<th id="">` × 431, invalid but harmless | `md2html.js` | one place, 323 pages |
| D6 | 6 `h1` in terminology; 3 files skip h1→h3 | markdown sources | 1 source = 8 files |

**The order this suggests:** D2 first and alone — one line, Level A, and it is the difference between
seven of our eight documentation languages being pronounced correctly or not. Everything else here is
polish on a part of the site that already works.

**Nothing in this sweep touches the board, layout CSS or chessgroundx**, and D2 benefits every
non-English user of the whole site, not only the docs.
