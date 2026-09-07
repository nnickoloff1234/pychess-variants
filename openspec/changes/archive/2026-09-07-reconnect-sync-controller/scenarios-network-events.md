# The real event sequences, and what they reduce to

`analysis-current-behaviour.md` describes what the client does with the facts it holds. This
describes HOW IT COMES TO HOLD THEM: the actual network histories, enumerated, so the test bed covers
reality and the handling code covers only the classes reality collapses into.

The shape is always the same:

    connected  ->  [ THE BREAK ]  ->  [ THE GAP: four actors act ]  ->  [ THE RETURN ]  ->  connected

## 1. The break — how we stopped being connected

This is the only dimension that changes WHAT WE KEEP, and it has exactly four values.

| | what happened | JS keeps running | local clocks keep ticking | in-memory facts (F1, F2, F5, F6) | durable facts (F3, F4) |
|---|---|---|---|---|---|
| **B1** | socket dropped, page alive — wifi off, cable out, router | **yes** | yes | kept | kept |
| **B2** | page frozen — laptop sleep, tab discarded, SIGSTOP | no | **no** | kept, but stale | kept |
| **B3** | page destroyed — refresh, navigate away and back, crash | no | no | **gone** | kept |
| **B4** | the SERVER went away — restart, deploy, container recreate | yes | yes | kept | kept, and possibly meaningless |

B1 is the only break during which WE CAN STILL ACT: queue a move, arm a premove, watch our own clock
run down. B2 and B3 make the gap a period in which we do nothing at all. B4 is the only one where
what we return to may not be the same game.

`E0` from the fact table is exactly B3, named from the client's side.

## 2. The gap — four actors, and only four

Everything that can make the return interesting is one of these acting during the break.

**A. Us, locally.** Only under B1.

| | |
|---|---|
| **U0** | nothing |
| **U1** | committed a move — it is queued in F3, the gate F5 is set, and it may or may not have left the machine |
| **U2** | armed a premove |
| **U3** | both: committed a move and armed a premove behind it |
| **U4** | tried to commit a second move on the same board — refused by the gate, so this is U1 with a failed attempt |

**B. Our own board.** Bounded, and the bound is the useful part.

| | |
|---|---|
| **O0** | nothing happened |
| **O1** | our move arrived and was played, and we never heard the confirmation |
| **O2** | our move arrived, and the opponent replied to it |
| **O3** | the opponent moved (only possible when it was already their turn) |
| **O4** | a clock ran out on this board and the game ended |

**AT MOST ONE OPPONENT MOVE CAN HAPPEN ON OUR BOARD WHILE WE ARE AWAY.** After it, the turn is ours
and they can only wait. This is a hard bound, and it has a corollary worth stating on its own:

> **If the snapshot shows our opponent has replied, our own move certainly reached the server.**
> They could not have moved otherwise. So O2 is self-announcing, and the client can conclude F3 is
> satisfied without any confirmation ever arriving.

**C. The other board.** Unbounded, and this is the asymmetry that makes reconnection hard.

| | |
|---|---|
| **X0** | nothing |
| **X1** | N moves, N unbounded — the global ply jumps by N while our board's position is unchanged |
| **X2** | a capture there, which puts a piece in OUR pocket |
| **X3** | that board ended the game — mate or flag there ends it for all four |

X1 is why "the ply moved but my board did not" is a normal state and not a symptom. X2 is why a
snapshot can legitimately change our pocket without changing our position or our turn.

**D. The other players' connectivity.**

| | |
|---|---|
| **C0** | everyone else stayed connected |
| **C1** | our opponent was also disconnected, and returns BEFORE us |
| **C2** | our opponent was also disconnected, and returns AFTER us — their queued move lands after ours |
| **C3** | our partner was disconnected — matters for the abandon timer and for the other board's flow |

## 3. What cannot happen, and why

The enumeration is finite because of these. Each one removes a whole region of the product.

1. **U1-U4 require B1.** Under B2 and B3 the page is not running; nothing local can be committed
   during the gap. So "refresh" and "queued a move during the gap" are mutually exclusive — the move
   was queued BEFORE the break.
2. **O3 requires that it was already the opponent's turn**, which means our last move had already
   been confirmed before the break. Otherwise the server is still waiting for us and they cannot
   move.
3. **O2 implies our move arrived.** The corollary above.
4. **Two queued moves on ONE board is impossible.** Proved in S7: the second player can only move
   after seeing the first player's move, which means that move already reached the server. The only
   thing a waiting player can arm is a premove.
5. **Two queued moves ACROSS boards is possible, and only in simul** — one user holding both seats of
   a team. This is the whole of the simul special case.
6. **A gap longer than the abandon timeout ends the game** — 30s doubled for base >= 3, so ~60s on a
   60+0 game. Every scenario below is implicitly "shorter than that", and "longer" is its own
   terminal outcome.
