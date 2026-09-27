# The accessibility tree we actually produce — runtime sweep

Done 2026-09-27. **This is the first sweep in this change with runtime evidence.** The twelve
earlier sweeps read source; this one reads what Chrome hands a screen reader.

Asked for by Nikolay in these words, and the file is organised around them rather than around
counts: *"can a blind user currently on pychess have interaction with the hidden submenus one way or
another? are there redundant noise elements in the accessibility tree that would annoy them? we need
to look at this from perspective of actual usecases and workflow — not just counting elements. is
everything actionable with UI also have its counterpart in the accessibility tree and is properly
annotated"*

## How this was done, and what is authoritative

`scripts/a11y_capture.py` attaches over CDP and calls **`Accessibility.getFullAXTree`** — the
browser's computed tree, which is what the screen reader is handed. Not the DOM, not a heuristic.
`scripts/a11y_audit.py` reports one capture, `scripts/a11y_diff.py` compares two.

Eight pages, anonymous, dev server on `127.0.0.1:8080`, Chrome 144 — the same browser build used for
the lichess capture, so the two are comparable.

| Claim type | Confidence |
|---|---|
| a node is / is not in the tree | **authoritative** — straight from `getFullAXTree` |
| its role, name, and which mechanism named it | **authoritative** — `name.sources` |
| why a node was dropped | **authoritative** — `ignoredReasons` |
| "unreachable from the lobby" | **measured** — `.focus()` on every link, checking `document.activeElement` |
| anything about logged-in UI | **not covered** — the server ran without `-a` |
| anything about a live game | **not covered** — no game id was available |

---

# U1. Can a blind user reach the navigation? **No — 15 destinations are unreachable.**

The submenus are `visibility: hidden` until `:hover` (`collapsibles-sweep.md` F1/F1a), and
`visibility: hidden` removes a subtree from the accessibility tree **entirely** — Chrome does not
emit those nodes at all, not even as ignored ones.

The question that matters is not "is the menu reachable" but **"can the user get to the
destination by any route at all"**. Measured on the lobby by focusing every `a[href]` in turn and
recording which ones actually take focus, then subtracting:

- 52 links in the DOM, **26 focusable**
- 22 of them are submenu destinations
- **15 of those 22 exist nowhere else on the page:**

  `/tournaments` · `/simul` · `/authors` · `/memory` · `/study/all` · `/video` ·
  `/@/<self>/following` · `/team` · `/variants/community` · `/forum` · `/blogs` ·
  `/analysis/chess` · `/paste` · `/games/search` · `/my-variants`

**So from the lobby a blind user cannot reach Tournaments, Simuls, the Forum, Teams, Studies, Blogs,
the Video library, Import game, Advanced search, My variants, Authors, Memory, community variants,
their own Following list, or the standard Analysis board.** Not by keyboard, not by browse mode, not
by any other link on the page. The only routes left are typing a URL from memory or a search engine.

The seven that *are* reachable are the section titles' own destinations (`/?any`, `/puzzle/chess`,
`/variants`, `/tv`, `/players`, `/editor/chess`, `/patron`), because the title link itself is a real
focusable `<a>`.

**This is the single worst finding in the whole change**, and it is not on the board at all.

---

# U2. Can a blind user use the board? **No. The board contributes nothing.**

On `/analysis/crazyhouse`, queried live:

```
cg-board   focusable descendants: 0    child element types: ['piece']    contains "aria-": false
pockets    8 found,  focusable descendants: 0
move list  0 elements
```

And the tree agrees — the complete list of **interactive** nodes on the analysis page is:

```
link  PyChessDEV · PLAY · PUZZLES · LEARN · WATCH · COMMUNITY · TOOLS · " DONATE"
textbox "Search users"      link "Test–SoldierHorse"
button "Challenges: 0" · "Notifications: 0" · "Settings"
combobox "Variant"          checkbox ""
button "p" · "l" · "n" · "o" · "m" · "s"
textbox ""
link "ADownload PGN" · "ZCopy UCI/USI" · "APNG image"
button "Add to Study" · "Keep all variants" · "Open preferences"
```

