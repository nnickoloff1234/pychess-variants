## Why

Raised by Nikolay on 2026-10-11 while reviewing PR #2377 (`accessibility-sight-impairment`), on
`client/two-board/twoBoardCtrl.ts:153`:

```ts
const own = ownBoardName(this.seats) === 'a' ? this.boardA : this.boardB;
```

`ownBoardName(seats)` (`two-board/common/boardRoles.ts`) returns only a **name**. Nothing turns a
board name into its `GameControllerBughouse`, so every caller writes the conditional by hand. It is
written **nine times** in two-board code:

| Site | Expression |
|---|---|
| `twoBoardCtrl.ts:153` | `ownBoardName(this.seats) === 'a' ? this.boardA : this.boardB` (PR #2377) |
| `twoBoardCtrl.ts:183` | `step.boardName === 'a' ? this.boardA : this.boardB` |
| `analysis/analysisCtrl.ts:328` | `step.boardName === 'b' ? this.boardB : this.boardA` (inverse test) |
| `round/roundCtrl.ts:305` | `boardName === 'a' ? this.boardA : this.boardB` |
| `round/roundCtrl.ts:351` | `(seat.boardName === 'a' ? this.boardA : this.boardB).boardSummary` (PR #2377) |
| `round/roundCtrl.ts:969` | `board === 'a' ? this.boardA : this.boardB` |
| `round/roundCtrl.ts:976` | `(board === 'a' ? this.boardA : this.boardB).turnColor` |
| `round/roundCtrl.ts:1071` | `boardName === 'a' ? this.boardA : this.boardB` |
| `round/roundCtrl.ts:1391` | `boardName === 'a' ? this.boardA : this.boardB` |

Line numbers as of fork master `012885ca9`; re-grep before starting:
`grep -rnE "'a' \? [a-zA-Z.]*boardA : [a-zA-Z.]*boardB|'b' \? [a-zA-Z.]*boardB : [a-zA-Z.]*boardA" client`.

**Deferred by decision:** not done inside PR #2377, which otherwise does not touch most of these
sites. Scheduled for "some future point".

## What Changes

One method on `TwoBoardController` (`client/two-board/twoBoardCtrl.ts`), which owns both boards:

```ts
board(name: BugBoardName): GameControllerBughouse {
    return name === 'a' ? this.boardA : this.boardB;
}
```

Every site above becomes `this.board(<name>)`; the own board is `this.board(ownBoardName(this.seats))`.
No behaviour change, no new strings, no CSS.

**No separate `ownBoard()`.** It would have one caller (`twoBoardCtrl.ts:153`); per the "no
abstraction without a consumer" rule, `board(name)` with nine callers is the one worth adding, and
the own board is a composition of the two existing pieces.

## Watch out — the two sites whose name can be missing

`Step.boardName` is optional (`boardName?: BoardName`, `client/messages.ts:29`; the first, dummy step
has none), and the two step-based sites disagree about what a missing name means:

- `twoBoardCtrl.ts:183` tests `=== 'a'`, so a missing name picks **board B**;
- `analysis/analysisCtrl.ts:328` tests `=== 'b'`, so a missing name picks **board A**.

`board()` takes a required `BugBoardName`, so neither can be passed straight through: each call site
must make its fallback explicit (`this.board(step.boardName ?? 'a')` or whichever is right). Decide
per site — check whether the missing case is reachable there at all (`stampStepPlys` skips
`idx === 0`) — rather than unifying silently. If one of them turns out to be wrong today, that is a
bug fix and is recorded as one, separately from the refactor.

## Impact

- `client/two-board/twoBoardCtrl.ts`, `client/two-board/round/roundCtrl.ts`,
  `client/two-board/analysis/analysisCtrl.ts`.
- No spec change: pure refactor.
