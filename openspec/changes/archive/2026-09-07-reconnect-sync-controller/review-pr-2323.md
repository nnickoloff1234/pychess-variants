# The unofficial review of PR #2323, and what became of it

Given to Nikolay privately rather than posted on the PR — there are no reviews, threads or comments
on #2323 or #2272 through either GitHub API — so it is recorded here, in the change whose subject it
is, instead of living in a chat log. Pasted 2026-09-06; the reviewer read the PR head against master
and did not re-run CI.

## Its one blocking finding, verbatim in substance

**[Medium — one small fix before merging] The pending-move cache is not fully reconciled after the
exact reconnect/refresh failure it is intended to handle.** The sequence:

1. Client sends move `X`.
2. Server accepts `X`.
3. The server's move response is lost because the connection dies.
4. User reloads/reconnects.
5. The new client receives the authoritative full-board state, which already contains `X`.
6. The new client's in-memory `unconfirmedMove` is empty because that state does not survive page
   reload. The persistent pending entry does survive.
7. The reconnect code therefore resends `X`.
8. The server correctly recognizes it as a duplicate and simply returns without producing another
   normal move confirmation.
9. Consequently the persistent pending entry is never consumed.

> The full-board handling added by this PR reconciles the snapshot only against the **in-memory**
> `unconfirmedMove`; it does not reconcile the persistent pending-move cache. [...] This does **not**
> look like a game-corruption problem. A later move on the same board will normally overwrite the
> stale pending entry. But it means the reconnect mechanism doesn't quite close the failure case it
> was designed for, and old entries can survive indefinitely if the game ends before another move.
>
> I would fix it at the authoritative full-board synchronization point: when the snapshot's last
> move for board A/B matches the cached pending move, consume that persistent entry too,
> irrespective of `unconfirmedMove`. The server snapshot is authoritative, so confirmation is safe
> there.
>
> There is also a tiny related cleanup issue: when the pending object becomes empty, remove
> `bug-pending-moves:<gameId>` from `localStorage` rather than storing `{}`.

Verdict: *"Request one small change for the persistent pending-move reconciliation, then approve and
merge."* Explicitly not asking for a split, a redesign, or more tests.

## Status: both asks are implemented, and NEITHER IS COMMITTED

Checked 2026-09-06 against `HEAD` and the working tree:

| ask | where it lives now | in `HEAD`? |
|---|---|---|
| consume the persistent entry at the full-board sync point | `reconcilePendingMove()`, `pendingMoves.ts:110`, called for both boards from `updateBothBoardsAndClocksOnFullBoardMsg` | **no** |
| remove the key instead of storing `{}` | `writeStoredPendingMoves()`, `pendingMoves.ts:41` | **no** |

`git log -S` finds no commit for either string. They exist only as working-tree modifications on top
of the merged PR. **The requested change to a merged PR is sitting uncommitted on one machine.**

One refinement beyond what was asked, and it matters: the reconcile matches **on the move, not on a
ply**. A ply comparison would also consume an entry whose move never reached the server at all — the
global ply advances on the OTHER board's moves too — and that entry is the only thing that can still
recover the move.

## What it means for this change

The finding is a walk through one reconnect case, and it is **R5** in `design.md`: a resend the
server deduplicates, answered by nothing. The reviewer's fix is why `reconcilePendingMove()` has to
be a separate act from `consumePendingMove()`, which is now a requirement in the delta.

Their step 6 is the more valuable observation and they did not follow it to its end. "The in-memory
state does not survive page reload, the persistent entry does" is an asymmetry with TWO halves. They
found the cache half. The other half is the GATE: `unconfirmedMove` is also what empties a board's
legal-move map, so a reloaded page with a resend in flight has nothing to gate with. That is
candidate defect 1 in `design.md`, and the review is evidence that the asymmetry is real and that a
careful reader meets it.

## The rest of the review, kept because it is context this change should not contradict

- **Approves the architecture**: a dedicated two-board analysis subsystem rather than special cases
  in the mature one-board analyzer; one Fairy-Stockfish alternating between positions rather than
  two instances; shared layout factored between the two-board round and analysis pages.
- **Endorses the clock model this change depends on**: "the historical four clock values stored for
  each bughouse ply aren't four equally authoritative snapshots. Only the clock belonging to the
  player who actually moved is reliable; another running clock's `duration` still represents what it
  was when that clock started." That is the same fact as the deprecation notice in `sendMove` and as
  the clock requirement in this change's delta.
- **Endorses pausing before applying a server value**, and specifically endorses fixing the
  two-board caller rather than `Clock.setTime()`, "because one-board code relies on its current
  semantics" — which is exactly the reasoning recorded at that code.
- **Endorses the INVALIDMOVE gate**: "while the client has submitted a move and is awaiting
  acknowledgement, an intervening full-board snapshot must not make the board playable merely
  because the snapshot appears to say it is this player's turn."
- **One non-blocking concern, out of scope here**: the browser engine's hard-coded 128 MB hash, on
  low-memory mobile. Belongs with the engine work, not with reconnection.
