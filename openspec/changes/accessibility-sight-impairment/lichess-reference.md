# How lichess does it — read off the wire, 2026-09-26

Source: `https://lichess.org/page/blind-mode-tutorial` (their own guide, last updated June 2026) plus
the HTML lichess serves with and without blind mode enabled. Summarised here in our own structure,
with short quotes only — **read the tutorial itself before implementing anything**, it is the best
document on this subject that exists and it is written partly by the blind users it serves.

Obtained without a browser: `curl` with a cookie jar, then `POST /run/toggle-blind-mode` with
`enable=1` and an `Origin: https://lichess.org` header (403 without it). Blind mode is a **server-side
session flag**, so every page then comes back in its blind-mode form. Cheap to re-do.

---

## 1. THE ARCHITECTURE — this answers task 3.3

**It is a separate module, not ARIA added to the visual page.** Confirmed by diffing the served HTML:

| | Normal | Blind mode |
|---|---|---|
| JS entry | `analyse.user.*.js` | **`analyse.nvui.*.js`** — a different bundle, not an addition |
| CSS | `analyse.free.css` | plus `bits.blind.css`, `round.nvui.css` |
| i18n | — | plus `i18n/nvui.*.js`, **`i18n/keyboardMove.*.js`** |

`nvui` = **non-visual user interface**. It is a parallel front end, separately bundled, separately
translated, loaded instead of the normal one. `keyboardMove` is its own module with its own
translation catalogue, which is the tell that it is a real feature rather than a mode's appendage.

**Why this matters to us more than it looks.** The design named "accessibility work colliding with
the layout changes in flight" as a risk. A parallel module removes that risk entirely: the
non-visual page does not share a stylesheet, a grid or a board with the visual one. **It also means
chessgroundx never has to be touched** — see §3.

## 2. THE ENTRY POINT — the cheapest thing on this page to copy

The **first element inside `<body>`, before `<header>`**, on every single page:

```html
<form id="blind-mode" action="/run/toggle-blind-mode" method="POST">
  <input type="hidden" name="enable" value="1">
  <input type="hidden" name="redirect" value="/">
  <button id="nvui-button" type="submit">Accessibility - Enable blind mode</button>
</form>
```

Visually hidden, so no sighted user sees it; **first in the accessibility tree, so it is the first
thing a screen reader user hears on arrival at the site.** No settings page to find, no account
needed. When enabled it becomes "Disable blind mode" plus a link to the tutorial.

This is a handful of lines and a session flag. It is the highest impact-per-byte item on this page.

## 3. THE NON-VISUAL PAGE IS A DOCUMENT, NOT A BOARD

**The single most important structural finding.** The blind-mode game page is an ordinary semantic
HTML document navigated by heading, in this order:

- **h1** — game title, carrying colour, rated/casual, time control and opponent in one line:
  *"You play the white pieces Casual correspondence Game vs Stockfish level 1"*
- **h2 Game info** — both players and ratings
- **h2 Move list** — read with arrow keys in browse mode
- **h2 Pieces** — **the position in prose**, by side (h3 White, h3 Black): *"King: eva 1, Queen:
  david 1, Rooks: anna 1, hector 1"*. The quick overview that avoids walking 64 squares.
- **h2 Game status** — "Playing right now", later "white wins by checkmate"
- **h2 Last move** — plain text, "Game start" until there is one
- **h2 Input form** — the command field (§4)
- **h2 Clocks** — live, omitted entirely in unlimited games
- **h2 Actions** — real `<button>`s: Abort, Offer draw, Resign, Takeback
- **h2 Board** — the 8x8 grid (§5)
- **h2 Advanced settings** — announcement preferences (§6)

**Consequences for us, and they are large:**

- Everything above the Board heading is **plain semantic HTML** — headings, text, real buttons. No
  board technology involved. A blind player can read the whole game state without the board at all.
- A screen reader user reaches any of it with one keypress (`H`, or `1`-`6` for heading levels).
- **This is the "minimum change" path.** Our user asked for *"a table or another element, when the
  blind user can operate all the board"*; lichess's answer is a document with a table in it, and
  most of the value is in the document, not the table.

## 4. THE COMMAND INPUT FIELD — the floor our user says we lack

One text field, reached with `E` in browse mode, announced as *"Your move, edit"*. Typed in focus
mode. It takes **moves in algebraic notation** (`e4`, `Nf3`, `O-O`, `exd5`, `Qh5+`, `a8=R`) and
**single-letter commands**:

| Command | Does |
|---|---|
| `c` / `clock` | both clocks, own time first |
| `l` / `last` | last move |
| `P <piece>` | locate all of a piece type — **uppercase = white, lowercase = black**; `P A`/`p a` for a whole side |
| `s <rank\|file>` | read everything on a rank or file — `s 1`, `s a` |
| `o` | opponent's name and rating |
| `b [square]` / `board [square]` | move focus to the board, optionally at a square; defaults to e4 |
| `abort`, `resign`, `draw`, `takeback` | game actions |

