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

> **CORRECTED 2026-09-27 — this only works while LOGGED IN, and the paragraph above does not say so.**
> Tested from a clean anonymous jar: the POST returns `303` and really does set a blind-mode cookie
> (randomised name, e.g. `mBzamRgfXgRBSnXB=1`, HttpOnly, one year) alongside `lila2` — and the next
> page still comes back in **normal** mode: `<body class="coords-in simple-board">`, the button still
> reads "Enable blind mode", and the six nav `h3`s (§14) are absent. **The flag is stored against the
> account, not the anonymous session.** Anything automated that needs blind mode therefore needs an
> authenticated session; anonymous capture reaches normal mode only.

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


---

# 10. SECOND PASS — 2026-09-27, live browser, BOTH modes

Everything above §9 came from the tutorial's prose, the served HTML and **one** rendered DOM of a
*finished* game. This pass was done in a real logged-in Chrome session driven through the browser
tools: every page below was either navigated to or `fetch`ed from inside the page and parsed, and
**two crazyhouse games were played move by move** — one in each mode — entirely by typing.

**It corrects §9.3 and §9.8, and it overturns one assumption the change was resting on.**

## 10.1 Method, and its one calibration lesson

DOM auditing from inside the page (`document.querySelectorAll` + a name-resolution helper), plus a
real HTML diff for §14. Two false positives this method produced, both worth remembering because
**our own twelve sweeps have the same two failure modes**:

- `h2#assets-missing` ("Your network blocks the Lichess assets!") is `display:none` on every page,
  so a DOM auditor reports "every lichess page opens with a stray h2" and **no screen reader ever
  sees it**. Always filter by `offsetParent` / computed display.
- `#challenge-toggle` / `#notify-toggle` look unnamed but take their name from a **descendant's**
  `aria-label`. A naive name check misses it; the real AX name computation does not. Same ~1-in-3
  false-positive rate `alt-and-labels-sweep.md` L5 predicted for our own 44 flagged labels.

## 10.2 The conclusion, in one sentence

**lichess's accessibility divides in two: the site chrome is accessible through plain semantic HTML
with essentially zero ARIA, and the board pages are not accessible at all in normal mode — every
affordance a screen reader user needs there exists only inside `nvui`.**

---

# 11. NON-BLIND — the site chrome, and it is good

## 11.1 The budget: four `aria-label`s per page

Every non-board page carries **exactly `aria-label:4` and `role:8`**. That is the entire ARIA budget
of lichess.org. The lobby has **171 tabbable elements and 5 unnamed ones**, two of which are the
false positives above.

The four labels are always the same: `INPUT[aria-label="Navigation"]` (the CSS hamburger checkbox —
no `aria-expanded`), `INPUT[aria-label="Search"]`, and two `SPAN[role=status]` carrying
`aria-label="Challenges: 0"` / `"Notifications: 1"`, so the header counts announce themselves.

Other lobby facts:

- **No `h1` on the lobby at all**, and **no skip link anywhere on the site** (zero `a[href^="#"]`).
  Their answer to "skip the nav" is landmarks plus the blind-mode button being first — *not* a skip
  link. Do not assume the skip link is the industry norm; the best-known chess site omits it.
- `<nav id="topnav" class="hover">` with one `<section>` per menu: a title link plus a
  `role="group"` of sublinks. CSS hover menus, no `aria-expanded`, no `aria-haspopup`.

  **CORRECTED 2026-09-27 — an earlier draft of this bullet claimed the sublinks are "permanently in
  the DOM and always tabbable, so presence beats ARIA". That is WRONG and the opposite is true.**
  The `role="group"` is `visibility: hidden` until hover, and `visibility: hidden` removes elements
  from the tab order *and* from the accessibility tree. Measured by calling `.focus()` on every one
  and checking `document.activeElement`:

  | | normal mode | blind mode |
  |---|---|---|
  | `#topnav a` present | 37 | 31 |
  | **focusable** | **6** | **31** |

  **In normal mode a keyboard or screen-reader user can reach exactly six destinations from the top
  nav** — Play, Puzzles, Learn, Watch, Community, Tools. Study, Teams, Forum, Blog, Donate, Analysis
  board, Board editor, Import game, Advanced search and 22 others are **unreachable without a mouse
  hover**. There is no `:focus-within` fallback (`section:focus-within` matches, and the group stays
  hidden). This is one of the worst defects on the site and it is invisible to any audit that only
  counts elements in the DOM — including the one that produced the wrong bullet.