Everything above the variant combobox is **site chrome**. Of the board page's own content:

- **not one square** is present, let alone actionable — 64 squares, zero nodes
- **the pockets are absent** — 8 pocket containers, zero focusable descendants, and crazyhouse is the
  variant where the pocket *is* the game
- **the move list is absent** — zero move elements, no `list`/`listitem` anywhere

A blind user cannot read the position, cannot find a piece, cannot make a move, cannot review the
moves played. **The board page is, for them, a page with a variant dropdown and some download links.**

This matches lichess's *normal* mode exactly (`lichess-reference.md` §12.2), which is why their nvui
exists. It is the part our user described as *"there isn't even editor to enter the move."*

---

# U3. Is what *is* there properly annotated? **Largely yes for the chrome, badly for the board.**

Only 7 interactive nodes across 8 pages are outright unnamed. The real defect is subtler and worse:
**names that exist but are wrong.**

## U3.1 Four board buttons are announced as single letters

**CORRECTED after running Orca (§O below). The first version of this section said six buttons and
named the wrong mechanism.** The tree's `name` field shows six single letters —
`"p" "l" "n" "o" "m" "s"` — but Orca announces only four of them that way, because two carry a
`title` that the tree's `name` did not reflect:

| button | markup | Orca says |
|---|---|---|
| flip board | `<button title="Flip board"><i class="icon icon-refresh">` | "Flip board push button" |
| **first move** | `<button><i class="icon icon-fast-backward">` | **"l push button"** |
| **previous** | `<button><i class="icon icon-step-backward">` | **"n push button"** |
| **next** | `<button><i class="icon icon-step-forward">` | **"o push button"** |
| **last move** | `<button><i class="icon icon-fast-forward">` | **"m push button"** |
| menu | `<button title="Menu"><i class="icon icon-bars">` | "Menu push button" |

**The mechanism is not `content: attr(data-icon)`** — these buttons have no `data-icon` at all. It is
the icon font mapping **plain ASCII letters** to glyphs:

```css
.icon-fast-backward::before { content: "l"; font-family: pychess; }   /* renders ⏮ */
```

The glyph is a letter, so the accessible name computed from contents is the **literal letter**.

**So the entire move-navigation control set — first, previous, next, last — is announced as
"l", "n", "o", "m".** That is worse than unnamed, because it sounds like content. The two buttons
that escape it do so only because someone happened to add a `title`.

## U3.2 Three links carry a junk letter inside an otherwise good name

```
link "ADownload PGN"     link "ZCopy UCI/USI"     link "APNG image"
```

Same cause — the leading character is the icon glyph, concatenated into the name.

## U3.3 An icon glyph is inside the DONATE link's name, on every page

`.donate-link::before` computes to **U+E903** in font `pychess`, so the name is `"\ue903 DONATE"`.
Confirmed on all 8 pages (24 nodes). The lobby alone has **19 `.icon-*` elements emitting a `::before`
glyph plus 5 `[data-icon]` elements**; every one of them that sits inside a named control pollutes
that control's name.

**lichess has the identical bug** — their forum heading is `"\ue042 Lichess Forum"` and blind mode
strips it (`lichess-reference.md` §16 note). Neither site handles it in normal mode.

**Orca drops it silently** (§O): the DONATE link is announced as *" DONATE link."* — a leading
space, no spoken glyph, no "unknown character". **So for Orca this is cosmetic, not a defect**, and
the worklist is reordered accordingly. It is still worth fixing cheaply, because NVDA and TalkBack
are not Orca and may verbalise the codepoint — but it must not outrank U3.1, which Orca proves is
real.

Fix shape: CSS alt text, `content: "\e903" / ""`, which Chrome supports and which empties the
generated content's contribution to the name; or a real glyph span carrying `aria-hidden="true"`.

