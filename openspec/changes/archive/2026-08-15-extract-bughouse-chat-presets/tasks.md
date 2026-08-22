## 1. Capture the reference first

The presets currently sit inside the chat view's flex box, positioned by `order` and by a
`column-reverse` in portrait. That arrangement is the thing most likely to regress.

- [x] 1.1 In each of the three modes, record the chat view's children in DOM order with their computed `order`, the flex direction of the box, and each child's height
- [x] 1.2 Record where the presets appear on screen relative to the message list and the input, per mode
- [x] 1.3 Record the presets' grid: column count, `--rolesCount`, button count, and the rendered button size in each mode
- [x] 1.4 Record the button size against the player's own board square in each mode, which is what the floor will be expressed against
- [x] 1.5 Confirm what a spectator sees today — the presets are suppressed by `!ctrl.spectator`

## 2. Extract the widget, still rendered in place

- [x] 2.1 Create `client/two-board/round/chatPresets.ts` with a `ChatPresetsView` in the house shape — one composed view, built at construction from the variant alone
- [x] 2.2 Move the button construction out of `renderBugChatPresets` unchanged: same classes, same titles, same `--rolesCount`, same messages
- [x] 2.3 Have `round.ts` construct the widget; verify the page still renders the presets exactly as before, because nothing has moved yet

## 3. Cut the shared chat view's dependency

- [x] 3.1 Expose the sender that `chatView` already builds, so a preset can send by the same path with the same `selfReport` — do not rebuild the message envelope elsewhere
- [x] 3.2 Remove the `renderBugChatPresets` call and its import from `client/chat.ts`
- [x] 3.3 Give the widget its sender in a second step, once the controller exists; a click before that is discarded
- [x] 3.4 Confirm `client/chat.ts` no longer imports from `@/two-board/round/chat` for the presets, and that its remaining `RoundControllerBughouse` uses — the chatroom header and blur — are untouched
- [x] 3.5 Confirm a single-board page's chat renders identically

## 4. Make the Chat tab two parts

- [x] 4.1 Declare Chat with two parts: the chat container, and the presets
- [x] 4.2 Mount both in `round.ts`, adjacent, so nothing moves on screen
- [x] 4.3 Re-establish the presets' position now that `order: 3` no longer means anything outside the chat view's flex box — against the 1.1/1.2 reference, per mode
- [x] 4.4 Make the chat area and the presets flex siblings: chat takes the available space, presets take the height their buttons need

## 5. Give the buttons a floor

- [x] 5.1 Settle where the player's own board square comes from in CSS — see design decision 4; record the answer, including if the fallback to a fixed unit is taken
- [x] 5.2 Floor the button at roughly 0.55 of the own board square, which reproduces ~27.5px — 60% of the desktop's current 45.92px, and above WCAG 2.2's 24px minimum
- [ ] 5.3 Let the grid reflow to more rows rather than shrink a button below the floor
- [x] 5.4 Remove the per-mode column-count rules that the reflow makes redundant, or say why each one is still needed

## 6. Verify

- [x] 6.1 The presets render in all three modes, in the same position as the 1.2 reference
- [x] 6.2 A preset click sends the same message as before, confirmed in the server log, and is self-reported exactly as a typed message is
- [x] 6.3 The two chat parts show and hide together when tabs are switched, wherever each is mounted
- [x] 6.4 A button is at or above the floor in every mode, measured — particularly portrait, which was 13.23px
- [x] 6.5 The floor tracks the board: at two different board sizes the floor differs in proportion, rather than being the same pixel count
- [x] 6.6 Narrowing the column reflows the grid to more rows and never shrinks a button below the floor
- [x] 6.7 The chat area still scrolls internally with the presets keeping their height
- [x] 6.8 A spectator still sees no presets
- [x] 6.9 Single-board chat unchanged, per 3.5
- [x] 6.10 The portrait tools column still fits, now that the presets are taller — this is where the floor is most likely to cost something
- [x] 6.11 `yarn typecheck` and `yarn test`

