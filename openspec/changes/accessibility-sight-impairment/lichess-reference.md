# How lichess does it — read off the wire, 2026-09-26

Source: `https://lichess.org/page/blind-mode-tutorial` (their own guide, last updated June 2026),
the HTML lichess serves with and without blind mode enabled, **and the live rendered DOM of a real
game (`/5i7fG5XW`, Nikolay's account, blind mode on) — section 9, which corrects three claims the
first two sources led me to.** Summarised here in our own structure,
with short quotes only — **read the tutorial itself before implementing anything**, it is the best
document on this subject that exists and it is written partly by the blind users it serves.

Obtained without a browser: `curl` with a cookie jar, then `POST /run/toggle-blind-mode` with
`enable=1` and an `Origin: https://lichess.org` header (403 without it). Blind mode is a **server-side
session flag**, so every page then comes back in its blind-mode form. Cheap to re-do.

---

## 1. THE ARCHITECTURE — this answers task 3.3

**The JS is a separate module. The DOM is NOT a separate page** — see section 9.1, which corrects
what this section originally claimed. The bundle swap is real:

| | Normal | Blind mode |
|---|---|---|
| JS entry | `analyse.user.*.js` | **`analyse.nvui.*.js`** — a different bundle, not an addition |
| CSS | `analyse.free.css` | plus `bits.blind.css`, `round.nvui.css` |
| i18n | — | plus `i18n/nvui.*.js`, **`i18n/keyboardMove.*.js`** |

`nvui` = **non-visual user interface**. It is a parallel front end, separately bundled and
separately translated, loaded instead of the normal one — **but it renders into the ordinary page**,
as one `<div class="nvui">` inside `<main class="round">`, with the site header and nav untouched
(section 9.1). `keyboardMove` is its own module with its own
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

**The single most important structural finding, and CONFIRMED in the live DOM.** The blind-mode game
page is an ordinary semantic HTML document navigated by heading. Confirmed order and markup:

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


---

# 9. CONFIRMED FROM THE LIVE DOM — and what it corrects

Rendered DOM of a finished game, blind mode on, `Board layout: plain`, `Move notation: literate`.
**This is the ground truth.** Everything above came from their tutorial's prose; this is the markup.

## 9.1 CORRECTION — it is not a separate page, it is one div

```html
<main class="round">
  <aside class="round__side"></aside>     <!-- empty -->
  <div class="nvui"> ... everything ... </div>
  <div class="round__underboard"></div>
</main>
```

The site header, top nav, search, notifications and user menu are **all still there, unchanged**.
`<body>` merely gains a `blind-mode` class. The nvui content replaces the **board region**, not the
page.

**This is the most useful correction for us.** It means the choice is not "second front end or
nothing": lichess renders a non-visual block inside the normal page, and so could we. Task 3.3c
should be decided knowing that.

## 9.2 THE BOARD IS 64 BUTTONS. NO TABLE, NO ARIA, NO ROLES.

The entire accessible board, in `plain` layout:

```html
<div class="board"><div class="board-wrapper">
  <div>                                      <!-- one div per rank, 8 to 1 -->
    <span><button class="black rook light" text="A8 black rook"
                  rank="8" file="a" piece="r" color="black" trap-bypass="">A8 black rook</button></span>
    <span><button class="dark"  text="B8 +" rank="8" file="b" piece="+" color="none" ...>B8 +</button></span>
    <span><button class="light" text="E8 -" rank="8" file="e" piece="-" color="none" ...>E8 -</button></span>
```

- **A real `<button>` per square.** Focusable, in the tab order, `Space`/`Enter` activate it for
  free. No `role`, no `aria-label`, no `tabindex` juggling.
- **The accessible name is the button's own text content** — `"A8 black rook"`. Nothing clever.
- **Empty squares still say something: `+` for a dark square, `-` for a light one.** One character
  that tells a blind player the square's colour, which matters for bishops and for orientation.
- `rank` / `file` / `piece` / `color` are plain attributes their JS reads. `class="... active"`
  marks the cursor square. `promotion="true"` where relevant. `trap-bypass=""` opts out of their
  focus trap.
- **So `Board layout: plain` really is plain.** The `table` option is the alternative; this account
  is not using it, so we have not seen that markup.

**What this means for the "minimum change" estimate: a screen-reader-usable board is 64 buttons
whose text says what is on the square.** That is the entire mechanism. Everything else — arrow keys,
jump-to-piece, ray scanning — is key handling on top of markup this simple.

## 9.3 FOUR LIVE REGIONS, WITH DELIBERATELY DIFFERENT POLITENESS

Not one announcement channel. Four, and the differences are the design:

| Element | Politeness | Carries |
|---|---|---|
| `<p class="moves" role="log" aria-live="off">` | **off** | the move list — a log you *read*, never announced |
| `<div class="status" role="status" aria-live="assertive" aria-atomic="true">` | assertive | `1-0`, "Checkmate • White is victorious" |
| `<p class="lastMove" aria-live="assertive" aria-atomic="true">` | assertive | "queen takes b 5 checkmate" |
| `<div class="notify" aria-live="assertive" aria-atomic="true">` | assertive | errors — caught live: **"Invalid move: nd2"** |
| `<div class="boardstatus" aria-live="polite" aria-atomic="true">` | polite | board-level prompts, e.g. "Promote to: q for queen, n for knight…" |

**`aria-live="off"` on the move list is the instructive one.** The obvious design would announce
every move as it arrives; they deliberately do not, because the last-move region already does it in
one sentence and re-reading the whole list would be unusable. `role="log"` keeps it navigable.

`aria-atomic="true"` everywhere it matters: read the whole region, not the changed word.

## 9.4 THE POSITION IN PROSE — confirmed, and simpler than the tutorial's example

```html
<h2>Pieces</h2>
<div class="pieces">
  <div class="white-pieces"><h3>White</h3>
    <p>king: e1</p><p>queen: b5, g8</p><p>rook: a1, h1</p>
    <p>bishop: c4, d4</p><p>knight: d2, f3</p><p>pawn: a2, e4, f2, g2</p>
```

One `<p>` per piece type, squares comma-separated, grouped by colour under `h3`. The tutorial showed
this as *"King: eva 1"* because its author had `anna` notation selected; with `literate` it is plain
`e1`. **The markup is six paragraphs of text** — and it is the fastest way to know a position
without walking the board.

## 9.5 THE HELP IS IN THE PAGE

Two headings near the bottom, plain `<p>` with `<br>` separators:

- **h2 "Keyboard input commands"** — the command-field list
- **h2 "Command list when the board has focus"** — the board keys

So the keyboard interface is **self-documenting from inside the interface**, reachable with one
`H` press, not only from the tutorial page. This is most of our user's *"short help for active chess
variant"* need, and for a variant server it is worth more than it is to lichess.

## 9.6 Commands the tutorial did not list

Read off the in-page help, present on this round page because the game is over:

- `v` announce computer evaluation · `g` announce computer best move · **`shift+g` play the computer's
  best move** · `alt+shift+a`/`d` cycle variations

## 9.7 Settings markup: plain labels, no ARIA

```html
<label><span lang="en">Move notation</span>
  <select><option value="uci">uci: g1f3</option>
          <option value="san">san: Nxf3</option>
          <option value="literate" selected>literate: knight takes f 3</option>
          <option value="nato">nato: knight takes foxtrot 3</option>
          <option value="anna">anna: knight takes felix 3</option></select></label>
```

A wrapping `<label>` is the whole accessibility story. **And each option's text contains its own
example**, so the choice is audible rather than abstract — a nice touch worth copying.

## 9.8 One more thing they do site-wide

`<h2>Navigation</h2>` is emitted inside the site header's nav block. A heading for the nav, so a
screen reader user can jump to it and skip past it. Cheap, and it applies to every page on the site
rather than only the game.
