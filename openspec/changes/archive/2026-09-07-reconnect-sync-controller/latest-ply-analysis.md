# `latestPly` — what it is for, and where it belongs

Asked 2026-09-07, after `this.ply` stopped depending on it (task 3.3b). The question was whether it
belongs in the round controller at all, or is really the move list's business. Recorded before any
change, so the substitution that follows can be checked against it.

## Where it is set

```ts
// roundCtrl.ts:1092 — once per board message, never stored
latestPly = isInitialBoardMessage || msg.ply === this.ply + 1 || (full && msg.ply > this.ply);
```

Its own comment says what it is for: *"the received move should be not only added to the move list,
but also scrolled to in the move list and also rendered on the board"*.

## Its three readers

### 1. The move list's `activate`

```ts
// updateSteps, the SINGLE-STEP branch only
const activate = !this.spectator || latestPly;
updateMovelist(this, false, activate, false);
```

`activate` drives three presentational things inside `updateMovelist`: which `move-bug` cell carries
the `active` class, `activatePly()`, and `scrollToPly()`. All three read `ctrl.ply` — the controller's
own idea of where it is — and none reads the message.

TWO FACTS THAT NARROW THIS FURTHER:

- the FULL branch of `updateSteps` calls `updateMovelist(this, true, true, false)` with `activate`
  hardcoded, so `latestPly` never reaches the move list for a full message;
- `!this.spectator || latestPly` is **always true for a player**. `latestPly` changes the outcome
  only for a SPECTATOR.

### 2. The spectator's board update

```ts
// updateBoardsAndClocksSpectors
this.updateClocks(...);        // always
if (latestPly) {
    board.setState(...);       // position, pocket, sounds
}
```

The spectator's equivalent of `decision.applyPosition`. Never runs for a player.

### 3. Advancing `this.ply` — the only player-facing use left

```ts
if (isInitialBoardMessage || full) this.ply = msg.ply;
else if (latestPly)                this.ply = msg.ply;
```

The `else` runs only when `full` is false, and there:

```
latestPly  ≡  isInitialBoardMessage || msg.ply === this.ply + 1  ≡  (place === 'next')
```

It is `place` under another name.

## The answer

**For a player, `latestPly` has one job left, and `place` already answers it.** Its two real jobs —
activate and scroll the move list, render the spectator's boards — are both presentation for a
SPECTATOR. It is not part of the round controller's own bookkeeping any more, and it stopped being
so the moment `this.ply` was written unconditionally on a full message.

## The trap that stops this being a rename

`place` and `latestPly` are NOT equivalent for FULL messages:

| a full message whose ply jumps ahead by more than one | `latestPly` | `place` |
|---|---|---|
| | **true** | `'ahead'` |

Both are correct, for opposite reasons. A full snapshot that jumps ahead is COMPLETE — there is no
gap in it, so it should be rendered. A SINGLE MOVE that jumps ahead means a move is missing between
what we hold and what arrived, which is branch 2.1.3 and must not be applied. `place` carries
single-move semantics; `latestPly` carries "is this message worth following".

Substituting one for the other wholesale would tell a spectator to ignore a snapshot that skipped
ahead, which is exactly backwards. The substitution is safe ONLY in reader 3, where `full` is false
by construction.

# `this.ply` — the same question, asked one level down

Asked immediately after the above, and the answer is sharper: **`this.ply` is the reader's cursor**,
and everything that classifies messages against it is asking the wrong object.

## Its writes

```ts
// roundCtrl.ts:1126-1127 — a board message
if (isInitialBoardMessage || full) this.ply = msg.ply;
else if (latestPly)                this.ply = msg.ply;

// roundCtrl.ts:1276 — INSIDE goPly, which an arrow key or a click in the move list runs
this.ply = ply;
```

`GameControllerBughouse.ply` (`gameCtrl.ts:44`, `this.ply++`) is a DIFFERENT FIELD with the same
name, per board, incremented when that board sends a move. Nothing below is about it.

So scrolling the move list writes `this.ply`. It means "which ply the reader is looking at", and
`activatePly()` and `scrollToPly()` read it for exactly that.

## Its readers, and what each one actually wants

| reader | wants | gets |
|---|---|---|
| `activatePly`, `scrollToPly` | the cursor | the cursor — correct |
| `selectMove(this, this.ply ± 1)` (arrow keys) | the cursor | correct |
| the analysis link, `?ply=` | the cursor | correct |
| `goPly`'s "no sound when scrolling backwards" | the cursor | correct |
| **`latestPly`** (1092) | the latest ply we HOLD | the cursor |
| **`place`** (1104) | the latest ply we HOLD | the cursor |
| **`sendMove`, `ply: this.ply + 1`** | the game's next ply | the cursor |

The two meanings coincide only while the reader stays at the end, which is why this has never been
noticed.

## What it costs, measured

Branch 2.1.3 asks `msg.ply > this.ply` to mean "a move is missing between what we hold and what
arrived". With the cursor scrolled back it is trivially true, so a reader looking at an earlier ply
turns every arriving move into a reported gap. Scenario **R2** stages it — three moves, one arrow
key, then the opponent moves — and it fails:

    FAIL R2  no_false_gap_warning
             ['[reconnect] board a: 2.1.3 further ahead than the next move; one is missing in between']