## U3.4 What is annotated well

Worth recording so we do not "fix" it: `combobox "Variant"` is a real named combobox,
`button "Challenges: 0"` / `"Notifications: 0"` / `"Settings"` are properly named (better than
lichess, whose equivalents came back unnamed), and `textbox "Search users"` has a name.

---

# U4. Is there noise that would annoy them? **Yes, but not the combobox — that claim was wrong.**

> **RETRACTED 2026-09-28.** This section claimed a hidden 59-option variant combobox was exposed on
> `/analysis/crazyhouse`, so a browse-mode user met a control nobody could see. That is not true.
> There are **two** 59-option selects on that page and the original probe conflated them:
>
> | select | where | visible | in the tree |
> |---|---|---|---|
> | `#variant` | `ASIDE > MAIN`, the sidebar picker | yes, 190px wide | **yes** — the `combobox "Variant"` that was measured |
> | `#settings-variant` | `#settings-panel` in the HEADER | no, width 0 | **no** |
>
> The capture exposes exactly **one** combobox and it is the visible one. The hidden one sits inside
> the collapsed `#settings` panel, which is `display: none` when closed, so it is correctly absent.
> Its own computed style reads `display: block; visibility: visible` — `offsetParent` was null
> because an ANCESTOR was hidden. That is the same ancestor-vs-self trap that invalidated the
> "45 invisible-but-exposed elements" count further down this file, approached from the other side:
> there it over-reported hidden things, here it mistook a visible control for a hidden one.
>
> **The lesson stands even though the finding does not:** visibility questions must be asked of the
> accessibility tree (is the node present? what is its `ignoredReasons`?), never of `offsetParent`.
>
> **What survives.** The two noise sources this section listed *besides* the combobox are real and
> still stand, because both were found by starting from a tree node: the PUA glyph characters read as
> unpronounceable junk (U3.3) and the letter-named buttons that sound like stray content (U3.1). So
> the answer to U4 is still yes — just not for the reason first given, and not at the scale of
> 59 spurious options. The section below is kept for the record.

## (retracted) The original claim

`select[name="settings-variant"]` has **59 options** and is **not visible** on `/analysis/crazyhouse`
— yet it is exposed in the tree, and its 59 `option` nodes are the single largest role group on the
page (`option: 59`, against `link: 12` and `button: 12`).

A browse-mode user arrowing through the analysis page meets a variant chooser, and 59 variants, for a
control no sighted user can see there.

Two more noise sources, both already covered above because they are the same defect seen from the
other side: the PUA glyph characters (U3.3) are read as unpronounceable junk, and the letter-named
buttons (U3.1) sound like stray content.

> **How much more noise is there? Not measured, and deliberately not guessed.** An earlier draft of
> this section carried a count of DOM elements that were "invisible but not `display:none`". That
> number has been removed rather than caveated: it measured nothing useful. `offsetParent` is null
> whenever an *ancestor* is `display:none` — and those nodes are not in the tree at all, so they
> cannot be noise — while `position: fixed` elements are visible *and* exposed, so they inflate it
> from the other side. It also started from the DOM, when the authoritative list of what a screen
> reader meets was already in hand.
>
> **The correct check, which `a11y_capture.py` does not yet do:** record each node's
> `backendDOMNodeId`, resolve it with `DOM.resolveNode`, and call
> `element.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})` — which accounts for
> ancestors, `opacity` and `content-visibility` in one call. "Exposed in the tree but not visible" is
> then exact.
>
> **It must stay a list to read, never a count to compare.** Visually hidden content is a legitimate
> technique, not automatically a defect — lichess's blind-mode toggle is exactly that, and it is the
> best thing on their site (§2).
>
> **This note used to end by saying the combobox finding was safe because it started from a tree node
> and checked that element. It did not, and that is why it was wrong** — it started from a DOM
> `select`, found `offsetParent` null, and assumed the exposed `combobox "Variant"` was the same
> element. Two selects, one name. The rule the note states is right; the finding it exempted never
> followed it.

