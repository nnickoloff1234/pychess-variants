## 0. Status

**Opened 2026-08-29. CLOSED 2026-08-30 with three items done. A standing list, not a fixed scope** — items are appended as they are found and
each is closed on its own. The change is archived when the list is closed, never merely because the
last item happens to be done.

Nothing here changes behaviour. Every item states the measurement that identifies it, in the mode it
was taken in, so that "fixed" is checkable rather than a matter of taste.

## 1. Coordinates outside the board on the analysis page

- [x] 1.1 **Measured** on p1 (1276x551, landscape-short, 100% zoom, `JJgZzLhJ`):
      `--bug-coord-gap` computes to `0px` on `.analysis-app.bug` — the round page's signal for "no
      room, put them on the squares" — while `coords.bottom` sits at `bottom: -16px`, outside the
      board, at chessground's default `opacity: 0.8` and `11.9px`.
- [x] 1.2 **Cause found.** 35 coordinate rules are scoped `.round-app.bug`; `.analysis-app.bug` has
      **none**. The analysis page computes the variable and has nothing that reads it.
- [x] 1.3 **Widened, not copied.** 36 selector lines changed from `.round-app.bug` to
      `:is(.round-app, .analysis-app).bug` — the two variables at the top, the `pointer-events` rule
      in the short-landscape block, the on-the-squares treatment, the sixteen-selector parity block
      and the whole `@container not style()` block that puts labels back outside. `:is()` keeps the
      specificity a class pair, so nothing about the round page's cascade moves.
- [x] 1.3b **The missing half was a variable, not just presentation.** `--bug-coord-overhang` and
      `--bug-coord-floor` were declared on `.round-app.bug` only, so on the analysis page
      `--bug-coord-capped` was invalid at computed-value time and `--bug-coord-gap` fell back to the
      `@property` initial of `0px`. It reported "no room" for the wrong reason — the answer happened
      to be right and the arithmetic behind it was not running at all.
- [x] 1.4 **Polarity preserved.** Both blocks were widened in place and neither was rewritten, so
      the positive/negative split is exactly as it was: a browser without `@container style()` still
      keeps labels on the squares rather than losing them.
- [x] 1.5 **Verified in all three modes and at three zooms.** Labels are now on the squares at
      `opacity: 1`, `bottom: 0`, `right: 0`, sized `--cg-width/8 * 0.3`, and coloured by square
      parity — files in `--cg-light`, ranks in `--cg-dark`:

      | window | mode | zoom | square | room | gap | labels |
      |:--|:--|--:|--:|--:|--:|:--|
      | p1 1276x551 | landscape-short | 100% | 54.67px | 4.3px | 0px | on the squares, 16.4px |
      | p1 1418x612 | landscape-short | 90% | 54.82px | 3.8px | 0px | on the squares, 16.4px |
      | p1 1595x689 | desktop landscape | 80% | 62.50px | 3.96px | 0px | on the squares, 18.75px |
      | p4 386x835 | portrait | 100% | — | — | 0px | on the squares, 14.4px |

      **The gap is zero everywhere for a real reason, not a stuck value**: the board unit is
      quantised to fill the stack, so spare height lands at 4px against a 12px floor. The arithmetic
      now runs and answers zero, where before it did not run at all. The round page reaches the same
      answer from the same inputs in these windows.
- [x] 1.6 **The round page is unaffected by construction** — every edit ADDED an alternative to a
      selector and changed no declaration, and `:is()` leaves the specificity a class pair. Not
      re-verified live: no round game is running, and getting one would restart the server and cost
      the analysis fixture.

## 2. The movelist takes a horizontal scrollbar

- [x] 2.1 **Measured** on the same window: the movelist is 284px wide, `clientWidth` 276 after the
      vertical scrollbar takes 8, and `scrollWidth` **281** — a horizontal scrollbar over a 5px
      overflow.
