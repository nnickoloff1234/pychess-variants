# Candidates — costed options, NOTHING DECIDED

**Status: this is a menu, not a plan.** Nikolay, 2026-09-26: *"we havent reached conclusion what to
do yet, just good to have all this written down as options and findings."* The gate is task 3.4 and
it is still open.

Each candidate says what it is, what it buys, what it costs, and what is still unknown about it.
Ordered by cost, cheapest first — which is **not** a recommendation of order.

---

## What a screen reader does, in plain terms

Needed to read the rest of this, and the thing that was hardest to communicate.

A screen reader **only speaks what the user navigates to.** They move with keys — `H` next heading,
`B` next button, arrows next line — and it reads whatever they land on. **It reads the HTML, not the
picture.**

Two consequences that govern every candidate below:

1. **CSS is nearly invisible to it.** Side by side or stacked makes no difference to someone who
   cannot see it. The one exception is `display: none`, which removes content from what the screen
   reader can reach at all.
2. **A change the user did not cause is silent by default.** The opponent moves, the page updates,
   and nothing is spoken, because nobody navigated there. Fixing that needs `aria-live` (candidate
   D).

On our round page today it lands on some links, some text, and then **a pile of empty `<div>`s where
the board is.** There is nothing to hear.

---

## A. The blind-mode toggle button

**What.** A visually hidden button as the **first element inside `<body>`** on every page, submitting
a form that flips a session flag. Lichess's, verbatim:

```html
<form id="blind-mode" action="/run/toggle-blind-mode" method="POST">
  <input type="hidden" name="enable" value="1">
  <input type="hidden" name="redirect" value="/">
  <button id="nvui-button" type="submit">Accessibility - Enable blind mode</button>
</form>
```

**Buys.** Discoverability, which nothing else has. First in the accessibility tree means it is **the
first thing a screen reader user hears on arriving at the site** — no settings page to find, no
account needed. When on, it becomes "Disable blind mode" plus a link to the tutorial.

**Costs.** A template partial, a session flag, one route. Invisible to sighted users.

**Unknown.** Whether we want a *mode* at all (see candidate F and design Decision 4). The button is
worthless without something behind it, so this is not a standalone first step.

---

## B. Headings on the game page

**What.** `<h2>` signposts. Press `H`, jump to the next one. Lichess's order:

```
Game info · Move list · Pieces · Game status · Last move
Input form · Clocks · Actions · Board · Advanced settings
```

**Buys.** Navigation. **Our round page has almost no headings**, so there is nowhere to jump and the
page must be read top to bottom every time. With them, "what was the last move" is `H` five times.

**Costs.** Adding heading elements to markup that already exists. Visible to sighted users unless
hidden, which is a design question, not a technical one.

**Unknown.** Whether they can be always-on (they are good practice for everyone) or need the mode.
Lichess puts them only in the nvui block; we may not need to.

---

## C. The position as text — "six paragraphs"

**What.** Under a `Pieces` heading, one paragraph per piece type per colour:

```html
<h3>White</h3>
<p>king: e1</p>
<p>queen: b5, g8</p>
<p>rook: a1, h1</p>
<p>bishop: c4, d4</p>
<p>knight: d2, f3</p>
<p>pawn: a2, e4, f2, g2</p>
```

**Buys.** **The entire position, as text, in about twelve lines.** A blind player hears the whole
board in seconds rather than visiting 64 squares. This is the candidate that makes a game *readable*
with no board of any kind.

**Costs.** Generated from the FEN, which the client already has. Plain HTML. No board technology, no
images, no CSS.

**Unknown.** Piece naming for variants — see candidate E's cost note, which applies here too. With
no naming table this reads `r: a1, h1`, which is still usable and is what lichess's own "Letter"
piece style does.

---

## D. Live regions — one attribute, four values

**What.** `aria-live` on elements we would already be creating. It means *"when this text changes,
speak it immediately, even though nobody navigated here."*

| Element | Value | Effect |
|---|---|---|
| last move | `assertive` | opponent moves → *"knight takes f 3"* spoken at once |
| game status | `assertive` | *"Checkmate • White is victorious"* |
| errors | `assertive` | *"Invalid move: nd2"* — observed live in lichess's DOM |
| board prompts | `polite` | *"Promote to: q for queen…"*, waits for a gap |
| move list | **`off`** | **deliberately silent**, with `role="log"` so it stays navigable |

All `aria-atomic="true"` — read the whole region, not the changed word.