Nothing was missing. NOT APPLYING the move is correct and was always the behaviour — a reader
examining an earlier ply must not be yanked forward — but that is a decision about the CURSOR, and
"is a move missing" is a decision about what we HOLD. One field is answering both.

## The right quantity is already in the file

`updateSteps` decides whether a step is new with a test that never consults the cursor:

```ts
if (ply === this.steps.length)     // "is this the next ply we do not have"
```

So the codebase already distinguishes what we HOLD (`steps.length`) from where the reader IS
(`this.ply`) — and the message classification reaches for the wrong one.

A consequence worth recording: once the cursor is the thing being compared, branch 2.1.2 ("older
than what we are showing") is nearly unreachable, because messages arrive at `steps.length` and the
cursor never exceeds it. In T8 it fired only because a rollback left `this.ply` stale. Classified
against `steps.length` instead, 2.1.2 becomes what it should always have been: the duplicate
message.

## THE GOAL, set 2026-09-07

1. **The cursor moves to the move list.** It is move-list state — which cell is active, where to
   scroll, what an arrow key steps through — and the round controller holds it only by habit.
2. **`roundCtrl.ply` stops being the source of truth for the last ply.** `steps.length` is that
   truth, and it is already used as such by `updateSteps`.
3. Every reader in the table above that wants "the latest ply we hold" — `latestPly`, `place`,
   `sendMove` — asks `steps.length`. Every reader that wants the cursor asks the move list.

# DONE 2026-09-07 — classification asks what we hold

`held = this.steps.length`, read before `updateSteps` pushes, now answers both game questions:

```ts
const held = this.steps.length;
latestPly = isInitialBoardMessage || msg.ply === held || (full && msg.ply >= held);
const place: MovePlace =
    isInitialBoardMessage || msg.ply === held ? 'next' : msg.ply > held ? 'ahead' : 'older';
```

and `sendMove` stamps `ply: this.steps.length` rather than `this.ply + 1`.

R2 goes green — `warnings while the reader was scrolled back: none` — and nothing else moves: 26
scenarios pass, jest 321.

# NEXT — `latestPly` becomes a question about the cursor

Nikolay's definition, and it is better than what the code computes:

> **`latestPly` should only determine whether to update the boards, or whether we have scrolled
> away from the last position.**

That is not ply arithmetic. It is `cursor === steps.length - 1` — *is the reader at the end?*

## Why the arithmetic gives the right answer today for the wrong reason

`msg.ply === held` is true when the arriving move is the next one we do not have. If the reader has
scrolled back, that is still true — the game moved on regardless of where they are looking — so
after the change above, `latestPly` would now be TRUE while the reader is scrolled away, and the
boards would be yanked forward. It does not happen only because `msg.ply === held` is evaluated
before `updateSteps` pushes, and the READER's position never enters the expression at all.

So the two definitions currently coincide by accident, and the accident is fragile: it survives
only while nothing else moves the cursor independently of the message stream. `goPly()` does
exactly that, on every arrow key.

## The change

```ts
const readerIsAtTheEnd = this.ply === this.steps.length - 1;
latestPly = isInitialBoardMessage || full || readerIsAtTheEnd;
```

Read as a sentence: follow this message unless the reader has gone looking at something else — and
a full snapshot always wins, because it is a reset of everything the client holds.

## What that changes, and what has to be checked rather than assumed

- **The move list's `activate`** is `!this.spectator || latestPly`, which is always true for a
  player, so only a spectator's scroll position starts mattering. That is the intended behaviour
  and has never been expressible before.
- **The spectator board update** keys off `latestPly` for its `applyPosition`. Under the new
  definition a spectator who scrolls back stops having their boards yanked forward — which is what
  a player already gets and a spectator does not. This is a BEHAVIOUR CHANGE for spectators and
  should be stated as one rather than slipped in.
- **`this.ply` on a single message** would then advance only when the reader is at the end, which
  is right: the cursor should not move under a reader who has scrolled away. It is also what
  happens today, by the same accident.

## Then, and only then, the cursor moves out

Once `latestPly` is expressed in terms of the cursor, the cursor is the last thing the round
controller holds for the move list's benefit, and the two can move together:

- the move list owns the cursor, the active cell, the scrolling and the arrow keys;
- the round controller keeps `goPly()`, because `goPly()` is not scrolling — it repaints BOTH
  boards to a historical position, toggles their playability, and plays a sound. That is board
  work, called from four places (the move list, the arrow keys, a click on a chat message, and the
  analysis tree). Moving it into the move list would put board rendering inside a list widget.

The split that falls out: **the move list decides WHICH ply to show; the round controller knows HOW
to show it.**

## Proposed, not done

- Reader 3 becomes `else if (place === 'next')`, removing `latestPly` from the controller's
  bookkeeping entirely.
- `latestPly` is then passed only to `updateSteps` and the spectator updater, and can be named for
  what it is: whether the SPECTATOR's view should follow this message.

## Left open deliberately

The spectator's own classification. A spectator has no move waiting and no board to shut, so their
tree is a different and much smaller one than branch 1/2 — most likely just "apply it or do not".
Whether it deserves the same three-way `place` treatment, and whether `updateBoardsAndClocksSpectors`
should consult the controller at all when the controller can have nothing to say about a spectator,
is a question for its own task rather than a detail of this rename.