- [x] 2.2 **Cause found, and it is in the SHARED widget, not in an analysis-page copy.** `move-bug`
      is `flex: 0 0 calc(25% - 3ch)` with `max-width` to match and `white-space: nowrap`, and
      declares no `overflow`. Long moves spill: cells measured at `scrollWidth` 47, 45 and 53
      against a 43px box. No child extends past the container's right edge, so this is cell content
      overflowing its own box, not a row that is too wide. `overflow-x` computes to `auto` because
      `overflow-y` is `auto`, so the spill becomes a scrollbar.
- [x] 2.3 **Established why the round page looks fine.** The same rules apply there — the defect is
      latent on both pages. That column is wider and above 800px the font also drops to `0.68vw`, so
      its cells more often contain what they were given. A difference of degree.
- [x] 2.4 **Decided: none of those — the type is sized to the box so nothing is ever too wide.**
      Nikolay's question on 2026-08-29 was why clip at all, and the measurement says he is right to
      ask: the shortfall was 18px on a 35.4px cell, so clipping would have hidden a third of the
      widest move. The cell rule is `25% - 3ch`, and `1ch` is a FONT unit — so the counter beside
      the move grows with the type and takes the growth out of the cell. The cell gets SMALLER as
      the font gets bigger, which is why no fixed font can be correct at every width.
- [x] 2.5 **Fixed with container query units, CSS only.** `#movelist` on both pages becomes
      `container-type: inline-size`, and `move-bug` takes `font-size: min(4.2cqi, 16px)` with
      `padding-left: 0.4ch`. `1cqi` is one percent of the container's inline CONTENT box, which
      EXCLUDES a vertical scrollbar — so the character budget per cell is constant at every width
      and the type follows the width down the moment a scrollbar takes its 8px. That is the
      re-measure Nikolay asked about, done by the browser as part of layout, so it cannot get out
      of step the way a JS-measured value could.

      4.2 is measured, not chosen. On the 247px panel: 7.1px spare on a six-character move
      (`Ngxf7+`) and a seven-character one still fits; 4.5 leaves 3.2px and fails at seven; 5.5
      overflows this game's own moves. The `16px` cap is about the type not growing absurdly on a
      wide movelist — never about fitting. Padding moved from a constant 6px to `0.4ch` because a
      constant beside a scaling length was eating a fifth of the cell at small sizes.
- [x] 2.6 **Re-checked 2026-08-30 against a live game, in all three modes.** The blocker was the
      absence of a round game; a bughouse simul (`ZdoeZseB`) was played to the standard line — five
      plies on each board, a capture on each, so the movelist holds real moves rather than none.

      | window | mode | movelist | clientW | scrollW | h-overflow | cell font | worst cell overflow |
      |:--|:--|--:|--:|--:|--:|--:|--:|
      | p1 1701x735 | tall landscape | 340.3 | 340 | 340 | **0** | 14.29px | 0px |
      | p3 1276x551 | short landscape | 386.3 | 386 | 386 | **0** | 16px (capped) | 0px |
      | p4 386x835 | portrait | 218.7 | 219 | 219 | **0** | 9.18px | 0px |

      **The appearance change is real and it is an increase, not a shrink.** The old `0.68vw` would
      have drawn 11.57px at 1701 and 8.68px at 1276; the container ratio draws 14.29px and 16px.
      The cap does the work at 386px of panel, where 4.2cqi would ask for 16.2px. Four move-pairs
      per row in every mode, which is the shape the cell rule assumes.
- [x] 2.7 **Verified, with a vertical scrollbar present in both cases:**

      | window | panel | `clientWidth` | `scrollWidth` | cell font | widest cell overflow |
      |:--|--:|--:|--:|--:|--:|
      | p1 1276x551 landscape-short | 255px | 247 | **247** | 10.7px | 0px |
      | p4 386x835 portrait | 219px | 211 | **211** | 9.2px | 0.1px |

      Also confirmed the row packing the cell rule assumes is real: rows hold up to four
      counter+move pairs, 123.6px for two and 247px for four, so `25% - 3ch` is the right cell and
      no layout change is needed.