- `img.uflair` (user flair) and ublog card images have **no `alt` attribute at all** — 9 and 12 per
  page respectively.

## 11.2 The lobby tabs — even lichess ships incomplete tab ARIA

```html
<div class="tabs-horiz" role="tablist">
  <button class="active" role="tab">Quick pairing</button>
  <button role="tab">Lobby</button>
  <button role="tab">Correspondence</button>
</div>
```

**No `aria-selected`, no `aria-controls`, no `tabpanel`.** The active tab is `class="active"` only.
The same defect recurs on the analysis underboard tabs and in the setup dialog. **Direct caution for
our two-board tabs.**

## 11.3 The seek table — our exact analogue, done wrong

```html
<table class="hooks__list">
  <thead><tr><th></th><th class="sortable sort"><icon data-icon></icon>Rating</th>
             <th class="sortable">Time</th><th>Mode</th></tr></thead>
  <tbody><tr class="hook join" role="button" title="Join the game | Bullet" data-id="np7nXce4">
    <td><span class="ulink ulpt" data-href="/@/Snickers_01">Snickers_01</span></td>
    <td>2268</td><td>½+0</td><td><span data-icon>Rated</span></td></tr>
```

- `<tr role="button">` **with no `tabindex`** — the row loses its table semantics *and* is
  unreachable by keyboard. **Joining a game from the lobby list is keyboard-inaccessible on lichess.**
- the player cell is a `<span data-href>`, not an `<a>` — not a link, not focusable
- the first `<th>` is empty; `th.sortable` has no `aria-sort` and no button, so **sorting is
  keyboard-unreachable**

By contrast the quick-pairing pools are done right: `<div class="lpool" role="button" tabindex="0">`
with the name "1+0 Bullet". Same site, same page, opposite quality.

## 11.4 `/account/preferences/display` — the best pattern on the site, and directly copyable

34 `<section>`s, one per preference:

```html
<section>
  <a href="#pieceAnimation"><h2 id="pieceAnimation">Piece animation</h2></a>
  <group class="radio">
    <div><input id="irdisplay_animation_0" type="radio" name="display.animation" value="0">
         <label for="irdisplay_animation_0">None</label></div>
    … Fast / Normal / Slow
  </group>
</section>
```

**One `h2` per setting**, self-linked, so a screen reader user walks 34 settings with the `H` key.
Real radio + `<label for>` pairs throughout. **No `<select>` and no slider anywhere on the page.**

What they omit, and we should not: `<group>` is an invented element with **no `role="radiogroup"`
and no `aria-labelledby` to the `h2`**, and there is no `<fieldset>`/`<legend>`. The radios are
individually named but not programmatically grouped — orientation comes from the heading alone.

pychess's Snabbdom `#settings` panel can take this shape almost verbatim and should add the
grouping lichess skips.

## 11.5 Heading outlines of the static pages (non-blind)

Level sequences, ignoring the hidden `assets-missing` h2 that opens every one:

| page | levels | note |
|---|---|---|
| `/forum` | 1-2-2-2-2 · 1-2×9 | two `h1`s (Lichess Forum, Your Team Boards) |
| `/forum/general-chess-discussion` | 1 | topic list is a `table`, `th=4`, no caption, no scope |
| `/tournament` | 2-2-1 | **`h1` comes last, after two `h2`s** |
| `/@/blunderman1` | 3×19 · 1 · 2×7 | **19 rating-card `h3`s before the `h1` username** |
| `/variant/crazyhouse` | 1-2-2-2-3-3-2 | clean |
| `/account/preferences/display` | 1-2×34 | clean, and see §11.4 |
| `/training`, `/inbox` | one `h2`, no `h1` | JS-built; server HTML is a shell |

---

# 12. NON-BLIND — the board pages, and they are not accessible