---

# O. What Orca actually said — and why running it was worth it

Run 2026-09-27, after the capture, to answer one question the tree could not: **how the junk is
actually spoken.** Setup, all verified on this machine:

```bash
gsettings set org.gnome.desktop.interface toolkit-accessibility true
orca --replace -e braille-monitor -d speech --debug-file=orca.log &
google-chrome --remote-debugging-port=9222 --force-renderer-accessibility \
  --user-data-dir=~/.cache/a11y-chrome --class=a11y-capture
```

`orca --list-apps` confirms Chrome is exposed over AT-SPI. Focus was then walked through the page
with real Tab key events over CDP, and Orca's own debug log read back — it records every utterance as
`SPEECH OUTPUT: '...'` (`speech.py:150`) and every braille line as `BRAILLE LINE: '...'`
(`braille.py:1391`), **even with speech disabled**, so nothing has to be transcribed by ear.

What it announced, tabbing through `/analysis/crazyhouse`, in order:

```
banner
PyChessDEV link. · PLAY link. · PUZZLES link. · LEARN link. · WATCH link. ·
COMMUNITY link. · TOOLS link. · " DONATE link."
Search users entry Search.
Test–SoldierHorse link.
Challenges: 0 push button. · Notifications: 0 push button. · Settings push button.
leaving banner.
complementary content
Variant combo box. CRAZYHOUSE. opens menu
leaving complementary content.
check box not checked.
Flip board push button.
l push button.  ·  n push button.  ·  o push button.  ·  m push button.
Menu push button.
FEN & PGN scroll pane clickable.
FEN read only entry rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1 selected.
Add to Study push button.
```

**Three things this settled that the tree alone could not:**

1. **The PUA glyph is silently dropped** — `" DONATE link."`, a leading space and nothing more.
   U3.3 downgraded from defect to cosmetic (for Orca).
2. **"l", "n", "o", "m" are really spoken** — the move-navigation buttons. U3.1 confirmed by ear,
   and corrected from six buttons to four.
3. **The tree's `name` field is not what the screen reader says.** For the flip button the captured
   name was `"p"`, but Orca announced *"Flip board"* — it used the `title`, which the AX `name` did
   not reflect. **This is the methodological lesson of the whole session:** `getFullAXTree` is
   authoritative about *presence*, *role* and *ignoredReasons*, and only indicative about the spoken
   name. Anything resting on `name` alone deserves one confirmation by ear.

Two further observations worth keeping:

- **Landmarks are narrated on entry and exit** — "banner", "leaving banner", "complementary
  content", "leaving complementary content". `main` never appears, audibly confirming its absence,
  and giving a concrete reason to care about R5 beyond tidiness.
- **The board produced total silence.** Between "leaving complementary content" and the FEN box there
  is nothing — no square, no pocket, no move. U2 heard rather than measured.

**Verdict on Orca**, since the question was whether it would add anything beyond the capture: it
added exactly three corrections and one methodological caution, and every one of them changed the
worklist. It is not worth re-running as a survey, but it is worth running as a **check on any claim
that rests on a name**.

---

# The counts, as support rather than as the finding

| page | interactive | unnamed | icon-glyph names | headings | **live regions** |
|---|---|---|---|---|---|
| index (lobby) | 49 | 2 | 3 | 7 | **0** |
| analysis_crazyhouse | 28 | 2 | 3 | 1 | **0** |
| editor_crazyhouse | 31 | 2 | 3 | 1 | **0** |
| puzzle_chess | 28 | 1 | 3 | 1 | **0** |
| forum | 20 | 0 | 3 | 6 | **0** |
| players | 86 | 0 | 3 | 1 | **0** |
| tournaments | 33 | 0 | 3 | 2 | **0** |
| variants_crazyhouse | 102 | 0 | 3 | 5 | **0** |
| **total** | **377** | **7** | **24** | **24** | **0** |