**Buys.** The thing our survey found missing everywhere: **we have no `aria-live` on any game page**,
so an opponent's move is never announced. This is what makes a game *followable*.

**Costs.** One attribute per element, plus two short strings (last move, status) we already know
server-side.

**Unknown, and it is the interesting one.** `off` on the move list is a deliberate refusal: the
obvious design announces every move, and lichess does not, because the one-sentence last-move region
already does that job and re-reading 26 moves would be unusable. **Worth copying the split, not just
the idea.**

---

## E. The command input field

**What.** One text input taking moves in algebraic notation (`e4`, `Nf3`, `O-O`, `a8=R`) and
single-letter commands: `c` clocks, `l` last move, `P N` locate white knights (uppercase = white),
`s a` read the a-file, `o` opponent, `b e4` go to the board, plus `abort` / `resign` / `draw` /
`takeback`.

**Buys.** **This is the floor our user says we lack** — *"on veb site there isn't even editor to
enter the move using NVDA for windows or Talkback/jieshuo screen reader."* Without it a blind player
cannot move at all. With it, plus C and D, a game is playable.

**Costs.** One `<input>` and a command parser. **SAN parsing and validation per variant comes free
from Fairy-Stockfish**, already shipped both sides: `pyffish` server-side, `ffish-es6` client-side.
We are not writing a chess parser — and our user built their own program on the same engine for the
same reason.

**Unknown / open decisions.**

- **We have not seen lichess's markup for it.** The DOM Nikolay captured was a *finished* game, and
  the field only exists while a game is playable. The tutorial describes it; nothing confirms it.
- **Always visible, or mode-only?** Nikolay raised this and was right to. Evidence:
  lichess's normal page carries `"pref": { …, "keyboardMove": false, … }` — **a keyboard-move box is
  an ordinary user preference available to every sighted player, off by default.**
  So a candidate shape, undecided: **one input, offered to everyone as a preference, off by default,
  forced on in blind mode.** The argument for it is design Decision 4 — a feature only blind users
  have is one nobody notices breaking, and this is the same code either way.
- Which commands are worth the first pass. `c`, `l`, `P`, `s` are each a few lines; the rest can wait.

---

## F. The board as buttons

**What.** One real `<button>` per square, whose **text content is its label**:

```html
<button class="black rook light" text="A8 black rook" rank="8" file="a" piece="r"
        color="black">A8 black rook</button>
<button class="dark"  text="B8 +" piece="+">B8 +</button>   <!-- empty DARK square -->
<button class="light" text="E8 -" piece="-">E8 -</button>   <!-- empty LIGHT square -->
```

Plus key handling: arrows to move, `Space` to select and again to move, `k q r b n p` to jump to a
piece type, `1`-`8` rank, `Shift+1`-`8` file, `f` flip, `m` legal moves, `x` scan the rays from this
square, `l` last move, `t` clocks, `i` back to the input.

**Buys.** Spatial exploration of the position — **and this was our user's number-one request**:
*"to navigate through the board using arrows"*, plus *"which piece attack this cell"* (the `x` ray
scan) and *"a mirrored reflection of the board, cast from the side of the black pieces"* (`f`).

**Costs — smaller than it looks, and here is why, because this was the main worry.**

- **No images.** The accessible content is the button's text. The classes exist so lichess's CSS can
  *optionally* paint a piece for sighted testers. **Our piece sets never need mapping onto buttons.**
- **No table, no `role`, no `aria-label`, no `tabindex` management.** Buttons are focusable and take
  Space/Enter for free.
- **Board size is already data we have.** `dimensions: { width, height }` is declared per variant in
  `client/variants.ts`, from 7x7 to 10x10. Emitting `height x width` buttons from a FEN is a loop;
  nothing is baked to 8.
- **chessgroundx is not touched.**

**And this is where pychess is better placed than lichess, not worse.** A 9x9 shogi board is
*exactly as readable* as 8x8 when it is text. Text scales for free — which is precisely why our user
wrote their own program for variants, and why nobody has an accessible server for shogi, grand,
orda or seirawan.

**The one real cost: spoken piece names.** 33 `pieceFamily` values in `variants.ts`, so a table of
roughly 200-350 translatable strings. **But it is not a prerequisite**: with no table we announce the
role letter — `A8 black r` — which is exactly lichess's own "Letter" piece style. `pieceNames` already
exists in `variants.ts` with gettext wiring and four variants use it for pockets today. The six
families covering our user's eight named variants would come first.