Checked on `/analysis`, a finished game, a live game, `/training` and `/inbox`.

## 12.1 Zero headings, and nothing announced

**Every one of these pages has zero visible headings and no `h1`.** The game's own name
("blunderman1 vs Stockfish level 1") exists only in `<title>`.

On a **live** game the only `aria-live` on the page is `div.chat__members`, set to **`off`**. There
is **no live region for the clock, the turn, the opponent's move, check, or the result**. On a
finished game the only live region is the chat.

**The result is silent.** "White resigned • Black is victorious" sits in four elements —
`section.status`, `div.result-wrap`, `p.result`, `p.status` — **none with `aria-live` or
`role=status`**. Compare §9.3's blind-mode `role=status aria-live=assertive`.

## 12.2 Move list, board and pockets contribute nothing

- **Analysis / finished game:** `<div class="tview2">` (no role) containing `<index>1</index>` and
  `<move p="…"><san>e4</san></move>`. **No `tabindex`, no role, no `<a>`.** The site that invented
  `<move>` exposes it as generic text — readable in browse mode, not a list, not focusable, and the
  current move is `class="active"` only, with **no `aria-current`**. *This answers our open question
  about `<move>` from the source itself.*
- **Live game:** the move list is **randomised** — `<i5d><app><qzm>1</qzm><z7yx class="">e4</z7yx>
  <z7yx class="a1t">e5</z7yx></app></i5d>`. Generic *and* unstable.
- **Board:** `cg-container > cg-board > piece ×33`, plus `coords ×2` / `coord ×16`. No roles, no
  labels, no text on pieces. **chessground contributes nothing to the AX tree but 16 `<coord>` text
  nodes** — exactly our prediction for chessgroundx, confirmed on their implementation.
- **Pockets (crazyhouse):**

```html
<div class="pocket is2d pocket-top">
  <div class="pocket-c1"><div class="pocket-c2">
    <piece class="pawn black" data-role="pawn" data-color="black" data-nb="2"></piece>
```

  Empty custom elements. **The count lives in `data-nb`, never as text.** No role, no tabindex, no
  label, in any view. **In normal mode lichess's pocket is entirely absent from the accessibility
  tree and entirely unreachable by keyboard.**

## 12.3 The toolbar is anonymous

**All nine analysis toolbar buttons are icon-only `<button data-icon>` with no text and no
`aria-label`.** The four move-nav buttons (`.fbt.move`: first/prev/next/last) have **no `title`
either**, so they are simply unnamed. The rest lean on `title` alone: "Show threat", "Engine
settings", "Opening explorer", "Practice with computer", "Menu". One `role="button"` sits on a bare
`<span>` with no name at all.

On a live game the same applies: `.rcontrols` has **empty `innerText`** — `button.fbt.takeback-yes
title="Propose a takeback"`, `.draw-yes title="Offer draw"`, `.resign title="Resign"`. Blind mode
gives these as real `<button>`s with text (§15.1).

The variant picker exists in **three mutually inconsistent forms**: checkbox + focusable `<tr>`s in
the lobby dialog (§13 below), `role="menu"` on a `<label>` with `role=menuitem` anchors on the
analysis board, and a real `<select>` in blind mode (§15.5). None of the first two has
`aria-expanded`.

## 12.4 The `?` overlay — and the nuance it exposes

`?` (a **real** keypress; synthetic `KeyboardEvent`s are rejected) opens a `<dialog>` with
`<h2>Keyboard shortcuts</h2>` and a real `<table>`, 2 `th`, 24 rows: arrows / `0` / `$` / home /
end, `k`/`j`, shift-variation cycling, `f` flip board, `l` local analysis, `space` play best move,
`x` show threat, `z`, `a`, `v`, `c` focus chat, `e` explorer, `b` board.

The dialog has **no `aria-modal`, no `aria-labelledby`, and `:modal` is false** (`show()`, not
`showModal()`). The setup dialog has the opposite defect: `aria-modal="true"` while `:modal` is
false — **it claims a focus trap it does not have**.

