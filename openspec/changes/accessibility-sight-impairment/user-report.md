# The user's report — verbatim, and what it settles

Three messages from a blind user, received 2026-09-26 via Nikolay. **This file is the authority for
this change.** Design Decision 1 says their words outrank the design's general knowledge, and
several things below overturn assumptions the design made before reading them.

Quoted rather than paraphrased on purpose: the emphasis is the data, and their ordering is the
ranking we were missing.

---

## 1. Who they are

> *"I'm complete blind user and i'm blind since birth"* — and, said twice and once as a correction:
> *"I am not programmer"*.

They built their own .NET application to play variants accessibly, motivated by wanting *"even more
accessible softwere than winboard 4.5 jaws/nvda"* — **WinBoard 4.5 with JAWS/NVDA is the incumbent
they are measuring against**, and it is worth knowing that is the bar in this community.

Their app covers *"chess, frc, crazy house, capablanca, capahouse, grand chess, orda, shogi, shogun,
and few other"* and is built on **Fairy-Stockfish from GitHub — the same engine pychess uses.**

**Every one of those variants already exists in pychess** (checked: crazyhouse, shogi, shogun,
seirawan, grand, orda, capablanca, capahouse all present in `client/variants.ts`).

They say plainly what they cannot do: *"i can use Pychess either for speaking here, or ... to read
the rules of unknown chess variant to play via my own created program."* They read our rules pages
and then go and play elsewhere.

## 2. The assistive stack — this ANSWERS task 1.3

Named by them, in their own words:

| Tool | Platform | Notes |
|---|---|---|
| **NVDA** | Windows | Named in all three messages. The primary. |
| **JAWS** | Windows | Via the WinBoard 4.5 comparison. |
| **TalkBack** | Android | Named twice, as a first-class target, not an afterthought. |
| **Jieshuo** | Android | Named alongside TalkBack. **We know least about this one — verify its focus-mode behaviour rather than assume it matches TalkBack.** |

**Decision 2's default was right: NVDA is the one to test against.** What the design did NOT
anticipate is that **Android is a named target**. Mobile screen-reader support was not on anyone's
list and it is on theirs.

## 3. THE KEY TECHNICAL INSIGHT — browse mode vs focus mode

This is the most valuable thing in the three messages, and it is the part a sighted developer is
least likely to arrive at unaided.

> *"I think it's enough just to add advanced aditting field when all hotkeys including navigation on
> the board will be in a focus mode and all another interface will be in browse mode, via NVDA you
> can switch between it pressing capslock+space and to return back to browse mode pressing
> capslock+space again, on android you can using keyboard and talkback press cmd key twice and move
> between focus and browse"*

A screen reader has two modes. In **browse mode** it intercepts the arrow keys to move through the
document, so an application's own arrow-key handling never sees them. In **focus mode** keystrokes
pass through to the page. The toggle is NVDA+space (their "capslock+space" — capslock is the NVDA
modifier in the laptop key layout).

**The consequence for us is concrete and it decides the architecture.** Board navigation by arrow
keys cannot work as a global key binding on the page: browse mode swallows it. It needs a focusable
element that puts the screen reader into focus mode — a real widget with a role the screen reader
recognises, which is what they are describing as an *"advanced editing field"* or a table.