**Unknown.**

- **Pockets.** Our user specified the model precisely and it is more specific than anything lichess
  documents: white's pocket off the left edge of the a-file, black's off the right edge of the last
  file (h, i or j by variant width), vertical arrows stepping through the roles, **in the same
  navigable space as the board**. Four of their variants need it.
- **Plain or table layout.** Lichess ships **both** as a user setting — `plain` (no semantics, works
  in focus mode, faster under arrows) and `table` (real `<table>` with rank/file headers, works in
  browse mode with the screen reader's own table keys). **They did not solve browse-vs-focus mode
  either; they offered the choice.** We have only seen `plain`.
- How much key handling belongs in a first pass. Arrows plus `Space` is the minimum; the ray scan is
  the most valuable extra and the most work.

---

## G. Ordinary semantics on every other page

**What.** Headings, landmarks, real `<button>`s, labelled form fields on the lobby, tournaments,
profiles, forum, rules pages. Always on, no mode.

**Buys.** Our user already uses our rules pages — *"to read the rules of unknown chess variant to
play via my own created program."* They read us and then go elsewhere to play. And *"short help for
active chess variant"* is on their wanted list, which for a variant server is worth more than it is
to lichess. Lichess even emits `<h2>Navigation</h2>` in its site header on every page.

**Costs.** Per page, small each. Benefits everyone, cannot rot unnoticed.

**NO LONGER UNKNOWN — the twelve sweeps of 2026-09-27 filled this in.** G began as a placeholder
("where are the worst offenders?"); it is now a concrete worklist of roughly seventy defects with
file:line, WCAG level and fix size, spread across `collapsibles-sweep.md`,
`focus-and-tabindex-sweep.md`, `alt-and-labels-sweep.md`, `headings-and-landmarks-sweep.md`,
`docs-pages-sweep.md`, `lobby-and-tournament-sweep.md`, `profile-and-study-sweep.md`,
`inbox-and-forum-sweep.md`, `round-and-analysis-sweep.md`, `settings-sweep.md`,
`admin-and-moderation-sweep.md` and `puzzle-editor-sweep.md`, and classified by change type in
`coverage-and-change-types.md`.

**Two generalisations collapse most of it**: AD1 (four broken modals become one native `<dialog>`
change that deletes code) and PE3 (~40 dead controls become one rule — if it responds to a click it is
a `<button>` or an `<a href>`).

**What is still unknown is only the verification**: nothing has been heard with a screen reader
(task 2.1/2.2), no runtime DOM was inspected for the Snabbdom pages, and Android was never tested.

---

## The rule that emerged, and it decides how much of the site is affected

> **A separate non-visual rendering is needed exactly where information exists as pixels rather than
> text.**

That is **board pages only**. The lobby, tournaments, profiles and forum are ordinary documents; they
need candidate G, not a mode. This bounds the per-page work that Nikolay was right to worry about.

**And the per-page cost is NOT css.** Lichess's `bits.blind.css` largely *removes* visual styling —
which is why the page looks stacked with menus expanded, and why that appearance is **a side effect,
not the accessibility feature**. We should copy none of their CSS. What is per-page is the content
module, and lichess built one per page type (`round.nvui`, `analyse.nvui`, and more), which is why
their scope took years. **We are not obliged to**: candidates B, C, D and E are markup in the page
we already render.

---

## THE FINDING THAT ANSWERS "why not just use the board we have"

Verified in `node_modules/chessgroundx/src/`:

- `createEl('piece', pieceName)` — `pieceName` is the **CSS class**, not text. So
  `<piece class="white rook">` with **no text content**.
- Position is `translate(el, posToTranslate(...))` — a **CSS transform**. The square a piece stands
  on exists **only as a pixel offset**.
- The only text the entire package emits is `renderCoords`, the a-h / 1-8 edge labels.
- **Zero `aria-*`, zero `role`, zero text on any piece or square.**

So to a screen reader our board is a few `<coord>` labels and **a pile of empty divs**. The position
is not hard to read — **it is absent.**

The comparison is therefore not "buttons read more easily than chessgroundx". It is **nothing versus
the full position as ordinary text.**

And "a board of buttons still needs sight" — no. The user never sees it. They arrow between buttons
and **each button speaks itself.** The visual arrangement is irrelevant; what matters is DOM order
(rank 8 down to 1, a-file to h-file), which is why lichess's `plain` layout has no table semantics
and does not care how it looks.

---

## Two groupings worth considering at the gate

Recorded as shapes to argue about, **not as a recommendation.**

**A NOTE ON WHICH CANDIDATES THE GATE ACTUALLY CHOOSES BETWEEN.** Seven are live (H is argued
against). They divide by kind, not only by cost:

- **B, C, D, E, F add new content to the game pages.** These are what task 3.4 selects from, and the
  only items in this change that write markup that does not exist today.
- **A is conditional on task 3.4b** — whether a *mode* is wanted at all. It is an entry point, useless
  on its own and unnecessary if the markup is always-on.
- **G is no longer a candidate so much as the worklist**, now fully enumerated by the sweeps (above),
  and it does not need the gate's permission — none of it adds content, and much of it is Level A.
- **D straddles the line.** Its game-page half is gate work; the ~8 live-region sites the sweeps found
  elsewhere (inbox PM, puzzle feedback, seek list, tournament clock, standings, chat, forum) are
  worklist. Whatever is decided for the board serves those too, which is an argument for deciding D on
  its own merits.

**Grouping 1 — "readable and playable, no board."** A + B + C + D + E.
Ten headings, about twenty paragraphs generated from data we already have, `aria-live` on four of
them, one text input and a small command parser. No board, no CSS, no chessgroundx, no piece images.
Delivers a game a blind player can follow and move in. **Does not deliver our user's number-one ask.**

**Grouping 2 — grouping 1, then F.** Adds spatial navigation, which is what our user asked for first
and what pockets attach to. Larger, and the naming table starts to matter.

**The tension to resolve at the gate:** our user's stated *floor* is move entry (candidate E), and
their stated *first want* is arrow navigation (candidate F). Those are different candidates, and
grouping 1 satisfies the floor without the want.

---

## H. The stacked layout with menus expanded — ARGUED AGAINST

Nikolay asked, 2026-09-26: *"do we plan to do this too in blind mode? what would it cost in terms of
code changes?"* Recorded with its answer so it is not re-proposed.

**What it is, and it is not a feature.** Lichess's `bits.blind.css` largely *removes* visual styling.
The nav dropdowns look expanded because the CSS that hides them is not applied, and everything stacks
because the layout CSS is gone. **Measured: the DOM is identical in both modes** — the nav links are
present in the normal page's HTML too — so the entire difference is CSS.

### Three reasons not to copy it

**1. It buys nothing for a blind user.** A screen reader reads the accessibility tree, not the
painted page. Side by side or stacked is invisible to someone who cannot see it.

**2. It costs work rather than saving it.** We would not be *omitting* CSS, we would be writing
overrides to undo our own — a `body.blind-mode` block per collapsible component. That is exactly the
per-page fine-tuning Nikolay was worried about, and here it would be spent on the one thing with no
payoff.

**3. Always-expanded menus are arguably WORSE.** With every menu open, a screen reader user hears the
whole nav — on pychess roughly thirty-five links — before reaching the game, on every page. A
collapsed menu that announces itself is fewer keystrokes to the content. **Lichess's blind mode does
this accidentally, not by design**, and their own answer for navigation is the opposite: they add
`<h2>Navigation</h2>` so it can be *skipped*.

### The real question underneath, and we already answer it correctly

The legitimate concern is **"is hidden content reachable at all?"**, because `display: none` **and
`visibility: hidden`** both remove content from the accessibility tree. (`opacity: 0` and off-screen
positioning do not — a common source of confusion.)

**Measured on our own site, and it is already right.** `.login-dropdown-menu` hides with
`visibility: hidden` + `transform`, which does hide it from a screen reader — but it is paired with
the correct pattern:

```html
<button class="login-btn nav-link" aria-haspopup="true" aria-expanded="false">…</button>
<div class="login-dropdown-menu" role="menu">
  <a class="login-option" role="menuitem" …>
```

and `client/main.ts` genuinely maintains it (`setAttribute('aria-expanded', …)` at lines 448, 460,
473, 487). So a screen reader announces *"Login, menu button, collapsed"*, the user activates it, and
it expands and reads. **That is the standard correct pattern, and it is the right answer rather than
revealing everything.** `client/profileActionOverflow.ts:16` and `client/tournamentForm.ts:163` do
the same.

**Nothing to do here.** Three collapsibles confirmed correct; **what is unaudited is every other one**,
which belongs to candidate G and to the screen-reader walk in task 2.2. That audit is the useful
version of this question.