**The nuance that matters to us: the normal analysis board IS fully keyboard-operable and
self-documents its keys. It is simply never announced. Keyboard operability ≠ screen-reader
accessibility, and lichess has the first without the second.**

## 12.5 Puzzles and inbox

- `/training`: zero headings, **no live region** — so the feedback ("Find the best move for black",
  then success/failure) is **never announced**, and whose turn it is is conveyed by an empty
  `<piece class="king black">`, an image with no text.
- `/inbox`: zero headings, and the conversation list is bare `div.msg-app__side__contact` — **not
  links, no roles, no tabindex. The whole thread list is keyboard-unreachable.**

---

# 13. NON-BLIND — three affordances we did not know existed

## 13.1 The keyboard move input — normal mode, and it is the editor our user says is missing

```html
<div class="keyboard-move">
  <input spellcheck="false" autocomplete="off" class="ready">
  <strong>Press <kbd>m</kbd> to focus</strong>
</div>
```

Typing `?` into it opens its own `<dialog><h2>Keyboard input commands</h2>`:

| | |
|---|---|
| moves | `e2e4` · `5254` (ICCF) · `Nc3` · `O-O` · `O-O-O` · `c8=Q` · **`R@b4` "Drop a rook at b4 (Crazyhouse variant only)"** |
| commands | `/` focus chat · **`clock` read out clocks** · **`who` read out opponent's name** · `draw` · `resign` · `zerk` · `next`/`upv`/`downv` · `help`, `?` |

"Including an `x` to indicate a capture is optional."

**So typed moves *and* documented drop notation already exist outside blind mode.** Verified by
playing: `P@e6` was accepted and rendered `@e6`.

Its defects, all cheap to avoid:

- **no `id`, `name`, `aria-label`, `placeholder`, `title` or `<label>` — zero accessible name.**
  A screen reader announces "edit, blank".
- the help text that appears on focus (`<em>Enter SAN (Nc3), ICCF (2133) or UCI (b1c3) moves…</em>`)
  is **not linked by `aria-describedby`**.
- an invalid move sets **`class="wrong"` and nothing else** — no `aria-invalid`, no `role="alert"`,
  no live region. Blind mode announces "Invalid move: nd2".
- **it auto-submits the moment the text is unambiguous** — `P@e6` executed before Enter. Fast, but
  no review-before-commit, which matters more without sight.

## 13.2 They speak through the Web Speech API, not through ARIA

Monkey-patching `speechSynthesis.speak` and typing `clock` in normal mode:

```
speechSynthesis.speak("White - 28 minutes 14 seconds. Black - 30 minutes 51 seconds")
```

…and **no live region changed at all**. Moves are not spoken by default; only the explicit `clock` /
`who` commands speak.

**This is a delivery channel we had not costed: announcing clocks and moves with `SpeechSynthesis`
needs no ARIA and no mode.** It must be a preference — with NVDA running it double-speaks.

The same query is answered through a *different channel* in each mode: **normal → `speechSynthesis`,
blind → the `div.notify` live region** (§15.2). Same feature, two mechanisms.

## 13.3 The board menu

`<div class="board-menu">` — **not a dialog, no `role="menu"`, no `aria-modal`, no heading, no
label** — containing properly labelled checkboxes: Zen mode, **Blindfold**, Vibration feedback,
Streamer mode, **Input moves with your voice**, **Input moves with the keyboard**, plus a FLIP BOARD
button.

**Voice move input (speech *recognition*) exists in normal mode.** Our user named Android with
TalkBack and Jieshuo; voice input is a separate axis we had not considered at all.

## 13.4 The one thing the live page does right

**`<title>` carries the game state** — "Your turn – …", "Waiting for opponent – …", "Game Over – …".
In normal mode it is the *only* turn signal that exists, and it is nearly free to copy.

---

# 14. BLIND MODE OUTSIDE THE BOARD — measured by diff, and it is smaller than expected

**Method.** Fetched four pages with blind mode on, stored the normalised HTML, toggled blind mode
off, re-fetched the same URLs and diffed token multisets. **Identical result on all four pages
(`/forum`, `/variant/crazyhouse`, `/account/preferences/display`, `/tournament`): 22 tokens
only-in-blind, 17 only-in-normal.** That is the complete difference:

1. **The six top-nav section titles become headings — but that is a side effect, not the change.**

   ```html
   NORMAL:  <section><a href="/training">Puzzles</a><div role="group" style="visibility:hidden">…
   BLIND:   <section><h3>Puzzles</h3>        <div role="group" style="visibility:visible">…
   ```

   **The actual change is that the hover menu is REVEALED** (`visibility: hidden` → `visible`),
   taking the nav from **6 focusable links to 31** (§11.1). Once the group is visible its first
   entry carries the title's own destination — `Puzzles` → `/training`, `Learn` → `/learn`,
   `Watch` → `/broadcast`, `Community` → `/player`, `Tools` → `/analysis` — so the title link became
   an adjacent duplicate with identical text, and they replaced it with the heading that labels the
   revealed group. The sixth, the Play title pointing at `/`, is covered by the separate focusable
   `lichess.org` logo link in the header. **Verified: nothing becomes unreachable.**

   So this is a coherent design, not a shortcut — but the removal is still not necessary.
   `<h3><a href="/training">Puzzles</a></h3>` would keep both, and is what we should do (§16.6).
2. **one genuinely new heading: `<h2>Navigation</h2>`** (6 converted + 1 new = the +7 seen by counting)
3. `<body class>` gains `blind-mode`
4. **`<html>` loses `class="dark"`** — blind mode forces the light theme
5. the nvui CSS/JS bundle preloads appear in `<meta>` / `<link>`
6. the toggle button text flips to "Disable blind mode", a separator button appears, and **a new
   `<a>Blind mode tutorial</a>` appears beside it**
7. the header search `<input>`: `autocomplete` flips `false` → **`true`**

**ARIA: zero differences.** The only element carrying any `aria-*` in the diff is that search input,
and it has `aria-label="Search"` in **both** modes. No `role`, no `aria-live`, no `aria-expanded`,
no `aria-current` is added anywhere outside the board module.

> **Scope of this claim:** server-rendered HTML, non-board pages. `/training` and `/inbox` are
> JS-built and *do* receive a full nvui module — `main.puzzle.puzzle--nvui` has its own five live
> regions. And the board pages are the opposite of "no ARIA added".

**This is the strongest available support for the no-mode position on everything that is not a
board — and it now names the cost.**

## 14.1 CORRECTION to §9.8

§9.8 said `<h2>Navigation</h2>` "applies to every page on the site". True, **but only with blind
mode enabled** — it is absent in normal mode, and six of the seven headings around it are
conversions of existing links, not additions.

---

# 15. BLIND MODE ON THE BOARD — including a LIVE crazyhouse game, never captured before

Two games played: `/GlSGD7ny` (normal mode) and `/abkPTnsJ` (blind mode), both Crazyhouse 30+20 vs
Stockfish level 1, every move typed.

## 15.1 The live round page

`<h1>` — **"You play the white pieces Casual 30 + 20 Crazyhouse Game vs Stockfish level 1"** —
followed by:

> h2 Game info · Move list · Pieces (h3 White, h3 Black) · **Pockets (h3 White, h3 Black)** ·
> Game status · Last move · **Your clock** · **Opponent clock** · Command input form · **Actions** ·
> Board · Advanced settings (h3 Board settings) · Keyboard input commands ·
> Command list when the board has focus

The nvui **analysis** page differs: a single "Clock", no "Actions", plus Computer analysis, PGN and
FEN, and Chat.

- **Clocks:** `<div class="time" role="timer">30 minutes</div>`, under *separate* headings for your
  clock and the opponent's. `role="timer"` carries an implicit `aria-live="off"`, so the ticking
  never spams — the value is read on demand. Prose minutes and seconds, not `30:00`.
- **Actions: real `<button>`s with text** — "Abort game", "Offer draw", "Resign"; afterwards
  "Rematch" / "Analysis board". Normal mode gave these as icon + `title` only.
- **Game info:** `<p>White:<a>blunderman1</a> 2116</p><p>Black:Stockfish level 1</p>
  <p>Casual Crazyhouse</p><p>Clock30 + 20</p>`