**Note what this is: one `<input>` and a command parser.** No board, no ARIA grid, no focus
management beyond the field itself. It is the smallest possible thing that makes a game playable,
and it is exactly what our user singled out as missing: *"there isn't even editor to enter the
move."*

**And it is feasible for every pychess variant**, which is the part that makes this our best first
move rather than merely lichess's: parsing and validating SAN per variant is what Fairy-Stockfish
already does, server-side through `pyffish` and client-side through `ffish-es6`. **Our user built
their own program on Fairy-Stockfish for the same reason.** We are not writing a chess parser.

## 5. THE BOARD ITSELF — and its two layouts

Focus a square, arrow keys to move, **Space to select, Space again on the destination to move**. A
new Space elsewhere silently replaces the selection; no explicit cancel.

Keys while the board has focus:

- `i` back to the input field · `o` announce current square+piece · `c` last capture · `l` last move
  · `t` both clocks · `f` **flip the board** — our user asked for exactly this, *"a mirrored
  reflection of the board, cast from the side of the black pieces"*
- `m` legal moves for the selected piece · `Shift+m` its captures only
- `k q r b n p` jump to the next piece of that type, repeat to cycle, uppercase reverses
- `1`-`8` jump to a rank · `Shift+1`-`8` jump to a file · `Shift+A`/`Shift+D` step through history
- `x` read the four diagonal rays from this square, clockwise, one per press; `Alt+x` the rank and
  file rays; `Shift` reverses. **Full 360° awareness from any square** — this is the feature our
  user described as *"which piece attack this cell"*, generalised.

**Two board layouts, offered as a user setting, and the reason why is the browse/focus problem our
user explained:**

- **Plain** — no table semantics. Works in **focus mode**; faster under arrow keys.
- **Table** — a real `<table>` with rank and row headers. Works in **browse mode** with the screen
  reader's own table navigation (NVDA `Ctrl+Alt+arrows`).

So lichess did not solve browse-vs-focus mode; **it shipped both and let the user choose.** That is
worth knowing before we design one.

## 6. ANNOUNCEMENT IS CONFIGURABLE, AND THE OPTIONS ARE NOT COSMETIC

The design's open question "how should notation be spoken?" is answered: **lichess does not pick.**

- **Move notation** — `Anna` (phonetic: anna, bella, caesar… *"knight takes felix 3"*), `NATO`
  (alpha, bravo, charlie), `Literate` (*"knight takes f6"*), `SAN` (`Nxf3`), `UCI` (`g1f3`).
  The phonetic alphabets exist because letters alone are misheard; **Anna is a tactile-board
  convention, not an invention of lichess's.**
- **Piece style** — letter / uppercase-for-white letter / name / uppercase-for-white name
- **Piece prefix** — `w`/`b`, "white"/"black", or nothing
- **Show position** — square first, piece first, or square omitted
- **Page layout** — actions above or below the board

**The lesson for a minimum-change first step: `SAN` and `Literate` are both trivial, and picking one
default is fine.** The five-way choice is polish. But the existence of the choice says the right
default is not obvious, so do not agonise — ship one, make it changeable later.

## 7. THINGS WORTH KNOWING THAT WE DID NOT ASK

- **Blind mode now draws a visible board too**, deliberately: it helps sighted testers, and it helps
  partially sighted users combining visual and audio. So "non-visual mode" need not mean "no
  visuals" — which softens the objection that a separate module is untested by sighted developers.
- **Touchscreen support exists** and is recent: explore by dragging a finger, double-tap to select,
  double-tap the destination to move. **Our user named Android (TalkBack, Jieshuo) as a target**, so
  this is directly relevant and it is the newest, least-settled part of lichess's work.
- **The tutorial itself is a deliverable.** Ours does not have to be 770 lines, but a page
  documenting the keys is part of the feature, not documentation of it — a keyboard interface nobody
  can discover is not usable. Lichess links to theirs from the toggle button.
- Their coverage extends to puzzles, studies, broadcasts, tournaments, teams, chat and a PGN viewer.
  **That is the scope we are explicitly not matching**, and seeing it listed is the best argument for
  not trying.

## 8. What to take, in the order the cost suggests

Not the shortlist — that is task 3.4, and it is Nikolay's call. But the reading above sorts itself:

1. **The hidden toggle button, first in `<body>`.** A handful of lines. Does nothing by itself, and
   nothing else is reachable without it.
2. **The semantic document** — headings, the position in prose, last move, status, clocks, real
   action buttons. Plain HTML, no board technology, and it delivers most of §3's value.
3. **The command input field** with moves plus `c`, `l`, `P`, `s`. One input and a parser; SAN comes
   free from Fairy-Stockfish. **This is the item our user names as the missing floor.**
4. **A live region** so the opponent's move is announced without asking.
5. **The board grid** — arrow navigation, Space to select, and only then the query keys. The largest
   piece, and the one that can wait, because 1-4 already make a game playable.

Pockets, which our user specified and lichess's tutorial does not cover for crazyhouse-like variants
in the text we read, would attach at step 5 — and their model (white's off the a-file edge, black's
off the last file, vertical arrows through roles) is more specific than anything here.