7. **Under B4 the game comes back EMPTY, which is worse than not coming back.** The claim that
   in-memory games do not survive a restart is wrong, and it is wrong in the dangerous direction:
   `init_from_db` restores active games, the bughouse document matches its filter, and
   `load_game_bug_from_doc` decodes `doc["m"]` — which is `[]`, because `GameBug` writes its moves
   only at game end. Four clients reconnect to a game that believes it is at ply 0 with full clocks.
   Every other variant persists each ply as it is played; this is a bughouse-only gap. See
   `bughouse-persist-moves-as-played`.

## 4. The scenario catalogue

Written as `break . us . our board . other board . others`, dropping dimensions that are fixed by
rule 1. These are the histories a test bed has to be able to produce.

### N-series — nothing of ours was in flight

| | history | what we return to |
|---|---|---|
| **N1** | B1 . U0 . O0 . X0 | identical state, only time has passed |
| **N2** | B1 . U0 . O0 . X1 | ply jumped, our board unchanged, the other board's clocks moved |
| **N3** | B1 . U0 . O0 . X2 | our pocket gained a piece; our position and turn unchanged |
| **N4** | B1 . U0 . O3 . X0 | the opponent moved; it is now our turn; our clock must resync |
| **N5** | B1 . U0 . O3 . X1 | both: the opponent moved AND the ply jumped past it |
| **N6** | B1 . U2 . O3 . X0 | as N4, and our premove is due to fire |
| **N7** | B2 . — . O3 . X1 | ~~as N5, but our clocks were FROZEN and wrong by the whole gap~~ — **N7 collapses into N5**: clocks are wall-clock derived and self-correct across a freeze, see section 7 |
| **N8** | B3 . — . O3 . X1 | as N5, from a page with no memory at all |

**N4 is the plain reconnect** — nothing of ours pending, the opponent moved while we were away, our
clock has to come from the server. It is the baseline every other scenario is measured against, and
the suite has never run it in isolation. It is S12 in the task list.

### Q-series — a move of ours was queued when the break happened

| | history | what we return to | our move |
|---|---|---|---|
| **Q1** | B1 . U1 . O0 . X0 | nothing moved | never arrived — resend is the real thing |
| **Q2** | B1 . U1 . O1 . X0 | our move is in the snapshot | arrived; the confirmation was lost |
| **Q3** | B1 . U1 . O2 . X0 | our move AND the reply are in the snapshot | arrived, self-evidently (rule 3) |
| **Q4** | B1 . U1 . O0 . X1 | ply jumped, our move absent | never arrived |
| **Q5** | B1 . U1 . O1 . X1 | ply jumped, our move present | arrived |
| **Q6** | B1 . U3 . O2 . X0 | our move, their reply, and our premove is due | arrived |
| **Q7** | B3 . (queued before the break) . O1 . X0 | our move is in the snapshot, and we have NO gate | arrived — **this is `unknown`** |
| **Q8** | B3 . (queued before the break) . O0 . X0 | nothing moved, and we have no gate | never arrived — **`unknown`, and the resend matters** |
| **Q9** | B1 . U1 . O0 . X0 . C2 | as Q1, and the opponent's own queued move lands after ours | never arrived |
| **Q10** | B1 . U1 (both boards, simul) . O0 . X0 | two queued moves, order matters | neither arrived |

**Q7 and Q8 are the pair the whole `unknown` question turns on**, and they are indistinguishable at
the moment of return: in both we hold a queued move and no gate. Only the snapshot separates them,
and only after it arrives.

### T-series — terminal

| | history | what we return to |
|---|---|---|
| **T1** | any . — . O4 . — | a finished game; our resend is refused in silence |
| **T2** | any . — . — . X3 | a finished game we never saw end, decided on the board we were not on |
| **T3** | gap > abandon timeout | ABANDONED; the game ended because we were away |
| **T4** | B4 | the server restarted and restored the game EMPTY — a silent rollback, not a failure |

## 5. The reduction — many histories, few detectable classes

**The client cannot see its own history.** At the moment of return it holds F3/F5 and receives a
snapshot; everything above collapses into what those two can distinguish. This is the mapping the
handling code is written against, and it is deliberately much smaller than section 4.

| class | detected by | histories it covers |
|---|---|---|
| **K1 in sync** | answer `no`; snapshot's last move per board equals ours | N1 |
| **K2 behind** | answer `no`; snapshot is ahead on either board | N2-N8, and every T once status is read |
| **K3 ahead, unresolved** | answer `yes`; snapshot does NOT contain our move | Q1, Q4, Q9, Q10 |
| **K4 ahead, resolved by the snapshot** | answer `yes`; snapshot DOES contain our move | Q2, Q3, Q5, Q6 |
| **K5 unknown, resolved** | answer `unknown`; snapshot contains the queued move | Q7 |
| **K6 unknown, unresolved** | answer `unknown`; snapshot does not | Q8 |
| **K7 terminal** | status >= 0 in the snapshot | T1, T2, T3 |
| **K8 no such game** | the connection or the game id fails | — (not what B4 produces) |
| **K9 the server went backwards** | the snapshot's ply is LOWER than ours and the game is not over | T4 |