- **Command input — the entire difference from normal mode is one wrapping `<label>`:**

```html
<form id="move-form">
  <label>Command input form<input class="move mousetrap" name="move" type="text" autocomplete="off"></label>
</form>
```

## 15.2 What it actually announces — observed live

| event | normal mode | blind mode |
|---|---|---|
| opponent moves | `<title>` only | `p.lastMove` assertive → "e 5" |
| capture | — | `p.lastMove` → "knight takes e 5" |
| **drop** | — | move log → **"4. pawn is dropped on e 6"** |
| invalid move | `class="wrong"` | `div.notify` → **"Invalid move: Qh9"** |
| result | silent | `div.status` → "0-1 White resigned • Black is victorious" |
| `pocket white` | — | `div.notify` → "pawn: 1" |
| `clock` | **`speechSynthesis.speak(…)`** | **`div.notify`** → "29 minutes 36 seconds - 30 minutes 52 seconds" |

Round-page command list, from the page itself: `board`/`b` · **`clock`/`c`** · `last`/`l` · `abort` ·
`resign` · `draw` · `takeback` · `p` (piece locations) · `s` (rank or file) · `opponent`/`o` ·
**`pocket <colour>`**. Plus: "To promote to anything else than a queen, use equals. For example
a-8-equals-n".

### CORRECTION to §9.3

`p.lastMove` is **`aria-live="assertive"` on a round page but `aria-live="polite"` on the analysis
page**, and `div.status` is **polite** on the puzzle page. The politeness is per-page, not global.
The analysis page also carries a **sixth** region, `p.position`.

## 15.3 Pockets — the answer to Q2

```html
<h2>Pockets</h2>
<div class="pieces">
  <div class="white-pieces"><h3>White</h3><p>bishop: 1</p></div>
  <div class="black-pieces"><h3>Black</h3><p>pawn: 2</p></div>
</div>
```

Exactly the **Pieces** block's shape with a count instead of squares — `<p>bishop: c1, f1</p>`
becomes `<p>bishop: 1</p>`. Plus the `pocket <colour>` command, drops typed as `R@b4`, and the
spoken phrasing "pawn is dropped on e 6".

**There are zero pocket buttons** (`.nvui .pocket button` = 0) and **no board-focus key for
pockets**: the pocket is **read-only prose**, and drops happen only by typing.

So lichess's entire non-visual crazyhouse story is: *a prose block, one command, a drop notation and
a spoken phrasing.* Small, complete, and portable to every pychess pocket variant. **Our user's own
model — vertical arrows through the pocket roles — is more ambitious than anything lichess has.**

Two blemishes: **the pocket gaining a piece is never announced** (you must ask, or infer it from
"knight takes e 5"), and the round page emits the entry as a bare text node (`<h3>White</h3>pawn: 1`)
where the analysis page wraps it in `<p>`.

## 15.4 The `table` board layout — captured for the first time

```html
<table class="board-wrapper">
  <tr><td></td><th scope="col">a</th>…<th scope="col">h</th><td></td></tr>
  <tr><th scope="row">8</th><td><button … >A8 black rook</button></td>…<th scope="row">8</th></tr>
  …
  <tr><td></td><th scope="col">a</th>…<th scope="col">h</th><td></td></tr>
</table>
```

10 rows × 10 cells. **File headers on both top and bottom, rank headers on both left and right** —
32 `<th>` in all, so a header is always near whichever way you traverse. Corners are empty `<td>`.
**No caption, no role, no ARIA** — plain table semantics plus `scope`.

**The 64 buttons are identical in both layouts.** `plain` and `table` differ *only* in the wrapper,
so offering both is nearly free: one conditional around the same button markup.

## 15.5 The setup dialog is rewritten — the most copyable thing on the site

| | normal mode | blind mode |
|---|---|---|
| variant | checkbox + `<table>` of focusable `<tr>`s | **`<select id="sf_variant">`** |
| time mode | `role="tab"` buttons | **`<select id="sf_timeMode">`** |
| minutes | **unlabelled `<input type=range>`** | **`<select id="sf_time">`** — 0, ¼, ½, ¾, 1, 1.5, 2, 3 … 180 |
| increment | **unlabelled `<input type=range>`** | **`<select id="sf_increment">`** |
| level, side | radios | `<select id="sf_level">`, `<select id="sf_color">` |

