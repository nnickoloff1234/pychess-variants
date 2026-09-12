# Tasks

## 0. Status

**Done and closed 2026-09-12, the same day it was proposed, and smaller than it was proposed.** It
began as a bounding change — sweep, age stamp or count cap — and the investigation that answered
"has the reconnect controller not already handled this?" cut it to a comment correction. The
investigation is recorded in the proposal so the next reader does not repeat it.

## 1. Do

- [x] 1.1 Correct the doc comment on `clearPendingMoves()`. It said it was "what finally bounds the
      cache"; it bounds THIS game's entry, and only with a page open on the game when the game ends.
      The comment now says so, and records the orphan case as measured and accepted: a never-confirmed
      move, a page that left before the end, a reader who never returns to that game — ~150 bytes,
      unreachable by any other game's read, cleared the moment that game is opened again.

- [x] 1.2 Nothing else, deliberately. No sweep, no timestamp, no cap. All three mechanisms are
      declined in the proposal with the reason, which is the part worth keeping: the two clearing
      paths that mattered arrived on 2026-09-06, and every stale key measured predates them.

## 2. Verify

- [x] 2.1 Frontend gates. Comment only, so there is nothing behavioural to test — and nothing to test
      it against, which is itself the argument for not building the sweep.

## 3. Not in this change

- `client/result.ts`'s `default: text = '*'` for an unrecognised status — see the proposal. One line,
  and it belongs to whoever is next in that file.