- [x] 2.8 **Judged 2026-08-30: keep it. The row is the unit, and the font follows from it.**
      Nikolay's decision, and it settles the trade this item posed rather than balancing it: **a
      movelist row SHALL always hold exactly four move cells.** Fewer pairs per row is not a
      cheaper way to buy type size — it is the thing that makes the list meaningless, because the
      row is what lines the two boards' moves up against each other.

      So 9.18px in portrait and 14.29px in the tools column stand as measured. They are the honest
      consequence of four pairs across a 219-340px panel, they fit with nothing clipped and no
      scrollbar, and the two pages agree on them. Any future complaint about the size is a
      complaint about the panel's width, not about the row.

## 3. Further items

### Item 3 — `under-board` is hidden by rule in two modes and by falling off the page in the third

- [x] 3.2 **Measured 2026-08-30**, round page, short landscape (p3 at 1276x551, game `ZdoeZseB`).
      `main.round.bug` has rows `546.719px 34.0208px 0px` with an 11.0267px row-gap, so below the
      app it reserves **34px of row plus two gaps for an 11px element** — `<under-board>`, holding
      `div.ctable-container` (11px, the crosstable) and `#janggi-setup-buttons` (0px, which no
      bughouse game uses). The document comes out 603px against a 551px viewport: **52px taller
      than the screen**. The app itself is innocent — `.round-app.bug` is 546.7px and fits.

      **The other two modes state `display: none` on the same element.** Portrait does it at the
      top of its block, tall landscape repeats it and zeroes the row-gap as well. Only short
      landscape leaves it displayed, and the stylesheet says so on purpose: *"Short landscape makes
      the same trade by letting this element fall past the fold and clipping it; portrait says so
      explicitly."*

- [x] 3.3 **Corrected: it does NOT scroll for the reader, and the first report of this said it did.**
      `body` is `overflow-y: hidden` and that propagates to the viewport, so there is no scrollbar
      and no wheel or keyboard scrolling. A programmatic `scrollTo(0, 200)` does move the page, and
      it stops at **51.33px** — which is how the 52px was found, and all it proves is that the box
      is there, not that anyone can see it.

- [x] 3.5 **FIXED 2026-08-30 by removing the element, on Nikolay's call that it looked like a
      remnant. It was one.** `client/two-board/round/round.ts` no longer emits `under-board`, and
      the two `display: none` rules that existed only to suppress it are deleted with it.

      **Checked before removing, not after.** Nothing in `client/two-board/` references
      `.ctable-container` or `#janggi-setup-buttons`; the only code that fills either is
      `client/roundCtrl.ts`, the ONE-board controller, and this page runs
      `RoundControllerBughouse extends TwoBoardController`, which never touches them. The two-board
      ANALYSIS page emits no `under-board` at all and wants for nothing.

      **A second cause surfaced once the box was gone**: the document was still 18px too tall,
      because `main.round.bug`'s remaining row-gaps are charged between rows that are 0px —
      `546.719px 0px 0px` with two 11.03px gaps. Tall landscape already sets `row-gap: 0` for
      exactly this and says so; short landscape did not. Added there.

      | window | mode | before | after |
      |:--|:--|--:|--:|
      | p3 1276x551 | short landscape | doc 603 vs 551 — **52px over** | doc 551, **0 over**, max scroll 0 |
      | p1 1701x735 | tall landscape | doc 735, 0 over | doc 735, **0 over**, boards 533.3/298.7 unchanged |
      | p4 386x835 | portrait | doc 835, 0 over | doc 835, **0 over**, column 355.3 + own 480 unchanged |

      **The crosstable was never a cost.** Both stylesheet comments said hiding this element cost
      the crosstable and called it worth revisiting; nothing was ever drawn in it. The comments now
      say so, and record that a crosstable here is a feature to BUILD rather than something these
      rules took away.

