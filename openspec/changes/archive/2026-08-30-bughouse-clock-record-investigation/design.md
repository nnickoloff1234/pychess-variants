## Context

All numbers below were measured on 2026-08-23 against game `JJgZzLhJ`, live, with the harness in
analysis mode. The raw evidence is in `data.md` and `JJgZzLhJ.mongo.json` beside this file.

### How a bughouse clock reaches the database

1. **The client is authoritative.** `roundCtrl.ts` pauses the mover's own `Clock` and then reads all
   four seats' `clock.duration` into the move message. Its own comment is explicit that only one of
   the four is meaningful: *"all those values are generally ignored on the server except the one for
   the current move"* — the other three are that client's local copies of clocks it does not own.
2. **The server records them twice.** `game_bug.py`'s `play_move()` appends a step carrying the
   client's `clocks` and `clocks_b` verbatim, AND calls `gameClocks.update_clocks()`, which appends
   the same two arrays to `ply_clocks['a']` and `ply_clocks['b']`.
3. **Only `ply_clocks` is saved**, flattened per seat into `cw` / `cb` / `cwB` / `cbB` by
   `get_ply_clocks_for_board_and_color()`.

So a live game serves steps built as it goes, and a finished game must have its steps rebuilt from
the saved arrays. That rebuild is the prime suspect for finding 1.

### Finding 1 — the two series are offset by exactly two plies

Both are length 33 for a 32-ply game. Comparing them index by index:

| tested | result |
|:--|:--|
| `mongo[i] == client[i]` | false for all four arrays |
| `mongo[i] == client[i+1]` | false for all four arrays |
| **`mongo[i] == client[i+2]`** | **true for all four arrays, at every index** |

Not approximately, and not for one seat — an exact match on `cw`, `cb`, `cwB` and `cbB` alike. The
page shows each seat's clock as it stood two plies before the ply it is labelled with, with the
first two entries padded to the starting time.

Two plies is a suggestive number. On a single board the same player moves every other ply, and
`client/analysis/movetimeChart.ts` derives a think time as `steps[ply-2] - steps[ply]` for exactly
that reason. A shift of two looks like single-board indexing applied to a two-board game, where the
two boards interleave and the same seat is NOT two plies apart.

### Finding 2 — exact zeros survive in the record

Deriving each seat's think time as its own clock at its previous move minus its clock at this move:

| source | plies costing exactly 0.000s | which | total think time |
|:--|--:|:--|--:|
| client steps (what the chart reads) | 10 of 32 | 1, 2, 3, 5, 7, 16, 20, 22, 28, 30 | 1235.7s |
| MongoDB record | 7 of 32 | 3, 9, 18, 20, 26, 28, 31 | 1252.6s |

The offset changes both which plies are affected and the total, so it is not merely cosmetic. But it
does not explain the zeros: seven remain in the record itself, and only plies 20 and 28 appear in
both lists. A hand-played game does not contain seven premoves.

### Finding 3 — the indicators carry two magnitudes

`wireClockDifferences()` gives each seat `own - opponentsPartner`, the same colour on the other
board. Written team-1-positive that is `dW = wA - wB` and `dB = bB - bA`, and

```
dW - dB  =  (wA + bA) - (wB + bB)  =  boardA total - boardB total
```

This identity was checked against all 32 plies and holds on every one with no exception. They
disagreed on 29 of 32 plies, mean absolute gap 120s, worst 465s. At plies 4 to 7 one pair read -465
while the other read 0 — one pair of players told they were eight minutes down, the other told the
teams were level.

## Goals / Non-Goals

**Goals:**

- Keep the evidence: the document, both tables, and the measured findings, in the repository.
- Establish which clock series is correct and why the other exists.
- Establish whether the seven residual zeros are a recording fault or something real.
- Settle what a difference indicator asserts, so all four agree by construction.

**Non-Goals:**

- Fixing anything in this change. Every number here was measured; none of the causes is established,
  and a fix chosen now would be a guess.
- The move-times chart, which is already correct with respect to the data it is handed — its two
  clock lines and its difference line were each verified exact against that data.
- Live clock behaviour during play. Nothing here suggests a player's own ticking clock is wrong;
  the question is what gets recorded and what is read back.

## Decisions

### Decision 1: Preserve the data before investigating anything

The findings are all derived from one game, that game's players no longer exist, and nothing
protects the document. Committing `JJgZzLhJ.mongo.json` and the two tables costs 3KB and makes every
number above reproducible without a running database. Do this first, because the investigation is
worthless if the fixture disappears mid-way.

Alternative considered: a `mongodump` in the scratchpad. Rejected — the scratchpad is session-scoped
and the whole point is surviving sessions.

### Decision 2: Start from the off-by-two, not from the zeros

The offset is exact, total, and affects all four arrays identically, which makes it the finding most
likely to have a single small cause. The zeros are the more visible symptom but the offset changes
which plies show them, so diagnosing zeros first means diagnosing a moving target.

### Decision 3: Do not delete the second series before knowing which is right

`steps[].clocks` and `ply_clocks` are two records of one quantity, and the obvious tidy-up is to
drop one. Not yet: the step series carries what a client actually sent, which is the only evidence of
what that client believed, and that may be exactly what explains the zeros.

### Decision 4: The indicator question is a round-page change and stands on its own

Making all four indicators agree is a change to `wireClockDifferences()` and is not blocked by the
other two findings — it is a definition, not a data fault. It can go first if wanted. Nikolay's
stated position is that partners should see one number; the analysis chart's difference line already
plots half the team difference, which is that number.

## Risks / Trade-offs

- **[The fixture is lost before the investigation happens]** → Decision 1 is exactly this
  mitigation, and it is the only task here that should be done immediately.
- **[The offset is in the reconstruction and the record is fine]** → Then nothing server-side is
  wrong and only the analysis page is misreading. That is the cheapest outcome and should be tested
  for first.
- **[The offset is in the recording and every saved bughouse game is affected]** → Then existing
  games' clock histories cannot be repaired, only correctly interpreted. Worth knowing early,
  because it changes whether this is a bug fix or a migration.
- **[Chasing this changes live clock behaviour]** → It must not. Clocks are client-authoritative
  during play and that machinery works; this is about the record and the read-back.

## Open Questions

- Which series is right — `ply_clocks`, or what the steps carry?
- Where are a finished game's steps rebuilt, and is the two-ply shift introduced there?
- Why do seven plies show no elapsed time in the record itself? Is a seat's `Clock` failing to
  resume when the turn returns to it on a board the mover is not watching?
- Should a seat record all four clocks with its move at all, when only one of them is its own?
- Should the four indicators show half the team difference — the number the chart's line already
  plots — or something else that satisfies "partners agree"?