Each with a real association: `<label for="sf_time">Minutes per side</label><select id="sf_time">`.

**The sliders become discrete `<select>`s.** That is precisely the fix for pychess's seek dialog —
and for us it need not be mode-gated, it can simply be the control. Normal mode also offers preset
buttons (`1+0` … `30+20`) beside the sliders: **give a slider a labelled button twin** is a cheap
idea worth taking on its own.

## 15.6 Two nvui bugs to avoid reproducing

- **Deep-linking renders the wrong position.** Loading `/GlSGD7ny/white#12` renders the nvui panel
  at the **start** position — Pieces shows all 32 men on home squares, Last move says "Game start",
  Pockets is empty — while the move list is fully populated. One arrow key fixes it. **Whatever we
  build must render the prose block from the current node on first paint.**
- **`div.notify` is never cleared** — a stale "pawn: 1" sat there through several later moves.

## 15.7 Puzzles have a third nvui

`main.puzzle.puzzle--nvui`: h2 Puzzle info · Moves · Pieces · Puzzle status · Last move · Move form ·
Actions · Board · h3 Puzzle Settings · Advanced settings · Keyboard shortcuts · Commands ·
Command list when the board has focus · **Promotion**. So nvui is implemented three times — round,
analysis, puzzle — for the same shape.

---

# 16. WHAT THIS CHANGES IN OUR PLAN

1. **The change's premise splits.** "pychess pages are already capable of good enough accessibility
   without a mode" is **confirmed for the site chrome** (§11, §14 — zero ARIA added outside the
   board) and **contradicted for the board** (§12). lichess did not make its visual board pages good
   enough and skip a mode; it left them unannounced and built a parallel block. That is exactly
   where `tasks.md` 3.3c already confines the mode's job.
2. **Four normal-mode items are now known to be feasible without any mode**, because lichess ships
   them outside blind mode: a typed move field with a command set (§13.1), **drop notation for
   crazyhouse** (`R@b4`), `SpeechSynthesis` announcements (§13.2), and voice input (§13.3).
3. **Three fixes are one-liners with evidence:** wrap the move input in a `<label>` (§15.1); replace
   the seek-dialog sliders with labelled `<select>`s (§15.5); put an `h2` on every settings row
   (§11.4).
4. **Pockets are solved cheaply** (§15.3) — prose block plus one command — and our user's model is
   more ambitious than the precedent.
5. **Do not copy**: any of the three variant pickers, the `<tr role=button>` seek row, `role=tab`
   without `aria-selected`, `aria-modal` without `showModal()`, icon buttons named only by `title`,
   or **a `visibility:hidden` hover menu with no focus fallback** (§11.1 — it costs lichess 31 of
   its 37 nav links).

6. **WHY LICHESS NEEDS A MODE AT ALL, and why we may not.** Every fix in blind mode is a
   **replacement**, never an addition: hover menu → revealed list, title link → heading, slider →
   `<select>`, board → 64 buttons, `<title>`-only state → live regions. A replacement changes what a
   sighted user sees, so it *must* be gated behind a mode. Fixes written as **additions** — a
   `<label>` around an existing input, an `aria-live` on an existing status div, an `<h3>` *wrapping*
   an existing link, `aria-current` on the active move — are invisible to sighted users and need no
   gate at all.

   **lichess needs a mode because of how it chose to fix things, not because the fixes inherently
   require one.** The only genuinely visual change in its whole non-board blind mode is revealing
   the hover menus — and that one exists solely to repair a defect (§11.1) we do not have to ship in
   the first place. This is the sharpest argument available for 3.3c.

---

# 17. STILL NOT CAPTURED

- **a pending draw offer** — the control is `disabled` against the AI, so this needs a human opponent
- a game with a **human** opponent generally: chat traffic, opponent-gone timers, the rematch flow
- Android / TalkBack behaviour, and the touchscreen board support §7 mentions