**This also flags a live risk in code we already have.** `client/pocketHotkeys.ts` binds number keys
1–9, 0, -, = through Mousetrap to select pocket pieces (lichess-compatible for crazyhouse, extended
to Cannon Shogi's eleven roles). Those are global bindings on the document. In browse mode a screen
reader user pressing `1` gets "navigate to next heading level 1", not a pocket piece. **The feature
exists and is unreachable for exactly the users who most need keyboard input.**

## 4. What they want, in their own ordering

From message 1, describing what their own program does:

> *"to navigate through the board using NVDA, to navigate using the arrows throughout all board,
> navigation keys to listen, what was the last move, which piece attack this cell, what time remains
> for players, A mirrored reflection of the board, cast from the side of the black pieces, short
> help for active chess variant, ability to write move in time it's faster"*

From message 3, the same list restated as what a site needs:

> *"ve should have hotkeys or buttons corresponding to game time, last moves, list of moves, possible
> moves, white or black pieces"*

Consolidated:

1. **Arrow-key navigation of the board**, announcing the piece on the current square.
2. **Last move** — on demand.
3. **Which pieces attack this square.**
4. **Clock** — time remaining for both players.
5. **Board flip** — *"a mirrored reflection of the board, cast from the side of the black pieces"*,
   so a black player navigates from their own side.
6. **Short help for the active variant** — notable, and specific to a variant server. They already
   use our rules pages this way.
7. **Move entry by typing** — *"ability to write move in time it's faster"*.
8. **List of moves**, **possible moves**, **white or black pieces** (locate all of one side).

### Pockets, described precisely

> *"in pocket variants, like shogi, shogun and crazyhouse I added pockets white from the left of "A"
> vertical and black on the right of "H/I/J" verticals depending of variant"* ... *"in pockets you
> can navigating by vertical arrows navigate through queen, bishop, knight"*

So pockets sit **in the same navigable space as the board** — white's off the left edge of the a-file,
black's off the right edge of the last file, whatever that file is for the variant's width. Vertical
arrows move through the roles. This is a spatial model, not a separate widget, and it is worth
copying exactly because it came from years of their own use.

## 5. THE HEADLINE FINDING

> *"on veb site there isn't even editor to enter the move using NVDA for windows or Talkback/jieshuo
> screen reader"*

**There is no way to enter a move at all.** Confirmed in the codebase: zero occurrences of
`keyboardMove`, `blindMode` or `screenReader` anywhere in `client/`, `server/` or `templates/`.

This is not "hard to use". It is a floor, and it is the reason the site is unplayable rather than
merely awkward.

## 6. They pre-authorised the smaller scope

This matters for the proposal's whole framing, and it comes from them rather than from us:

> *"At the Lichess it's perfect realisation, but in the case it's too hard to make such
> accessibility the main blind need to have a board and elements connected with player accessible
> for screen reader ... as alternative i propose you to make a table or another element, when the
> blind user can operate all the board."*

They have named the minimum themselves: **a board and the player-connected elements readable by a
screen reader, as a table or similar.** Lichess's full solution is the ideal; the table is the
acceptable alternative they are asking for. Nikolay's "maximum impact, minimum change" and the
user's own fallback are the same target.

## 7. Why this is worth more to pychess than to another site

> *"till now blind users have not comfort chess server to play shogi, grand, orda, seiravan
> variants, exploding Capablanca trillers"*

Lichess solved accessibility for standard chess. **Nobody has solved it for the variant space that
is pychess's entire reason to exist.** A blind player who wants shogi, grand chess, orda, seirawan
or Capablanca has nowhere to go — which is precisely why this user wrote their own program.

That is a real and unusual position: the work is not catching up to lichess, it is the first of its
kind in the variant space.

## 8. Two things needing an answer from Nikolay, not from code

They asked directly: *"Please, give me an answer on both proposals."*

- **They offer their .NET/C# project** as a donation or as a reference. **pychess is AGPL-3.0**, so
  taking code would need the project's licence to be compatible and its provenance clear. But note
  what they actually suggest: *"maybe here are programmers wanting to realize it as python or
  another programm"* — they are offering it *"sooner like an example of keyboard navigation design"*.
  **Its value is as an interaction specification, not as source to port**, and that use raises no
  licensing question at all. Sections 3 and 4 above are already most of that specification.
- **They offer to play on the pychess Discord voice rooms** — *"maybe ve'll play both on different
  boards, maybe without boards at all."*

Both deserve a reply regardless of what this change builds, and the second costs nothing.

## 9. What this overturns in the design

- **Open question "single-board or two-board bughouse?" — ANSWERED: single-board.** They name
  crazyhouse, shogi, shogun, seirawan, Capablanca, grand, orda. **Bughouse is never mentioned.**
  Section 6's deferral of bughouse is confirmed by the user rather than by our convenience.
- **Pockets are in scope and were not on our list.** Four of the variants they name have them, and
  they gave us the exact spatial model.
- **Android is a named target.** Not anticipated.
- **"Short help for the active variant" is a need**, and it is one we are unusually well placed to
  meet — the rules pages already exist and they already use them.
- **The design's guess at the top of the shortlist was half right.** It expected "announce the
  opponent's move" and "read the position" to rank highest. The user's own floor is **move entry**
  and **a navigable board**; announcements are on their list but below those. You cannot play a game
  you cannot move in.