Two consequences worth stating plainly:

- **The break type is NOT an input to the handling code.** B1, B2 and B3 differ only in what they
  leave behind, and what they leave behind is already F3/F5. The code never needs to ask "was this a
  refresh"; asking is what made the earlier draft confuse a category with a fact.
- **K3/K4 and K5/K6 differ only in whether a gate exists.** If `unknown` were answered as `yes`, K5
  would collapse into K4 and K6 into K3, and the class list would be five long instead of seven.
  That is the strongest argument for that decision, and it is an argument about code, not safety.

## 6. What the test bed has to produce, and what it has today

The classes are what the code is verified against; the HISTORIES are what a test bed must be able to
stage, because a class reached by the wrong history proves nothing.

| history | how to stage it | covered today |
|---|---|---|
| N1, N2 | `PB.offline()`, wait, `PB.online()` | S6 (a variant of N1) |
| **N4** | offline while it is the opponent's turn, they move, back online | **no — S12** |
| N5 (and N7, which collapses into it) | as N4, plus moves on the other board | partially, inside S3 |
| N6 | as N4 with a premove armed | S3 (which is why S3 confounds two variables) |
| N8 | as N4 but reload instead of offline | no |
| Q1 | offline, move, back online | S5b |
| Q2, Q3 | offline, move, ONLINE the opponent so they reply, then us | no |
| Q6 | S5's shape | S5 (found a severe bug, fixed) |
| Q7, Q8 | move while offline, then RELOAD instead of reconnecting | **no — task 5.3** |
| Q10 | simul, a move on each board | S9 |
| T1, T2 | end the game while a client is away | disproved suspicion: the result IS learned on reconnect |
| T3 | wait past the abandon timeout | S4, by accident |
| T4 | restart the server mid-game | **no** — blocked on `test-users-survive-restart`, without which the four windows come back as new anonymous browsers with no seats and the game is unreachable for the wrong reason |

**One board moved and the other not** — the S6b shape — is not a row here because it is a MODIFIER on
almost every row: X0 versus X1 crosses the whole table. S3 versus S6 differ in it, which is why S6b
exists and why it belongs beside S12.

## 7. Open questions this raises

- ~~**Is B2 distinguishable from B1 by the client at all?**~~ **ANSWERED: they are equivalent, and
  the question's premise was wrong.** `Clock` does not accumulate time by ticking. It holds
  `duration` (the value when it last started) and `startTime` (a wall-clock stamp), and derives the
  live value on every read — `this.duration - (Date.now() - this.startTime)`. The `setTimeout` loop
  renders and fires sounds and the flag callback; it does not count. So a frozen page returns with a
  RUNNING clock that is correct, because the next callback recomputes from a `Date.now()` that
  advanced through the whole freeze, and a PAUSED clock that is correct because time does not apply
  to it. **N7 is therefore not a distinct scenario** — it is N5 with some sounds missed.

  Three differences remain, and none needs the client to know which break happened: under B2 we
  cannot act, which is already visible as F3/F5 being absent; the flag callback does not fire during
  the gap, which is harmless because flagging is the server's call and the client's is advisory; and
  the low-time warning for the gap is lost, which is cosmetic. B2 IS detectable in principle — a
  `setTimeout` returning far later than its granularity is the standard sleep signal, and one runs
  per clock already — but nothing needs it.

- **The caveat that survives, and it is not about B2.** The self-correction assumes `Date.now()` is
  monotonic and correct across the gap. A machine that resumes with an NTP-corrected system clock
  moves `Date.now()` independently of elapsed time, and `duration - (now - startTime)` inherits that
  error exactly. The hazard is shared by B1 and B2 alike and is not detectable from inside. The
  existing mitigation is the rule already in the code — any message carrying clocks resyncs from the
  server — which argues for its stronger form: treat local clocks as advisory until the first message
  after ANY return, for this reason rather than for the frozen-page one.
- ~~**Does B4 need handling, or is it acceptable to fail?**~~ **ANSWERED: it needs handling, and it
  does not fail — it rolls back.** The game is restored, at ply 0, and the client accepts it because
  every case in this document assumes the snapshot is authoritative "because the server knows more
  than us". B4 is the one case where that premise is false. Two changes follow, and they are
  complements: `bughouse-persist-moves-as-played` makes the window small on the server, and THIS
  change refuses to act on the impossible snapshot on the client — a snapshot whose ply is lower
  than ours, in a game that is not over, is not a legitimate state in any other scenario, which
  makes it a one-line test and the new class K9.
- **Q9 and C2 ordering** — S7 showed both orders are clean for premoves, but not with two queued
  moves landing in either order, which rule 4 says can only happen across boards.
