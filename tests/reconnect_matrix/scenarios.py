"""The scenario catalogue, as data.

Ids and titles are the ones in `scenarios-network-events.md` so the bed and the analysis cannot
drift. `stage` names the staging recipe in `driver.py`; `blocked` states why a scenario cannot run
yet, and a blocked scenario is still listed — that is the point of a checklist.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Scenario:
    id: str
    series: str
    title: str
    history: str
    stage: str  # the recipe in driver.py
    expect: tuple[str, ...]  # named checks, defined in driver.CHECKS
    blocked: str | None = None
    # NOT THE SAME THING AS BLOCKED, and conflating them made the checklist read as if it carried
    # more debt than it does. `blocked` is "we cannot stage this yet"; `collapsed` is "this is not a
    # distinct case at all" — it reduces to another scenario, so there is nothing to build.
    collapsed: str | None = None
    notes: str = ""
    params: dict = field(default_factory=dict)


# The checks each scenario asserts after recovery. Every name here is implemented in driver.CHECKS.
#   cache_empty              the resend cache holds nothing for this game
#   our_move_played          the move we committed appears in the server's record
#   both_queued_moves_played both halves of a simul player's outstanding pair reached the server
#   invariant                PB.invariant() — one running clock per board, badges consistent
#   playable                 our board accepts a selection (dests appear)
#   locked                   our board refuses a selection (the ahead-of-server gate)
#   playable_gate_held       the board was NOT offered while a move of ours was outstanding
#   opp_move_seen            the opponent's move made during the gap is on our board
#   client_matches_server    our board shows the server's last move for that board
#   ply_advanced             our ply is at least what it was before the break
#   one_move_lost_at_most    a second move did not erase the first from every record
#   no_invalid_move          the game was not ended against us by a move we were invited to make
#   no_silent_rollback       a position older than ours was reported (branch 1.1.4), not obeyed mutely
#   server_kept_the_game     a restart rebuilt the game with its moves, not an empty one at ply 0
#   record_written           the DOCUMENT holds the ending, not merely the in-memory game
#   game_over                the client knows the game ended
#   clocks_agree             our four clock readings match the other window's, allowing for tick

SCENARIOS = [
    # ---- N: nothing of ours in flight -------------------------------------------------------
    Scenario(
        "N1",
        "N",
        "reconnect, nothing happened",
        "B1 . U0 . O0 . X0",
        "offline_then_online",
        ("cache_empty", "invariant", "playable"),
    ),
    Scenario(
        "N2",
        "N",
        "reconnect, the other board moved",
        "B1 . U0 . O0 . X1",
        "offline_other_board_moves_online",
        ("cache_empty", "invariant", "ply_advanced"),
    ),
    Scenario(
        "N3",
        "N",
        "reconnect, a capture on the other board fed our pocket",
        "B1 . U0 . O0 . X2",
        "offline_other_board_capture_online",
        ("server_pocket_fed", "pocket_gained", "cache_empty", "invariant"),
        params={"windows": 3},
        notes="unblocked 2026-09-06 with a THIRD window. Only our teammate can put a piece in our "
        "pocket, and the two-window seating puts our teammate in our own browser — so switching us "
        "off switched off the only player who could feed us. Three windows (us / teammate / the "
        "opponent pair together) split the team, and the opponent needs to be passive only during "
        "the offline window, which it is: its two board-B moves set the position up beforehand. "
        "Four windows were not needed; that earlier claim was wrong.",
    ),
    Scenario(
        "N4",
        "N",
        "THE PLAIN RECONNECT: the opponent moved while we were away",
        "B1 . U0 . O3 . X0",
        "offline_opp_moves_online",
        (
            "cache_empty",
            "invariant",
            "client_matches_server",
            "opp_move_seen",
            "playable",
            "clocks_agree",
        ),
        notes="the baseline every other scenario is measured against; never run before",
    ),
    Scenario(
        "N5",
        "N",
        "as N4, and the other board moved too",
        "B1 . U0 . O3 . X1",
        "offline_opp_and_other_online",
        ("cache_empty", "invariant", "client_matches_server", "opp_move_seen", "ply_advanced"),
    ),
    Scenario(
        "N6",
        "N",
        "as N4, with a premove armed",
        "B1 . U2 . O3 . X0",
        "offline_premove_opp_moves_online",
        ("cache_empty", "invariant", "opp_move_seen"),
        notes="S3's shape; S3 found a 222s clock error here and its cause was never established",
    ),
    Scenario(
        "N7",
        "N",
        "frozen page rather than dropped socket",
        "B2 . — . O3 . X1",
        "collapsed_into_n5",
        (),
        collapsed="not a distinct case: clocks are wall-clock derived, so they self-correct across "
        "a freeze and a frozen page recovers exactly as N5 does. Nothing to stage.",
    ),
    Scenario(
        "N8",
        "N",
        "as N4, but the page was reloaded",
        "B3 . — . O3 . X1",
        "reload_after_opp_moves",
        ("cache_empty", "invariant", "client_matches_server", "opp_move_seen", "playable"),
    ),
    # ---- Q: a move of ours was queued ---------------------------------------------------------
    Scenario(
        "Q1",
        "Q",
        "queued a move offline, nothing else happened",
        "B1 . U1 . O0 . X0",
        "offline_move_online",
        ("cache_empty", "our_move_played", "invariant", "client_matches_server", "playable"),
    ),
    Scenario(
        "Q2",
        "Q",
        "our move arrived, the confirmation was lost",
        "B1 . U1 . O1 . X0",
        "move_lands_then_break",
        ("cache_empty", "our_move_played", "invariant", "client_matches_server"),
        notes="the review's sequence, steps 1-9",
    ),
    Scenario(
        "Q3",
        "Q",
        "our move arrived and the opponent replied",
        "B1 . U1 . O2 . X0",
        "move_lands_opp_replies_then_online",
        ("cache_empty", "our_move_played", "opp_move_seen", "invariant", "client_matches_server"),
    ),
    Scenario(
        "Q4",
        "Q",
        "queued a move; the other board moved meanwhile",
        "B1 . U1 . O0 . X1",
        "offline_move_other_board_online",
        ("cache_empty", "our_move_played", "invariant", "client_matches_server", "ply_advanced"),
    ),
    Scenario(
        "Q6",
        "Q",
        "queued move, opponent replied, premove behind it",
        "B1 . U3 . O2 . X0",
        "offline_move_premove_online",
        ("cache_empty", "our_move_played", "invariant", "client_matches_server"),
        notes="S5's shape; S5 found a severe bug here, since fixed",
    ),
    Scenario(
        "Q7",
        "Q",
        "RELOAD holding a queued move the server already has",
        "B3 . queued before the break . O1 . X0",
        "move_lands_then_reload",
        ("cache_empty", "our_move_played", "invariant", "client_matches_server"),
        notes="`unknown`, resolved: the reviewer's case. The cache must clear with no confirmation",
    ),
    Scenario(
        "Q8",
        "Q",
        "RELOAD holding a queued move the server never got",
        "B3 . queued before the break . O0 . X0",
        "offline_move_then_reload",
        ("cache_empty", "our_move_played", "invariant", "client_matches_server"),
        notes="`unknown`, unresolved: the resend is the only way the move survives",
    ),
    Scenario(
        "Q9",
        "Q",
        "both of us queued, the opponent returns after us",
        "B1 . U1 . O0 . X0 . C2",
        "both_offline_we_return_first",
        ("cache_empty", "invariant"),
        notes="S7 ran the premove orders; two queued moves on one board is impossible by rule 4",
    ),
    Scenario(
        "Q10",
        "Q",
        "simul: a queued move on each board",
        "B1 . U1 both boards . O0 . X0",
        "simul_two_queued",
        ("both_queued_moves_played", "cache_empty", "invariant"),
        notes="unblocked 2026-09-06: the blocked note was wrong. The camera ALREADY holds both "
        "seats of team 1 (board A white, board B black), which is the simul seating this needs — "
        "board B just has to be handed its turn first. The only scenario where the cache holds two "
        "entries at once.",
    ),
    # ---- R: races the gate is supposed to prevent -------------------------------------------
    Scenario(
        "Q11",
        "Q",
        "OVERWRITE RACE: move in flight, reload onto a stale snapshot, move again",
        "B3 . U1 . move in flight . X0",
        "move_in_flight_reload_move_again",
        ("no_invalid_move", "one_move_lost_at_most", "playable_gate_held"),
        notes="the second move is composed against a position the server has already left, and "
        "recordPendingMove overwrites the first move's cache entry on its way out. Staged "
        "with a server-side delay so the window is deterministic rather than a coin toss.",
    ),
    # ---- T: terminal ---------------------------------------------------------------------------
    Scenario(
        "R1",
        "R",
        "the gate, and whether reading the move list defeats it",
        "B1 . U1 . move held by the server . reader scrolls",
        "gate_survives_movelist_scroll",
        ("gate_holds", "no_invalid_move"),
        params={"hold_after": 2},
        notes="branch 1.2.3 shuts the board with a one-shot overwrite of the destination map, and "
        "`goPly()` recomputes that map whenever the reader returns to the last ply. No server "
        "message is involved: a player looking at the move list while waiting for a confirmation "
        "is the whole scenario. `locked` was declared as a check from the start and never asserted "
        "by anything, so the gate had never been tested at all.",
    ),
    Scenario(
        "R2",
        "R",
        "the reader scrolls back and a move arrives",
        "no break . the cursor moves . O1",
        "scroll_back_then_opponent_moves",
        ("no_false_gap_warning", "reader_not_yanked", "invariant"),
        notes="`this.ply` is the reader's CURSOR — `goPly()` writes it — and `place` classifies "
        "arriving messages against it, so a reader looking at an earlier ply makes the next move "
        "look further ahead than it is. Not applying it is right; calling it a missing move is "
        "not. The fix is to classify against `steps.length`, which is what we HOLD, and leave the "
        "cursor to the move list.",
    ),
    Scenario(
        "R3",
        "R",
        "a SPECTATOR scrolls back and a move arrives",
        "no break . a watcher's cursor moves . O1",
        "spectator_scrolls_back_then_a_move_arrives",
        ("spectator_not_yanked", "invariant"),
        params={"spectator": True},
        notes="R2's question asked of a spectator, who takes a different render path entirely — "
        "`updateBoardsAndClocksSpectors`, gated on a bare `latestPly`. The player path gained a "
        "second condition on 2026-09-07 and this one did not, so this is expected to FAIL until "
        "the spectator gate is given the same pair. The bed had never opened a spectator window, "
        "which is why the half-fix went unnoticed.",
    ),
    Scenario(
        "T1",
        "T",
        "the game ended while we were away",
        "any . — . O4 . —",
        "offline_game_ends_online",
        ("game_over", "cache_empty"),
    ),
    Scenario(
        "T3",
        "T",
        "away longer than the abandon timeout",
        "gap > abandon",
        "offline_past_abandon",
        ("game_over",),
        notes="~60s on a 60+0 game; the bed shortens the control to make this fast",
    ),
    Scenario(
        "T4",
        "T",
        "the server restarted under us",
        "B4",
        "server_restart",
        (
            "server_kept_the_game",
            "our_move_played",
            "no_silent_rollback",
            "client_matches_server",
            "invariant",
        ),
        notes="unblocked 2026-09-06: the players survive a restart (test-users-survive-restart) "
        "and so does the game (bughouse-persist-moves-as-played)",
    ),
    Scenario(
        "T5",
        "T",
        "the restart lost the ply it never wrote",
        "B4 . the accepted risk",
        "server_restart_loses_last_ply",
        ("server_kept_the_game", "no_silent_rollback", "no_invalid_move", "invariant"),
        params={"drop_writes_after": 2},
        notes="THE ACCEPTED RISK of per-ply persistence, staged by dropping the last write. The "
        "server comes back one ply BEHIND the clients — the shape branch 1 had no name for, since "
        "every branch there assumed the arriving position was at least as advanced as ours. Now "
        "branch 1.1.4: the position is taken (it is the only truth left) and REPORTED, and the "
        "board stays playable so the reader can play the lost move again. `no_silent_rollback` "
        "tests the silence, not the rollback.",
    ),
    Scenario(
        "T8",
        "T",
        "after a rollback, the game goes on",
        "B4 . the accepted risk . then one more move",
        "restart_rollback_then_play_on",
        (
            "play_continues_after_rollback",
            "rollback_damage_is_bounded",
            "swallowed_move_is_recovered",
            "invariant",
        ),
        params={"drop_writes_after": 2},
        notes="T5 stops at the rollback. This asks what happens next, because `latestPly` is false "
        "for a rolled-back snapshot — its ply is LOWER than ours — so `this.ply` is not advanced "
        "while the position IS applied. `this.ply` then describes a game the reader is no longer "
        "being shown, and later moves are judged against it. MEASURED with two follow-up moves, "
        "and by reading the PIECES rather than the highlight: the ply counter is stale by exactly "
        "the number of plies lost, so ONE move is swallowed and the next arrives normally. The "
        "swallowed move is never rendered as a move — no highlight, and the reader never sees it "
        "happen — and its board is stale only until the next move on EITHER board, which takes the "
        "partner position whole and repairs it.",
    ),
    Scenario(
        "T6",
        "T",
        "a queued move resent to a server that restarted",
        "B4 . U1 . the dedupe map is gone",
        "resend_across_restart",
        ("server_kept_the_game", "no_invalid_move", "cache_empty", "no_silent_rollback"),
        notes="`lastmovePerBoardAndUser` is memory-only, so a restart turns branch 1.2.3.2 (the "
        "server stays silent, it already had that move) into 1.2.3.4 (the server rejects it and "
        "hands back its position). Safe only because a refused move no longer ends the game.",
    ),
    Scenario(
        "T7",
        "T",
        "a game that survived a restart can still write its ending",
        "B4 . then the game ends",
        "restart_then_finish",
        ("server_kept_the_game", "record_written"),
        notes="regression guard for the `saved` flag: `load_game_bug_from_doc()` derives it from "
        "the move list, which per-ply persistence made non-empty for games still in progress, so "
        "every restored game came back believing it had already been written.",
    ),
]


def by_id(scenario_id: str) -> Scenario:
    for s in SCENARIOS:
        if s.id == scenario_id:
            return s
    raise KeyError(scenario_id)