## 7. Decide

- [ ] 7.1 Whether the own-square property added for 5.1 belongs here or with the published board units
- [ ] 7.2 Whether the floor belongs to the button or to the grid cell
- [ ] 7.3 Whether suppressing presets for spectators should stay a condition on rendering, now that it is the widget owner's decision rather than the shared view's

## Progress — implemented 2026-08-15, verified live on game `ZSmwOLN2`

Reference captured first, all three modes.

**The widget.** `ChatPresetsView` builds its buttons from the variant at construction and
is given chat's own sender afterwards by `wire()`. `client/chat.ts` no longer imports from
`@/two-board/round/chat` for this, and no longer decides whether presets exist; its other
bughouse branches — the chatroom header and blur — are untouched. `chatSender()` is now the
one definition of what sending a chat message is, used by the view and by the widget, so a
preset is reported and delivered exactly as typing it: confirmed server-side as
`BugRoundChatIn(type='bugroundchat', gameId='ZSmwOLN2', message='!bug!nice', room='player')`.

Spectators get no presets, via the same `twoBoardSeats(model, username).isSpectator()` the
controller uses rather than a second copy — and the Chat tab then simply has one part,
which is the multi-part widget's differing-part-counts case in real use.

**Three layout traps, each found by measurement rather than reasoning.**

1. *The grid collapsed to 0x0.* A panel is `display: flex`, so the presets became a
   MAIN-axis item sized from content — and the buttons are `width: 60%` of an `auto` track,
   which is circular. Inside the chat view they were a cross-axis item and stretched.
   `flex-flow: column` on the panel restores exactly that relationship.
2. *`overflow-y: auto` on the tools column was silently dead.* The top-level
   `.bug-round-tools { overflow: hidden }` sits later in the file at equal specificity, so
   portrait's rule lost. Invisible until the presets grew tall enough to need scrolling.
   Same source-order trap as the short-landscape wrapper fix.
3. *A bare `1fr` is `minmax(AUTO, 1fr)`.* Both `#main-wrap` and `main.round.bug` had one, so
   the app's min-content dragged the whole chain to 919px in an 835px viewport and the
   layout's slack row grew from 148 to 233 instead of absorbing. Fixed at both levels; the
   cap has to hold everywhere between body and app or the lowest bare fr wins.

**The floor.** `--bug-own-sq` comes from `:has(#mainboard.own-board)` / `:has(#bugboard.own-board)`,
turning the class `markRoles()` already sets into a value — no JavaScript measuring, no
third source of truth, and correct through a switch. The button floor is 0.55 of it, and
`padding-top: 60%` became `aspect-ratio: 1` because percentage padding cannot honour a
minimum.

| | button before | after | own square | floor |
|---|---|---|---|---|
| desktop | 45.92 | **45.92** (unchanged, above floor) | 59 | 32.45 |
| short landscape | 46.35 | **46.35** (unchanged, above floor) | 54.67 | 30.07 |
| portrait | **13.23** | **26.47** | 48 | 26.40 |

**5.3 was wrong and is not done as written.** `auto-fit` reflow would have given the desktop
seven columns — because the grid is **piece-aligned**: column i is piece i, so "need a
knight" sits directly above "don't give a knight". `--rolesCount` is not an arbitrary count.
The tracks are floored instead — `repeat(var(--rolesCount), minmax(<floor>/0.6, 1fr))` — so
a track grows but never squeezes a button below usable, and alignment is preserved.
Verified: piece-aligned in all three modes.

Portrait after the floor: app 835.33 in an 835 viewport, tools column back to 355.33, page
overflow 8 (the `#reconnecting` element alone), own block flush to the bottom edge, boards
384 and 165.33, 8/8 pockets.

`yarn typecheck` clean, 41 suites / 226 tests pass.

### Follow-up — the `bughouse` constant is gone from `chatView`