**Zero live regions on every page.** Nothing pychess does ever announces itself. lichess's *normal*
mode has 2 per page — implicit `polite` from `role="status"` on the header counters — and its blind
mode has 5 to 7.

Structural gaps behind those numbers:

- **no `navigation` landmark anywhere.** `templates/template.html:11` is `<div class="topnav">`;
  lichess uses `<nav id="topnav">`. One word, every page.
- **no `main` landmark on the board pages.** The lobby has one, `/analysis/crazyhouse` exposes only
  `banner` + `complementary`. Both templates emit the same `<div id="placeholder">`, so this is
  decided client-side.
- **no `h1` on any page captured.** The lobby's outline is six `h3`s (variant categories) then an
  `h2` — levels out of order, the same pattern we criticised on lichess's `/tournament`.
- **board pages expose exactly one heading**, *"Game category filter"*, which belongs to the filter
  UI rather than the content.

## pychess vs lichess, normal mode both

| | exposed | interactive | headings | live |
|---|---|---|---|---|
| lichess `/analysis` | 253 | 27 | 0 | 2 |
| **pychess `/analysis/crazyhouse`** | 404 | 28 | 1 | **0** |
| lichess `/` | 1036 | 133 | 10 | 2 |
| **pychess `/`** | 327 | 49 | 7 | **0** |

**We are in the same league as lichess's normal mode, and behind it only on live regions.** The board
is equally absent on both. This matters for the gate: the gap to close is not "catch up with
lichess's ordinary pages" — it is the board, where neither site does anything without a mode.

---

# Worklist, in the order the evidence justifies

| | What | Why it is first | Size |
|---|---|---|---|
| **R1** | `:focus-within` on `.topnav section` **and** a real disclosure | U1 — 15 destinations unreachable, Level A | one selector + the pattern we already run for the login menu |
| **R2** | `role="status"` on the challenge/notification counters | the only live regions on the whole site would be 0 → 2, free, exactly as lichess gets them | one attribute |
| **R3** | Give the four move-nav buttons a name | U3.1 — Orca says "l", "n", "o", "m" for first/prev/next/last. **Confirmed by ear, not inferred** | `aria-label` on four buttons |
| R4 | CSS alt text on the `.icon-*` rules | U3.3 — **downgraded: Orca drops the glyph silently**, so this is cosmetic for Orca and speculative for NVDA | a CSS change in one place |
| **R5** | `<div class="topnav">` → `<nav>`; `<main>` on the board views | landmarks, every page | one word + one client-side wrapper |
| **R6** | An `h1` per page; fix the lobby's h3-before-h2 order | no page has one | template/view work |
| ~~R7~~ | ~~Stop exposing the hidden 59-option variant select on board pages~~ | **WITHDRAWN 2026-09-28** — rested on the retracted half of U4. Nothing to fix: the exposed combobox is the visible sidebar picker, and the hidden `#settings-variant` is already out of the tree | none |
| **R7a** | ~~`props: { for: ... }` → `attrs:`~~ **DONE** — the Board Settings variant select had **no accessible name at all** | replaces the withdrawn R7. Measured, fixed and re-measured — see below. WCAG 4.1.2 | one word |
| **R7b** | Disambiguate the two controls now both named **"Variant"** | **measured, not inferred**: with the drawer open the tree holds two `combobox "Variant"`. Exposed *by* fixing R7a — naming choice is open | a name change on one of them |
| **R8** | The board itself — squares, pockets, move list, live regions | U2, and the actual request from our user | **the gate's subject; not costed here** |

R1–R6 and R7a/R7b are all **site chrome, none of them touch the board, chessgroundx or layout CSS** — so like
`collapsibles-sweep.md` F1/F2 they belong to candidate G and do not depend on the gate's verdict.
R8 is what task 3.4 is deciding.

## R7a/R7b: what was actually there, once the drawer was opened

