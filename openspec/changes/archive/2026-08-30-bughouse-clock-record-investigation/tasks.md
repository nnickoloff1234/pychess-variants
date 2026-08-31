## 0. Status

**Repurposed 2026-08-30; finding 1 is now FIXED on read (2.3), storage untouched.** Findings 1 and
2 are SOLVED and reproducible on demand; finding 3 is
unchanged and is a decision; finding 4 is NEW and now **reproduces reliably** — twice on plain
four-player games, most clearly in `sLF5O6kj` (447s of error and a 1ms rise, straight out of the
stored document).

**The stress-test suite S1-S11 has now been executed end to end** (`stress-tests.md`, which also holds
the runbook of every snippet used). It closed the premove/reconnect line — S7 and S8 both clean, and
the two-queued-moves case is impossible by construction — and left four bugs open: finding 4,
finding 6, S9b (a simul cannot be resigned) and S10 (the mover's own clock is left wrong when the
server replays a queued move with its own clocks). See `proposal.md` for the
current framing — including what the original report got wrong, which was treating the recording as
the suspect when the record is fine and the read-back is not.

**Order of work, agreed with Nikolay.** Sections 2 and 3 are DONE. **Finding 4 (section 5) is next**
— reproduce the corruption before anything else, because a record that can be corrupted makes every
other measurement untrustworthy. Section 6 (reconstructing a running seat's clock) comes after it,
partly because what a disconnection does to `ts` is finding 4's territory. Section 4's live check
can be done any time a game is up.

**Nothing here has changed behaviour yet.** Sections 2.3 and 3.4 are decisions, not measurements,
and the fix discussion has not happened.

## 1. Preserve the evidence

- [x] 1.1 Full MongoDB document committed as `JJgZzLhJ.mongo.json` (3,010 bytes) — `us`, `m`, and the
      four per-ply clock arrays `cw` / `cb` / `cwB` / `cbB`, 33 entries each.
- [x] 1.2 `data.md` holds both tables for all 33 indices: **Table 1** raw milliseconds exactly as
      recorded, with the mover named per ply; **Table 2** the same values as the page formats them,
      plus all four difference indicator readings.
- [x] 1.3 Seats, teams and the en-dash caveat recorded in `data.md`, so the arrays can be attributed
      to players without the (now gone) test identities.
- [x] 1.4 Game verified present in MongoDB on 2026-08-23 and read with
      `mongo -u admin -p pass --authenticationDatabase admin pychess-variants` — the container ships
      the legacy `mongo` shell, not `mongosh`, and refuses unauthenticated queries with an empty
      database list rather than an error.

## 2. Finding 1 — the read-back shift (SOLVED; what remains is the fix decision)

- [x] 2.1 Measured: `mongo[i] == client[i+2]` holds for **all four arrays at every index**, while
      shifts of 0 and 1 fail for all four. The page shows each seat's clock from two plies earlier.
- [x] 2.2 **Found: `load_game()` in `server/bug/utils_bug.py`, and the shift is two errors, one
      each side of the loop.**

      1. **The saved array already carries the ply-0 entry, and load adds a second.**
         `game_bug.py:345` saves `get_ply_clocks_for_board_and_color(...)` whole, and `ply_clocks`
         is initialised with the starting time, so `cw[0] == 3600000` in the document. Then
         `utils_bug.py:144-147` does `clocktimes_w = doc["cw"]` followed by
         `clocktimes_w.insert(0, base_clock_time)` — the base is now in there twice.
         **The one-board path does not do this**: `game.py:583` saves `self.clocks_w[1:]`, stripping
         the initial entry, and `utils.py:380` re-adds it. Bughouse omits the `[1:]`.
      2. **The step for move `ply` is `steps[ply + 1]`, but reads index `ply`.** `game.steps[0]` is
         the initial position, pushed before the loop; inside it, `utils_bug.py:204-211` sets
         `step["clocks"] = [clocktimes_w[ply], clocktimes_b[ply]]`.

      One error from the duplicated base, one from the initial step, and they add: the step labelled
      with ply *i* carries the clock as it stood after ply *i-2*. That is `mongo[i] == client[i+2]`
      exactly, for all four arrays at every index, with no approximation involved.
- [x] 2.3 **DECIDED and DONE 2026-08-30 — fix on read, storage untouched.** Nikolay: *"we shouldn't
      mess with how data is stored, we want old data to still be readable, ideally now correctly
      read."* So `game_bug.py` still writes `ply_clocks` whole, every document ever written keeps
      its meaning, and `server/bug/utils_bug.py` was changed in two places:

      1. **The four `insert(0, base_clock_time)` calls are gone.** The document already carries the
         seeded `[base, base]` entry, so prepending gave every array two of them.
      2. **`clocktimes_*[ply]` became `clocktimes_*[ply + 1]`.** `ply` enumerates `doc["m"]`, one
         entry per MOVE — the same counter that indexes `doc["o"]` correctly two lines above — while
         the clock arrays carry the extra ply-0 entry.

      **Applied one at a time, and the intermediate state was measured**, because the second error
      was a prediction until it was not. With only the inserts removed the page still read
      `client[k] == mongo[k-1]`: ply 1 showed all four at `1:00:00` where the true value was
      59:58 / 1:00:00 / 59:18 / 1:00:00, and ply 10 showed board B white at 58:47 instead of 58:17.
      Halved, not fixed — so both errors were real and independent.

      | ply | before | inserts removed only | both fixed | `mongo[ply]` |
      |:--|:--|:--|:--|:--|
      | 1 | `1:00:00` x4 | `1:00:00` x4 | **1:00:00 / 59:58 / 59:18 / 1:00:00** | identical |
      | 3 | 1:00:00 / 59:58 / 59:18 / 1:00:00 | — | **59:37 / 58:47 / 59:18 / 1:00:00** | identical |
      | 10 | 59:10 / 56:48 / 58:47 / 56:57 | 59:10 / 56:19 / 58:47 / 56:57 | **59:10 / 56:19 / 58:17 / 56:57** | identical |

      `client[k] == mongo[k]` at every ply checked, and the rebuilt reading now equals what the same
      game showed from memory before the restart — which is the requirement in the delta spec: a
      reader cannot tell which path served it.

      Gates: `ruff format` (1 file reformatted), `ruff check` clean, `pyright` 0 errors,
      `unittest discover -s tests` **1031 tests OK**. Verified against `PHdCmezP` rebuilt from the
      database in a freshly built image, twice — once after each half of the fix.
- [x] 2.4 **Answered, and it is the reconstruction — proved on ONE game, before and after a server
      restart.** Fresh fixture `PHdCmezP` (see 2.6), analysis page at `?ply=10`, nothing else
      changed between the two readings:

      | seat | served from memory | rebuilt from the database | `mongo[10]` (true final) | `mongo[8]` |
      |:--|--:|--:|--:|--:|
      | board A white | 56:19 | **56:48** | 56:19 | **56:48** |
      | board B white | 58:17 | **58:47** | 58:17 | **58:47** |
      | board A black | 59:10 | 59:10 | 59:10 | 59:10 |
      | board B black | 56:57 | 56:57 | 56:57 | 56:57 |

      While the finished game was still in the server's memory the page showed the TRUE final
      clocks. After `docker compose restart server`, the same URL showed both discriminating seats
      two plies back. The other two seats' arrays repeat at those indices and cannot discriminate —
      which is itself finding 2's mechanism, see 3.2.

      **So the record is right and the read-back is wrong.** That also explains why this was never
      noticed while playing: a game watched live, or analysed straight after it ends, is served from
      memory and is correct. Only a game that has left memory — a restart, or eviction — is shifted.

- [x] 2.6 **A second fixture, made deliberately reproducible.** `PHdCmezP.mongo.json` in this
      directory: bughouse 60+0, **four separate players** (not a simul), the standard line
      `1. e4 e5 2. Nf3 Nf6 3. Nxe5` on both boards, ended by **resignation** (status 2), 10 plies,
      played 2026-08-30 with no page reloads during the game.

      The recipe that reproduces the shift from nothing: play any bughouse game, finish it, read the
      analysis page (correct), restart the server, read the same page again (shifted by two).

      All four arrays are length 11 for 10 plies and every one starts at 3600000 — the duplicated
      base is visible in the document itself. **The ending does not matter**: this game was resigned
      and `ZdoeZseB`, checked the same day, was flagged; both shift once out of memory.

      One caveat recorded so the next reader does not chase it: `ZdoeZseB` ALSO showed impossible
      values — `cwB` dropping 60:00 → 41:14 on board B's first move and then rising to 41:25, `cw`
      at 18:18 one move into a 90-second-old game, and `cbB` holding only 10 entries where the other
      three held 11. That game was a SIMUL with hard reloads mid-game. `PHdCmezP`, played cleanly,
      shows none of it: equal lengths, monotonic decreases, plausible think times. Whatever that is,
      it is not this bug, and a simul or a mid-game reload is the place to look for it. Needs harness ROUND mode — see
      `bughouse-live-game-routine` — and a fresh game, since this one's identities are gone.
- [x] 2.5 **Ruled OUT for finding 1.** The chart's `steps[ply-2] - steps[ply]` derivation was the
      leading hypothesis for the two-ply shift and it is not the cause: the shift is server-side, in
      the rebuild, and it is present in the clock VALUES the page displays before any chart is
      drawn. The two-ply reading rule remains a real issue for derived think times — a seat is not
      two plies apart when two boards interleave — and belongs to section 3, not here.

- [x] 2.7 **Answered by 2.3: nothing happens to them.** The write side is untouched, so every
      existing document keeps the shape it has and is now read correctly. The duplication that the
      old load added is gone; the seeded ply-0 entry stays in storage, where it is harmless and
      where `ts` uses the same convention. No migration.

      Superseded question, kept for the record: **Decide what happens to games already in the
      database.** Whichever fix is chosen, every
      existing bughouse document carries the ply-0 entry the rebuild duplicates. Stripping it on
      save makes new documents mean something different from old ones; fixing only the read leaves
      the duplication in place forever but keeps one meaning for all documents. Neither is free, and
      this is the part 2.3 cannot be answered without.

## 3. Finding 2 — what a move time is recorded from (mechanism SOLVED; the record still needs improving)

- [x] 3.1 Measured: 10 of 32 plies at exactly 0.000s from the page's data, 7 of 32 from the record
      itself (plies 3, 9, 18, 20, 26, 28, 31). Only plies 20 and 28 are in both sets. Total think
      time differs between the two sources, 1235.7s against 1252.6s.
- [x] 3.2a **Measured on `PHdCmezP`, and it is by construction.** Every ply appends BOTH boards'
      full clock pairs — `game_bug_clocks.py:82-83` appends `clocks` to `ply_clocks["a"]` and
      `clocks_b` to `ply_clocks["b"]` on every move, whichever board it was played on. So a seat's
      value can only change on that seat's own moves and is copied forward on all the others:
      `cw = [3600000, 3598935, 3527055, 3527055, 3527055, 3408427, 3408427, 3408427, 3408427, ...]`.
      Any think time taken as the difference between consecutive entries is therefore 0 for every
      ply that seat did not play — which is most of them. The remaining question below is not why
      the repeats exist but what should be recorded instead.
- [x] 3.2 **RESOLVED — it does not repeat between two of its own moves except on a premove.** The
      question assumed a defect that is not there. A seat's array repeats between OTHER seats'
      plies, by construction (3.2a), and a derivation that walks a seat's own moves never reads
      those. Derived correctly on both fixtures:

      | fixture | plies | zeros with the correct per-seat derivation |
      |:--|--:|:--|
      | `PHdCmezP` | 10 | **none** — 22.9s to 154.9s, all sensible |
      | `JJgZzLhJ` | 32 | **7** — plies 3, 9, 18, 20, 26, 28, 31, total 1252.6s |

      Those two numbers are exactly the original finding's "from the record" figures, so that half of
      the measurement was right. The other half — "10 of 32 from the page's data, 1235.7s" — was an
      artifact of the shifted read and is gone with finding 1.

      Also corrected: the note that the chart derives `steps[ply-2] - steps[ply]` describes
      `client/analysis/movetimeChart.ts`, the ONE-BOARD chart. The bughouse chart
      (`client/two-board/analysis/movetimeChart.ts:189-203`) already keeps a per-seat
      `clocktimeLast` and diffs each mover against its own previous move. It was correct all along;
      it was being fed shifted values.
- [x] 3.3 **CONFIRMED: every remaining zero is a premove, proved from `ts` without running a game.**
      For each ply, the wall-clock gap since the previous move ON THAT BOARD, taken from the `ts`
      array, against the derived think time:

      | plies | wall gap since previous move on that board |
      |:--|:--|
      | the 7 zero-think plies | **0.041s – 0.060s** |
      | the 25 non-zero plies | **1.6s – 465.5s** |

      No overlap, two orders of magnitude apart. 41-60ms is a network round trip: the opponent's
      move arrives and the queued premove fires at once. `roundCtrl.ts:358-361` then restores the
      turn's starting value — `premoveTime = movedClock.duration + increment`, written back with
      `setTime` — precisely so the dispatch latency is not charged to the player. The zero is a
      deliberate design decision, correctly recorded.

      **Bonus check the table gives for free: the clock record is accurate.** On every non-zero ply
      the derived think time matches the wall gap to within ~30-50ms (44.037 against 44.142; 465.374
      against 465.502; 11.759 against 11.779). The clocks are not drifting.
- [x] 3.4 **DECIDED 2026-08-30: no change.** A premove keeps drawing at the chart's 2% floor, the
      same as any near-instant reply. That is honest — the player really did spend no time — and the
      data stays unambiguous either way, because the per-seat derivation records an exact 0 for a
      premove and never counts an unchanged reading. Nothing in the record or the reader needs to
      distinguish them; if the chart should ever say "this was pre-decided" it is a UI question to
      raise in a UI pass, not a fault to fix here.
      Original: **Now a presentation question only, and the last thing open in this section.** The
      ambiguity it was written about is gone: an unchanged reading is never counted by the per-seat
      derivation, so a zero in the derived series unambiguously means "premove — no time spent".
      What remains is that the chart draws those at the same 2% floor as a very fast real move, so a
      premove is not visually distinct from a 0.2s reply. Whether it should be is a design call, not
      a data fault, and it needs no change to what is recorded.

## 4. Finding 3 — the difference indicators are a SPEC to verify, not a definition to choose

- [x] 4.1 Measured: the four readings carry two magnitudes, differing by exactly
      `boardA total - boardB total` — an identity that held on all 32 plies with no exception. They
      disagreed on 29 of 32, mean gap 120s, worst 465s, ending at -377s and -598s.
- [x] 4.2 **REFRAMED 2026-08-30. This was written up as a decision and it is not one.** Nikolay:
      *"that is not a rule that should be implemented but an outcome that should be verified and
      which should follow from correct workings of existing logic."*

      **The spec, in his formulation.** The four values are NOT all equal. The two teammates' values
      SHALL be equal to each other, and a team-1 player's value SHALL be exactly the negation of any
      team-2 player's value. Two magnitudes: `+d` and `-d`. Tolerance is rounding only — about a
      second either way, since the badge renders `Math.round(diff / 1000)`.

      **Why it follows rather than being chosen.** With no increment — and bughouse is not supposed
      to allow one — each board always has exactly one clock running, so at any instant both boards
      have consumed the same wall time and `wA + bA == wB + bB`. Under that condition the existing
      formula (`roundCtrl.ts:254-263`, each seat against `opponentsPartnerOf` = same colour, other
      board) yields exactly `+d` / `-d` with teammates equal. **So the current implementation is not
      known to be wrong**, and the earlier claim in this file that it was structurally incapable of
      satisfying the invariant is withdrawn.

- [x] 4.3 **The old measurement cannot test the spec, and here is the arithmetic that shows why.**
      4.1's "two magnitudes disagreeing on 29 of 32 plies, by up to 465s" was computed from the
      per-ply arrays, which snapshot only AT MOVES. A board that is mid-think has time that is not in
      the record. Predicted disagreement at any ply = (board A's in-progress think) - (board B's).
      Measured against `ts`:

      | plies matching that prediction within 1s | 31 of 32 |
      |:--|:--|
      | ply 2 | disagreement -421.3s, in-progress difference -421.4s |
      | plies 30/31/32 | 216.0 / 216.0 / 227.8 against 216.4 / 216.5 / 228.3 |

      The "up to 465s" was one player thinking for 465s — the ply-2 move, which took 465.4s. So the
      record's disagreement is a granularity artifact and says nothing about what the live badges
      show.

- [x] 4.4 **VERIFIED IN BOTH PLACES.** Live round page: `PB.invariant()` reads `ok` with
      `badgesFresh: true` in every window through the whole S1-S11 suite, including across
      disconnects, stalls and replays — and where it did NOT hold (S10) the cause was a client bug,
      now fixed, not a wrong spec. Recorded plies: re-derived for `sLF5O6kj` in `data.md`, where the
      four indicators show one magnitude per ply with teammates equal and the two teams exact
      negations, at all 10 plies. Note what that check is worth: after 6.1 the reconstruction makes
      the boards' totals equal BY CONSTRUCTION, so the load-bearing evidence is the independent one
      — reconstruction agrees with every authoritative recorded value across 52 plies within ~50ms.
      Original: **VERIFY THE SPEC IN BOTH PLACES — the second half is now UNBLOCKED**, since 6.1
      gives the movetime plot a correct value for a seat that was mid-think.
      Original: **VERIFY THE SPEC IN BOTH PLACES.** It is one invariant with two very different tests:

      - **Live round page** — read all four badges at one instant during a running game and check
        there are exactly two values, `+d` and `-d`, teammates equal, within a second. Live clocks
        include the running time, so this is where the invariant should simply hold.
      - **The movetime plot** — where it is currently NOT verifiable at all, because the stored
        series has no value for a seat that was still thinking when the ply was recorded. Making it
        verifiable there is section 6.

      Also still open from the original list: check the badge still fits its box at whatever
      magnitudes come out (`clock-difference-covers-digit-by-design` says it sits outside the clock
      and overlaps only when there is no room).

## 5b. Finding 6 — an ABANDONED game is announced to almost nobody

Found while running 5.0 and **more serious than the experiment it interrupted**. When the game ended
by abandon, only two of the four players learned about it. The other two sat with running clocks,
believing the game was still on — measured nine minutes later still ticking down, at 48:38 and
48:22, on a game the server had finished and written to the database.

- [x] 5b.1 **Measured, `ctlVer5h`.** p1 (A-white) and p3 (A-black) showed `game-over` and the result;
      **p2 (B-black) and p4 (B-white) showed no result, no game-over class, and clocks still
      running.** The split is by BOARD: the two who learned are board A, the two who did not are
      board B. p3 only knew because it reconnected afterwards and was served the finished game.

- [x] 5b.2 **Cause, in two parts, both in `server/user.py`'s `abandon_game()` (:408-428).**

      1. **`await round_broadcast(game, response)` omits `full=True`.** `broadcast.py:36` reads
         `players = tuple(game.non_bot_players) if full else ()` — so without it the message goes to
         SPECTATORS ONLY and no player is told. Every other end path passes it: `clock.py:136,277`
         (flag), `wsr.py:347,417,931` (resign, draw). This one call is the odd one out, which is why
         a resignation earlier the same day reached all four windows and this did not.
      2. **The direct fallback reaches exactly one player, and always a board-A one.** It computes
         `opp_name` from `game.wplayer` / `game.bplayer` — the ONE-BOARD pair — so in bughouse it can
         only ever name a board A seat. Board B is unreachable through it by construction.

      Together: at most one of four players is notified, and never a board B player unless they
      happen to be spectating.

- [x] 5b.2b **REPRODUCED 2026-08-30 on `YpTfT5AB`, and it found a THIRD site.** Recipe, ~4 minutes:
      start a four-player 60+0 game; `PB.netInstall()` then `PB.offline()` in one window; wait past
      the 60s abandon threshold; read `result` / `game-over` / `PB.clocks().run` in the other three
      and `db.game.findOne({_id}).s` for the truth.

      - Disconnect a **board B** player: **no abandon task is ever created** — `wsr.py:328` only
        schedules one `if user in (game.wplayer, game.bplayer)`, which is board A's pair, so a board
        B player takes the `else` and is treated as a departing spectator. Game still `STARTED`
        three minutes later.
      - Disconnect **`bplayerA`**: abandon fires on time (stored `status=7 result=a`), and of the
        three remaining players only `wplayer` is told. Both board B players kept running clocks on
        a finished game.
- [x] 5b.3 **FIXED and RE-TESTED 2026-08-30.** Three edits, all replacing "board A's two" with "the
      players in this game":

      - `wsr.py` `finally_logic()` — `user in game.non_bot_players` decides who gets an abandon task.
      - `user.py` `User.abandon_game()` — `round_broadcast(game, response, full=True)`, and the
        `opp_name` fallback DELETED. Its human half only existed to work around the missing
        `full=True`; its bot half is kept as a loop over `game.all_players` feeding `game_queues`,
        mirroring `Clock._notify_bot_game_end()` (broadcasts can never reach bots — `broadcast.py:36`
        builds recipients from `non_bot_players`).
      - `wsr.py` `handle_game_user_connected()` — membership and `clear_seeks()` both over
        `game.non_bot_players`.

      **Verified on two fresh games, the two cases that were broken:**

      | who disconnects | before | after |
      |:--|:--|:--|
      | board B player (`rMEZ7a5I`) | no abandon task at all; game still STARTED after 3 min | ABANDON at +65s (`status=7 result=a`); **all three** remaining players `1-0`, game-over, clocks stopped |
      | `bplayerA` (`BhlL70iT`) | abandon fired, but only `wplayer` was told | ABANDON at +64s; **all three** remaining players `1-0`, game-over, clocks stopped |

      Gates: `ruff format`, `ruff check`, `pyright`, and 1031 unittests OK.
      Superseded plan: **Decide the fix — now THREE sites, and the third is the important one.** `full=True` on
      the broadcast is still the one-word half. `wsr.py:328`'s membership test is the new part and
      the reason a fix limited to the broadcast would not work: it must ask "is this user a player
      in this game" (`game.all_players` / `non_bot_players`), not "is this user one of board A's
      two". Check every other `in (game.wplayer, game.bplayer)` in the codebase while there — the
      same test may gate more than the abandon path.
      Original: **Decide the fix.** `full=True` on that broadcast is the one-word half. The `opp_name`
      fallback is the part that needs thought — it exists to reach a player whose socket is not in
      the spectator set, and its two-player assumption is wrong for a four-seat game. Check whether
      the same one-board assumption appears in the other abandon-adjacent paths before changing it.
- [x] 5b.4 **DONE as part of 5b.3's re-test** — two games, a board B player and `bplayerA`, each
      disconnected past the abandon threshold; every player still CONNECTED ended the game together.
      One thing it does NOT cover, see 5b.5: the disconnected player itself.
      Superseded plan: **Then verify by reproducing 5.0's freeze deliberately**, under the abandon threshold for
      the clock work and over it for this one, and confirm all four clients end the game together.

- [x] 5b.5 **TESTED AND DISPROVED the same day — there is no re-delivery gap.** Nikolay's point: the
      board message sent on reconnect already carries the status, so the client should just read it.
      It does — `roundCtrl.onMsgBoard` sets `this.status`/`this.result` from the message and calls
      `checkStatus()`, which pauses all four clocks, announces the result and plays the end sound.
      Measured on `BhlL70iT`: a window disconnected before the abandon showed `result: null`,
      `game-over: false`, clocks RUNNING; one `PB.online()` later it showed `1-0`, `game-over: true`,
      all clocks stopped.

      **So `4G3ZyGze`'s two silent windows were a HARNESS artifact, not a product defect**:
      `PB.offline()` blocks reconnection (sockets are redirected to `ws://127.0.0.1:9/blocked`), so
      they never reconnected. Frozen clocks with no result line is exactly what a still-disconnected
      client looks like. Superseded hypothesis: **a client that is OFFLINE when the game ends is
      never told.** Every
      ending is a point-in-time push — `round_broadcast` to live sockets, `send_game_message` to the
      sockets that exist at that instant. `handle_reconnect_bughouse` replays queued moves and
      re-sends the BOARD, but nothing re-delivers the ENDING, so a client that reconnects afterwards
      shows frozen clocks and no result line. That is exactly what `4G3ZyGze` looked like, and it is
      a re-delivery problem, not a recipients problem — 5b.3's fix cannot help it.
      **Test**: take one window offline, end the game from another (resign is enough), bring it back,
      and see whether it ever learns. Then decide where the ending belongs on the reconnect path.

## 6. Reconstructing a running seat's clock at the moment a ply was recorded

The gap that makes 4.4's second test impossible. When ply *i* is recorded, on the OTHER board some
seat is mid-turn and has spent time that no array holds — their entry still reads what it read when
their own turn began. Two candidate ways to close that, neither chosen:

- [x] 6.1 **DONE 2026-08-30, and WITHOUT `ts`.** Nikolay's call: the three non-mover values are
      unreliable by construction, are not to be repaired or replaced by what the mover sees, and are
      deprecated pending removal; reconstruct from the ONE authoritative value per ply instead.

      **The derivation needs no timestamps.** With no increment each board has exactly one clock
      running, so a board's TOTAL remaining falls 1:1 with wall time; both boards start equal and
      share the wall clock, so their totals are equal at every instant. At a ply played on board X
      both of X's values are authoritative (mover just paused, opponent paused since its own move),
      so Y's total is known, Y's paused seat is its own last authoritative value, and Y's thinking
      seat falls out by subtraction.

      **Implemented** in `analysisClock.reconstructMainlineClocks()`, recorded mainline only;
      variations keep the old behaviour, and an increment or a missing mover value falls back to the
      stored values. **Verified**: `sLF5O6kj` ply 2 now renders board B black as 52:33 where it read
      59:59 (that seat had been thinking 447s), ply 6 matches the derived table on all four; across
      three fixtures and 52 plies there are no rises and the two boards' totals are equal at every
      ply; and the last ply plus the subsequent think time reproduces the four live values measured
      independently in the four windows at resignation. It also agrees with the `ts` route within
      ~50ms, which is now a cross-check rather than the mechanism.
      Superseded plan: **Reconstruct it from `ts`.** A seat's clock at the moment of ply *i* is their value when
      their turn started, minus the elapsed time since — and both terms are available: the value is
      the one already in the array, and the elapsed time is `ts[i] - ts[start of that seat's turn]`,
      where the turn started at the previous move on that board.

      **There is already strong evidence this works.** 4.3's table IS this reconstruction, run
      backwards: it predicted the recorded disagreement from `ts` alone and matched on 31 of 32
      plies within a second. What has to be established before trusting it: what `ts` actually is
      (server `time_ns()` at move receipt), how the ~30-50ms per-move latency accumulates, what a
      premove does to it (the premove path deliberately charges nothing, so ~50ms per premove is
      unaccounted), and what happens across a disconnection — which is finding 4's territory and
      another reason to do that first.

- [x] 6.2 **REJECTED.** Both halves. Keeping the client's three copies is out — S11 measured one of
      them 447s wrong, and a disconnect makes it worse; and sending what the mover SEES
      (`liveTime()`) was considered and rejected too: an observation by a client of a seat it does
      not own is still unreliable, and repairing the field would invite new readers of something we
      intend to delete. Nikolay: *"assume all 3 values other than the mover's clock are unreliable
      and should be deprecated and eventually removed... better to get rid of them and reduce
      confusion rather than fixing them with no purpose."* Short comments now mark them in
      `roundCtrl.sendMove`, `game_bug_clocks.update_clocks`, `game_bug.play_move`,
      `bug/utils_bug.load_game` and `messages.ts`, so nobody starts reading them meanwhile.
      Superseded plan: **Or record it, and stop reconstructing anything.** The client that makes a ply already
      sends all four clocks; three of them are its own view of seats it does not own. Today those
      three are treated as noise — `roundCtrl.ts` says *"all those values are generally ignored on
      the server except the one for the current move"*. They could instead be kept deliberately, or
      the server could stamp its own view of the running seats at the moment it processes the ply.
      Not authoritative, but possibly accurate enough for a chart, and free of reconstruction.

- [x] 6.4 **MOVED OUT to its own postponed change, `bughouse-shrink-ply-clock-record`**, so it is
      tracked rather than carried here. It holds the evidence, the three decisions that must come
      first (how `load_game()` serves both shapes, what the message carries, whether `ply_clocks`
      survives) and the regression that matters most: an OLD fixture must still read correctly.
      Superseded text: **The eventual refactor, NOT now.** Reduce the per-ply record and the move message to the
      one number that means anything — the mover's own clock — and drop the other three from
      `ply_clocks`, `steps[].clocks/clocksB` and `MsgMove`. Old documents keep four; the reader
      already ignores three of them, so this is mostly deletion. Deliberately deferred: the comments
      are in place, nothing new reads these, and the display is already correct without it.
- [x] 6.3 **Decided — see 6.1 and 6.2.** Original: **Decide between them only after both are
      understood in detail.** Nikolay: *"sounds very
      complicated and not sure how reliable, so we will investigate in details before we decide."*
      Note 6.2 changes what is written and therefore has a migration question; 6.1 changes nothing
      stored and works on every game already in the database, including the two fixtures.


- [x] 4.4b **MOOT — the formula never changed.** This was written when finding 3 looked like a
      choice of definition; it turned out to be a spec to verify, so no new magnitudes were
      introduced. Three-digit differences were on screen throughout the suite (up to 599 in
      `sLF5O6kj`) and rendered normally. Superseded: check the indicator still fits its box at the
      new magnitudes.

## 5. Finding 4 — impossible clock values (REPRODUCE FIRST, fix after sections 2 and 3)

The evidence is in `ZdoeZseB` and is recorded in 2.6: board B white 60:00 → **41:14** on its first
move and then UP to 41:25 with no increment; board A white at 18:18 one move into a 90-second-old
game; `cbB` holding 10 entries where the other three hold 11. `PHdCmezP`, played cleanly the same
day, shows none of it.

Nothing can be fixed here until it happens on demand. The point of this section is to find the
smallest recipe that produces it.

- [x] 5.0 **First run, 2026-08-30, game `ctlVer5h` — four separate players, 60+0. Two results, and
      the sharper one needed no perturbation at all.**

      **(a) REFRESH IS CLEAN.** Hard-reloaded the window whose clock was RUNNING (p3, A-black on
      move), mid-game. Normalised for the 19.1s between probes, its view matched p1's exactly —
      running clocks 3541-19.1 = 3521.9 against 3522, stopped clocks identical to the second. The
      `+d/-d` invariant held across all four windows before and after. Refresh alone does not
      desync anything.

      **(b) A CLIENT'S REPORT OF CLOCKS IT DOES NOT OWN IS WRONG, AND IT IS WHAT GETS STORED.**
      From the server log and the resulting document:

      ```
      11:02:50  p1 moves e2e4 on board A, reporting  clocks=[3467122, 3600000]  clocksB=[3598890, 3600000]
      11:03:08  p4 moves e2e4 on board B, reporting  clocks=[3467122, 3600000]  clocksB=[3448958, 3600000]
      cwB = [3600000, 3598890, 3448958]
      ```

      Board B white had been running since the game began; its own report 18s later was 3448958, so
      at 11:02:50 it truly held about **3467000**. p1 reported **3598890** — as though 1.1s had been
      spent. **A 132-second error**, persisted verbatim, because `update_clocks()` stores all four
      values from whichever client moved.

      This is the same class of defect as `ZdoeZseB`'s `cwB` reading 41:14 one move into a
      90-second-old game, and it **reproduces on a clean four-player game with no reload, no
      disconnect and no simul** — so the three ingredients in 5.1 are not needed to produce a wrong
      recorded clock. They may still be needed for the *magnitude* seen in `ZdoeZseB` (18 minutes
      lost, and one array a whole entry short), which 5.1 still has to establish.

      Consequence beyond storage: the analysis page draws each ply's clocks from these arrays, so
      that game shows board B white at 59:58 at ply 1 when they really had 57:47.

- [x] 5.0b **REPRODUCED 2026-08-30, game `W2sRSUat` — clocks out of sync between browsers, and the
      cause is a stale clock ORIGIN for a board that has not moved yet.**

      **The symptom.** After p3 (A-black) went offline, premoved, watched its opponent move, and
      reconnected, its view of board B white read **52:37** where the owner p4 read **56:19** — 222s
      apart. The `+d/-d` invariant caught it instantly: p3 showed `+259/+41` and `-41/-259`, two
      magnitudes where there must be one. Before the disconnect the same window showed a clean
      `±17`.

      **It is not the client's reconnect handling.** A full page reload of p3 fetched the same wrong
      value (board B white 218s low), while board A white matched p4 to the second. So the SERVER's
      payload is wrong, and only for board B.

      **The cause.** `get_clocks_for_board_msg(full=True)` returns
      `last_move_clocks[board][colour] - elapsed`, and `elapsed_both_boards()` measures from
      `last_server_clock` / `last_server_clockB`. Those are set in `GameBugClocks.__init__` and reset
      only by `update_clocks()`, i.e. **by a move on that board**. Board B had made no move all game,
      so its origin was still the game object's construction — which is earlier than the game's
      start by however long the seek sat in the lobby waiting for its fourth player. Measured here:
      game start ~T0, server origin ~T0-219s, error 218-222s throughout.

      **Proof by the cure.** p4 then made board B's first move, which resets `last_server_clockB`.
      p3's view corrected itself to p4's exact value (3140) with no reload, and the invariant
      returned to a single `±19`. Nothing else changed.

      **Why it hid for so long.** At the very start of a game BOTH boards carry the stale origin, so
      both are wrong by the same amount and the `+d/-d` invariant still holds — the check cannot see
      it. The error only becomes visible in the window between the first move on one board and the
      first move on the other, which is exactly where nobody looks.

      **This is very likely `ZdoeZseB`'s "41:14 on move one".** A client that loaded or reconnected
      during that window took the server's too-low value for the board that had not moved, and then
      — per 5.0(b) — reported it back in its own move message for a seat it does not own, where
      `update_clocks()` persisted it. The two findings compound: a stale server origin poisons a
      client's view, and the client writes the poison into the record.

- [x] 5.0c **Premove across a disconnect: no defect found in the premove itself.** p3 armed a premove
      while offline, p1 moved on board A while p3 was away, p3 reconnected: the opponent's move was
      applied and the premove fired and was accepted (`lastA` = g8f6, premove cleared, movelist
      grew). The damage was entirely in the clocks, per 5.0b. The sub-scenario where the player's own
      previous move has not propagated is still untested.

- [x] 5.0d **The first explanation for 5.0b was WRONG, and the server is cleared.** S6 in
      `stress-tests.md`: a reconnect before either board had moved, after 84s of lobby waiting,
      received `clocks: [3555411, 3600000]` and `clocksB: [3555411, 3600000]` against a true value of
      3555411 — exact on both boards. So the clock origin is the game's start, lobby time does not
      leak in, and `GameBug` is indeed constructed only when the fourth seat fills
      (`utils_bug.py:535`). No fix was applied on the strength of the wrong story.

      What remains true is the OBSERVATION: in `W2sRSUat`, where board A had moved and board B had
      not, a reconnecting client's view of board B was 222s below the owner's, a full page reload
      fetched the same wrong value, and board B's first move cured it everywhere at once. The
      asymmetry — one board moved, one not — is the only difference from the clean case, so that is
      where the fault is. Next: S6b, the same shape with the payload logger installed, which
      separates a wrong number sent from a wrong number rendered.

- [x] 5.0e **S6b RUN, MECHANISM FOUND, BUG FIXED 2026-08-30.** Board A moved once, board B left
      untouched, then a client disconnected and reconnected with the inbound payload logged.

      **The server is innocent and the client double-counts.** Server sent
      `clocksB: [3202447, 3600000]`; independent truth `3600000 - (t - T0) = 3202435`; the page
      rendered **2801s**. The gap is the elapsed time subtracted twice — once correctly by the
      server, once again by the client.

      **Cause** (`client/clock.ts`): a `Clock` renders `duration - (now - startTime)`; `setTime()`
      writes `duration` alone and `start()` early-returns `if (this.running)` without refreshing
      `startTime`. `updateClocks()` sets both clocks and calls `start()` on the one to move — which
      on a full board message is often ALREADY running, so its origin stays stale. The error equals
      the age of `startTime`: 57s for board A (last move 57s earlier), 397s for board B (no moves at
      all). Hence the asymmetry that S3 and S6 bracketed.

      **Fix**: `nextClock.pause(false)` before the `setTime` calls in
      `client/two-board/round/roundCtrl.ts:updateClocks()`, so the following `start()` refreshes the
      origin. Deliberately NOT inside `setTime()`: `client/roundCtrl.ts` calls
      `setTime(duration + 15000)` on running clocks to add time and depends on `startTime` surviving.

      **Verified on the same scenario**: server 2998585, page 2993, truth 2993, `PB.invariant()`
      `ok:true` with `[269,269] / [-269,-269]`, and the owner's window agreed within a second.
      Gates: `yarn typecheck` clean, `yarn test` 262/262.

- [x] 5.1 **DONE — none of the three ingredients is required.** Row 3 (simul alone) ran as S9 and was
      clean: four equal-length, non-increasing arrays. Row 2 (drop with queued moves) ran as S3/S5/S7
      and produces no corrupt array either. And the plainest case of all — no simul, no reload, no
      drop (S11, `sLF5O6kj`) — DOES corrupt the record, with 447s of error on a seat the mover does
      not own. So the ingredient list was a red herring: finding 4 needs nothing but a second board.
      What the ingredients still explain is `ZdoeZseB`'s SHORT array, and that is S5's rejected-move
      mechanism (a rejected move still appends to `ply_clocks`), not a clock bug.
      Superseded plan: **Separate the three ingredients.** `ZdoeZseB` had all of them at once, so none is yet
      implicated. Play one clean four-player game per row and check the four arrays after each:

      | # | simul seats | page reload mid-game | websocket drop with queued moves | expect |
      |:--|:--|:--|:--|:--|
      | 1 | no | **yes** | no | ? |
      | 2 | no | no | **yes** | ? |
      | 3 | **yes** | no | no | ? |
      | 4 | **yes** | **yes** | **yes** | the `ZdoeZseB` shape, if the recipe is complete |

      A reload and a drop are not the same event: the harness's hard reload closes the socket AND
      re-mounts the page, while a drop can be forced alone by killing the connection (offline mode,
      or stopping the server briefly) and moving while it is down.

      **HARNESS HAZARD, learned the hard way on the first run.** Do NOT leave a client disconnected
      long enough to hit the abandon threshold: `ABANDON_TIMEOUT` is 30s, doubled to **60s** for
      `base >= 3` (`server/user.py:123,409`). A `SIGSTOP` on a profile's Chrome processes freezes
      that client cleanly, but the first attempt ran ~2.5 minutes — `pkill -f` matched its own shell
      and froze it too — and the game was ABANDONED before anything could be measured, making the
      test game useless for its actual purpose. Keep freezes well under a minute, and write the
      pattern so it cannot match the invoking shell (`profiles/p[3]`, not `profiles/p3`).
- [x] 5.2 **Done and now part of the runbook.** Lengths are checked on every recorded game;
      `sLF5O6kj` and `Pe7KfYvc` both came out correct (plies + 1 in all four arrays), which is what
      isolates the short-array anomaly to the rejected-move path rather than to the clocks.
      Original: **Check the array lengths first, on every run.** Unequal lengths are the cheapest signal —
      `cbB` was one short — and they can be read straight from MongoDB without any page.
- [x] 5.3 **Done, and it caught the rise.** `sLF5O6kj`'s `cbB` rises 1ms between two plies the seat
      did not play — the same shape as `ZdoeZseB`'s 41:14 -> 41:25, at a scale that confirms the
      mechanism without needing that game. Monotonicity per seat is now one of the assertions listed
      in the runbook for a future integration test.
      Original: **Then check monotonicity.** With no increment every array must be non-increasing. A rise
      (41:14 → 41:25) means a stale local copy was written over a fresher one, which points at the
      client sending all four seats' clocks when it owns only one — the known shape of this data.
- [x] 5.4 **ANSWERED — the `-1` is deliberate, and it is the whole reason S10 existed.**
      `recordPendingMove()` blanks the clocks to `[-1, -1]` before storing, because a queued move's
      clock times are meaningless by the time it is resent. So `handle_reconnect_bughouse` MUST
      substitute the server's own clocks on a replay, which is exactly what makes the mover's locally
      paused value stale — see S10, now fixed. Observed directly on `aMyeueDb`:
      `{"move":"e2e4","clocks":[-1,-1],"clocksB":[-1,-1],"ply":1,"board":"b"}`.
      Superseded plan: **Suspect `movesQueued` specifically.** The reconnect logs show moves replayed with
      `clocks: [-1, -1]`, and `bug/utils_bug.py play_move` is then called with the server's own
      values. Establish what a `-1` becomes once it reaches `ply_clocks`, and whether a replayed
      move records the clock as it was when the move was MADE or when it was replayed.
- [x] 5.5 **DECIDED 2026-08-30 — nothing changes on the server; the fix is one client consumer.**
      Nikolay: *"what is wrong with the server storing the clock values for the clocks the user
      doesn't own... just storing them is good, we can cross-check and investigate discrepancies
      later."* Verified that nothing uses them: `update_clocks()` runs before `push(move)`, so only
      `last_move_clocks[board][mover]` is taken as authoritative, and `restart()`,
      `get_clocks_for_board_msg()`, the flag stopwatch, the round page and `movetimeChart` all read
      authoritative values only. The single consumer that renders a stored copy as fact is
      `analysisClock.ts:59-64`. Superseded plan: decide the fix and do it after sections 2 and 3.
- [x] 5.6 **DONE via 6.1** — `reconstructMainlineClocks()`, mover values only, no `ts` needed.
      Original: **Fix `analysisClock.ts` — and it is section 6's work, not a separate one.** Rendering a
      ply needs each seat's clock AT that ply: authoritative for the seat that moved (identifiable
      from `o` / `step.boardName` + `turnColor`, the same way `movetimeChart` already does it), and
      RECONSTRUCTED from `ts` for the seat still thinking on the other board. Do 6.1 first and this
      falls out of it. Do NOT "fix" it by blanking the other three — a bughouse analysis board
      without its four clocks is worse than one with a stale value, and the reconstruction is known
      to work (it predicted the recorded disagreement on 31 of 32 plies within a second).

## 7. Close out

- [x] 7.1 **DONE — `data.md` now carries both tables re-derived from `sLF5O6kj`**, a fresh
      four-player game read through the fixed path, with each finding checked separately: no offset
      (arrays are `plies + 1` and the page matches the table index for index at plies 2 and 6, where
      bB now reads 52:33 instead of 59:59), no unexplained zeros (0 of 10 own-move think times), and
      all four indicators agreeing at every ply. `JJgZzLhJ`'s tables are kept above it, labelled as
      measured through the shifted read.
- [x] 7.2 Gates run for everything committed so far: `yarn typecheck`, jest 262/262, and
      `ruff format` / `ruff check` / `pyright` for the server edits (`utils_bug.py` read-back fix,
      plus comment-only changes in `game_bug.py` and `game_bug_clocks.py`).
- [x] 7.3 **Answered: the read-back was at fault, so nothing happens to the stored games.** They are
      unchanged and now read correctly. Superseded question: If the recording rather than the
      read-back turns out to be at fault, decide what happens to
      games already saved — they can be interpreted correctly but not repaired.