- [x] 3.4 **The item, as first written: a divergence in mechanism rather than a visible fault.** All three
      modes reach the same outcome — no crosstable — but two say it and one lets a 52px tail hang
      off the document and relies on the viewport clipping it. That is worth closing because it is
      free to close (`display: none`, the rule the other two already carry) and because the tail is
      only invisible for as long as `body`'s `overflow-y: hidden` keeps propagating: anything that
      later gives the page a scroll container, or a browser where that propagation does not hold,
      turns it into 52px of dead space under the board.

      **Not fixed here.** The stylesheet's comment presents the difference as deliberate, so the
      question is whether it was a decision or an omission — and the answer belongs to whoever
      wrote it, not to a measurement.

- [x] 3.1 **Appended as found, and the list is CLOSED 2026-08-30 by decision** — three items, each
      measured, fixed and verified. Closing is deliberate, as section 0 requires: the list does not
      close merely because the last item is done.

      A finding was noted here and then WITHDRAWN, which is worth keeping so nobody re-opens it.
      The live game `ZdoeZseB` ended at status 6 (FLAG) and it looked at first like a defect. It is
      not: the container's clock runs 3 hours behind the host, and once the two are lined up the
      last move was at 06:59:36 and the flag arrived at 07:58:31 — **58m55s of an untouched
      60-minute clock**, while this change's openspec work was being done. A player on move flagged
      because nobody moved for an hour. Correct behaviour.

      Two things made it look otherwise, both of them reading errors rather than evidence:
      the log line's `Test–FersAlfilRook` prefix is a context tag, not the sender — the same log has
      a close line carrying that prefix while naming `Test–DragonHorseGold` in its text — so it is
      no proof a spectator sent the flag; and the `clocks: [-1, -1]` in the reconnect's
      `movesQueued` is the client's "no value here" convention, with the server supplying the real
      times ([3600000, 3590410]) in the `play_move` line directly below. Each item: what was seen, the measurement that identifies it, the mode it
      was measured in, then the fix and its verification.

## 4. Close out

- [x] 4.1 **Frontend gates green 2026-08-30**: `yarn typecheck` clean, `yarn test` 48 suites /
      262 tests. Both items stayed CSS-only as expected, so no Python gates apply.
- [x] 4.2 **Verified together on both pages, 2026-08-30.** Item 2 is in the table at 2.6 — no
      horizontal scrollbar anywhere, on either page, in any mode. Item 1 read from the elements that
      actually declare it, `.bug-own-stack` and `.bug-partner-stack`, rather than from the app:

      | page / window | stack | room | gap | labels |
      |:--|:--|:--|--:|:--|
      | round p1 1701x735 | own | `675px - 10 * 66.671875px` = 8.3px | **0px** | on the squares, 20px, `--cg-light` |
      | round p1 1701x735 | partner | `675px - 10 * 37.337890625px` = 301.6px | **16px** | outside, 12px |
      | analysis p2 1701x733 | own and partner | `673px - 10 * 53.337890625px` = 139.6px | **16px** | outside, 12px |

      **Both branches appear on one page at once**, which is the strongest form this check can take:
      p1's own board has 8.3px of room, under the 12px floor, so its labels go on the squares, while
      its partner board on the same screen has room and puts them outside. The two pages are running
      one rule against different board sizes, not two treatments — and the arithmetic is live on the
      analysis page (`--bug-coord-capped` resolves on the stack), which is what 1.3b was about.

      A caution for the next reader: `--bug-coord-gap` read from `.round-app.bug` or
      `.analysis-app.bug` answers `0px` on every page in every mode. It is a registered `@property`
      and that is its initial value; the variables are declared on the two stacks. Reading the app
      looks like "no room everywhere" and means nothing.