The retracted R7 had been standing in front of a real defect. Measured 2026-09-28 by opening
Settings → Board Settings and reading the tree in that state — the state every capture in this sweep
had missed, because the drawer was closed for all of them.

There are two variant pickers, both built by the shared `selectVariant()` helper, so both have 59
options — but they mean different things:

| | purpose |
|---|---|
| `#variant` (aside, `client/analysis/index.ts:41`) | which variant to **analyse** — changes the board |
| `#settings-variant` (`client/settingsView.ts:248`, in Settings → Board Settings) | which variant's **piece style you are editing** — changes nothing about the game |

### R7a — the confirmed bug: an unnamed combobox. FIXED.

With the drawer open, the tree held two comboboxes and **only one of them had a name**:

```
combobox name='Variant'   <- #variant, the aside picker
combobox name=''          <- #settings-variant
```

The cause is one word. `settingsView.ts:248` was the **only** `<label>` in the entire client written
`props: { for: ... }`; all ~30 others use `attrs:`. Snabbdom's `props` module assigns `elm[key] =
value`, and the reflecting DOM property of a label is **`htmlFor`, not `for`** — so the assignment
created a junk own-property and no `for` attribute was ever emitted. Measured on the live label:

```
{ text: 'Variant', hasForAttr: false, forAttr: null, htmlFor: '',
  expando: 'settings-variant', control: null }   <- label.control === null: associated with nothing
```

An unnamed combobox with 59 options is a WCAG 4.1.2 failure, and the worst kind: the visible `Variant`
text is right next to it, so nothing looks wrong. Changing `props` to `attrs` restores
`control: 'settings-variant'` and the name. Re-measured after the fix: **2 comboboxes, 2 named**.

> **Worth a grep, not just a fix.** `props` silently does nothing whenever the attribute name and the
> DOM property name differ. `for`/`htmlFor` is the common one; `class`/`className` and
> `aria-*` (no properties at all) are the others. Every other label in `client/` already uses `attrs`,
> so this was a lone slip rather than a pattern — but a lone slip that survived because nothing
> visual changes.

### R7b — exposed by the fix: two controls, one name

Fixing R7a makes both comboboxes read **"Variant"**, in the tree at the same time. A sighted user is
never confused — one sits beside the board, the other under a `Board Settings` heading, and position
supplies the context the name omits — but a screen-reader user listing form controls hears
"Variant, combobox" twice, with nothing to say which one moves the board.

This is not a regression to undo: an unnamed control is strictly worse than an ambiguously named one.
It is the next question, and the naming is a judgement call, so it is left open rather than guessed.
Whatever name is chosen for `#settings-variant` must still **contain the visible word "Variant"**
(WCAG 2.5.3 Label in Name), so `Variant to customise` is allowed and `Piece style` is not.

> **Method note, since this section replaced a wrong one.** R7 was wrong because it started from a
> DOM `select`, saw `offsetParent` null, and assumed the exposed combobox was that element. R7a was
> found the opposite way: start from the tree node, notice the name is empty, then go to the source.
> The same reversal is what the box at the top of U4 prescribes.

# What this sweep does not cover

- **logged-in UI** — the server ran without `-a`, so `#notify-app` and `#challenge-app` in their
  opened state, the inbox and profile pages are all unmeasured. This is still the largest gap named in
  `coverage-and-change-types.md`. **Partly closed since:** `#settings` was opened as far as
  Settings → Board Settings for R7a, and that single opened panel immediately yielded an unnamed
  59-option combobox — which is the argument for closing the rest of this gap rather than reasoning
  about it. Every panel measured so far in its *closed* state looked clean; the defect was only
  visible open.
- **a live game or a two-board page** — no game id was available (`JJgZzLhJ` is gone), so the
  positive-`tabindex` prediction (T3) and the round page's tree remain unverified.
- **what a screen reader says.** The tree is necessary, not sufficient: it does not capture browse
  vs focus mode traversal, announcement policy, or the AT-SPI/UIA mapping. Orca and our user remain
  the only tests of usability.