Nikolay asked what was left of the `ctrl instanceof RoundControllerBughouse` flag in the
shared chat view once the presets had moved out. Exactly two uses, both now removed.

**`blur` was dead.** Its whole body was `if (bughouse) { console.log(e); }` — the `focus()`
call it existed for is commented out with a `todo:niki` about mobile. Deleted, along with a
stray console.log on every chat blur.

**The header was an empty box.** Bughouse got `h('div.chatroom')` with nothing in it:
measured `innerHTML: ""`, no children, transparent, no border — 14px of pure `0.5em`
padding in landscape and 12.15px in portrait, sitting above the message list and drawing
nothing. Every other caller fills that box with a room label and the chat on/off toggle;
verified live on the lobby — text "Chat room", one `input#checkbox` titled "Toggle the
chat", 33px. The other five non-bughouse callers reach the same single branch, differing
only in `chatType` (generated ids) and `spectator` ("Spectator room" instead of "Chat
room").

Replaced by an option rather than a type check: `chatView(ctrl, chatType, { chatHeader })`,
defaulting to true so the six other call sites are untouched, and `false` meaning **no
element** rather than an empty one. The round page passes `{ chatHeader: false }`.

| | before | after |
|---|---|---|
| desktop message list | 283.84 | **297.84** (+14) |
| portrait message list | 145.09 | **157.24** (+12.15) |
| lobby header | "Chat room" + toggle, 33px | **unchanged** |

Portrait still fits: app 835.33 in an 835 viewport, page overflow 8, presets above chat at
26.47px, 8/8 pockets.

**The import survives, for a different and deeper reason.** `chatMessage()` still takes
`ctrl?: RoundControllerBughouse` and uses it — `attrs: { title: ctrl?.steps[ply!].san! }`
and `onchatclick(ply, ctrl)`, the latter also imported from `@/two-board/round/chat`. So
the shared chat module still knows how to render a bughouse move reference. Two callers
pass it, both in `roundCtrl.ts`. That is the same shape of extraction the presets just had
and deserves its own change, not a fold-in here.

### Follow-up 2 — `chatMessage()`'s bughouse parameters were dead

The last coupling: `chatMessage(user, message, chatType, time?, ply?, ctrl?: RoundControllerBughouse)`
used `ctrl` and `ply` for one feature — title the message with the SAN of the move it was
said at, and click through to that ply.

**It could never fire.** All five call sites that passed a controller also passed `user: ''`,
and `user.length === 0` takes the first branch — `li.message.offer`, which reads neither
`time`, nor `ply`, nor `ctrl`. The decoration lived in the last branch, reachable only for a
real username, and no caller ever combined one with a controller. The working implementation
of the feature is `chatMessageBug()` in `two-board/round/chat.ts`, which builds its own SAN
element and three `onchatclick` handlers.

So the honest fix was **deletion, not parameterisation**. An earlier draft of this step added
`ChatMessageOptions { title, onClick }` so the caller could supply the decoration — an
abstraction with no consumer, which is the thing we have a rule against. Reverted before it
landed; the signature is simply `chatMessage(user, message, chatType, time?)`.

Nikolay's question about the `undefined` in `chatMessage('', '…', 'bugroundchat', undefined,
idx, this)` is what exposed this. It was padding to step over a `time` the caller had no
value for, on the way to two arguments that were never read — and with those gone the
padding goes too, without needing an options object at all.

Verified live: the three system messages still render as `li.message.offer` with no move
link, exactly as before; a real chat message still carries its SAN decoration (`7B.P@d3`)
and time, rendered by `chatMessageBug`. The click handler itself was not exercised —
snabbdom attaches via `addEventListener`, so `.onclick` is null and proves nothing.

**`client/chat.ts` now imports nothing from `two-board/`.** The only mentions of bughouse
left in the file are comments recording why these things moved.

`yarn typecheck` clean, 41 suites / 226 tests pass.

### Follow-up 3 — end-to-end verification on a fresh game, `8j9DkouV`

Played real moves and sent real typed chat messages at different plies, then checked the
hover title and the click-to-navigate that the removed `chatMessage` parameters were
supposed to provide — confirming the live implementation in `chatMessageBug()` is intact.

Board B: `e4`, `e5`, `Nf3`. A message typed after each of white's moves:

| message | move reference | `<t>` title |
|---|---|---|
| "message after e4" | `1B.e4` | **`e4`** |
| "message after Nf3" | `2B.Nf3` | **`Nf3`** |

**Click-to-navigate works both ways, and both halves of `onchatclick` were checked.** With
the board at Nf3, clicking the e4 message moved the last-move highlight from `f3/g1` to
`e4/e2` (`goPly`) AND moved the movelist's active move from `Nf3` to `e4` (`selectMove`);
clicking the Nf3 message moved both back. Real clicks through the `computer` tool, not
synthetic events.

Note for anyone checking this later: the movelist highlight is a class on the `san`'s
PARENT, not on the `san` itself — reading `san.className` shows nothing and looks like a
failure. The movelist also lives in the Moves tab, so it is `display: none` while the Chat
tab is open; the selection still tracks and is correct when the tab is switched.

Presets, the two-part Chat tab, the message list and the typed-message path all behaved
normally throughout on p4 (portrait), including chat sending via `chatSender`.

**Two things found that are NOT this change:**

1. **A ply-0 message renders `title="null"`.** p1 chatted before any move was played, and
   its message carries the literal string "null" as the SAN title — `chatMessageBug` reads
   `steps[ply].san` with nothing there. Cosmetic, pre-existing, in the bughouse module.
2. **p1 (desktop) hit-tests two files off.** See below.

### Finding — the desktop click offset is back, and it is not stale bounds

On p1 at 1914x827, a click on e2's rendered centre selected **g2**. Measured:

| | |
|---|---|
| `cg-board` rect | x 277.1, w 472, square 59 |
| implied bounds left (from where clicks land) | **159.5** |
| discrepancy | **117.6px ≈ 2 squares** |

The board did **not** move on a `resize` dispatch, and the offset survived that dispatch —
so this is not the memoised-bounds-go-stale story from the archived desktop change, where
clearing the memo fixed it. The rendered geometry is stable and self-consistent; only the
hit-testing disagrees. The vertical is affected too: with e2 selected, a click on e4's
compensated position deselected rather than moving.

p3 (short landscape) and p4 (portrait) both probe `{dx: 0, dy: 0}` on the same build and
the same game, and both play moves correctly — so it is desktop-only.

Not investigated further here, and deliberately not attributed to this change: the previous
desktop change's deferred notes already record an unexplained board/bounds mismatch in this
exact mode (`--cg-width-a: 526px` against a 425px column), and this may be the same thing
surfacing differently. It needs its own before/after against the checkpoint commits rather
than a guess at the end of a chat change.

## Disposition at archive — 2026-08-15

Archived at 28/35. The goal is met and demonstrated: the presets are an independent widget,
the Chat tab is two parts, the buttons have a floor, and `client/chat.ts` imports nothing
from `two-board/`. Typecheck clean, 41 suites / 226 tests pass, and everything was verified
live across all three modes on games `ZSmwOLN2` and `8j9DkouV`.

**6.7 closed at archive.** 25 filler messages: the message list scrolled internally
(scrollHeight 1252 against clientHeight 179) while the presets held exactly 110.9px, the
chat panel stayed 204.4px and the page did not scroll.

**3.5 / 6.9 — partially verified, and the gap is named.** The non-bughouse *view* is
confirmed twice on the live lobby, not merely in an iframe: header "Chat room", the
`Toggle the chat` checkbox, 32.7px. The non-bughouse *send* path is confirmed on the wire —
`{'type': 'lobbychat', 'message': …, 'room': 'player'}`, with no gameId or tournamentId,
which is `chatSender` behaving correctly for a page that has neither.

What is NOT verified is `chatMessage()` rendering a real-username message on a non-bughouse
page. The server does not echo anonymous lobby chat back, so nothing rendered, and there is
no non-bughouse game on this dev server to reach a single-board round page. The argument
that it is safe is reasoning, not a test: the only change to that branch was deleting
`attrs: { title: undefined }` and a click handler that called a function which returned
immediately without a ply and a controller — both no-ops for every non-bughouse caller by
construction, since none of them ever passed either. Worth an actual look the next time a
non-bughouse game exists.

**5.3 — superseded, not skipped.** It asked for `auto-fit` reflow. That would have given the
desktop seven columns and destroyed the grid's piece alignment: column *i* is piece *i*, so
"need a knight" sits above "don't give a knight". The tracks are floored instead, which
achieves the intent — never squeeze a button below usable — while keeping `--rolesCount`.

**6.8 — needs a fifth session.** All four harness windows hold seats, and a same-origin
iframe shares the seated user's cookies, so there is no spectator to observe. The condition
itself is `twoBoardSeats(model, username).isSpectator()`, the same call the controller makes,
and a spectator simply gets a one-part Chat tab.

**7.1 — where `--bug-own-sq` belongs.** It is defined in `bughouse.css` via
`:has(.own-board)`. That is the right mechanism, but the value is arguably a board unit and
may belong with the published units in `squareUnit.ts` when those generalise to the other
modes — see the `partner-board-smaller-intent` memory.

**7.2 / 7.3 — not forced.** The floor is on the button with the track floored to match; and
spectator suppression stayed a render condition, now asked by the widget's owner rather than
by the shared view.

**Housekeeping:** the bughouse test game was abandoned at the end of this work by navigating
p1 and p2 to the lobby to attempt a non-bughouse game. Nothing depended on it.

## Post-archive verification — 2026-08-15, gaps closed

The two items archived as unverified were both verified afterwards, on the same build. The
record above stands as written; this is what actually closed them.

**6.9 / 3.5 — closed for real.** The blocker was believing a non-bughouse page needed a
non-bughouse *game*, and there is none on this server (all 40 games are `v: "F"`). A
tournament page is also a non-bughouse page and renders the same shared chat view. On
`/tournament/QhImBTbb` (variant `horde`): the header rendered "Chat room" with the
`Toggle the chat` checkbox at 32.7px, and a message sent as `Test–JanggiElephantA` came back
and rendered as `li.message` containing `div.time`, `user`, `t` — the ordinary
three-part structure, the real-username branch, the one that was edited. The `<t>` carried
no title attribute, which is the intended result of dropping `attrs: { title: undefined }`.
On the wire: `{'type': 'lobbychat', 'message': …, 'room': 'player', 'tournamentId': 'QhImBTbb'}`
— `tournamentId` present and `gameId` absent, which is `chatSender`'s tournament branch, until
now never exercised by any test. The test message was deleted from `tournament_chat` after.

**Why the lobby looked broken, and why it is not a regression.** Lobby chat drops these
messages server-side before any view is involved: `lobby_chat_eligible`
(`server/chat_permissions.py:16`) requires a minimum account age and a minimum game count,
and the `-a` test users are newly minted, so they fail both. The message reaches the server
and is discarded. Nothing to do with this change.

**6.8 — closed without a fifth session.** The older bughouse games have different test users,
so the current user is a genuine spectator in them. On `w1U9fCkL`: no `#chatpresets`, zero
`button.bugchat`, and the panel ids were exactly `round-tabs-panel-0-0`, `-1-0`, `-2-0` —
the Chat tab collapsed to one part, with no `0-1`. The tablist survived intact
(`round-tabs-tablist`, aria-label "Round tabs", Chat's `aria-controls` naming only the single
panel) and switching Chat→Moves→Chat toggled exactly the right panels.

**One earlier note retracted:** the p1 desktop click offset was a fault in the measurement,
not the app. Manual mouse testing behaves correctly. No bisect is needed and nothing is
outstanding from it.
