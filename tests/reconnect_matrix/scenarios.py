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
    notes: str = ""
    params: dict = field(default_factory=dict)


# The checks each scenario asserts after recovery. Every name here is implemented in driver.CHECKS.
#   cache_empty      the resend cache holds nothing for this game
#   our_move_played  the move we committed appears in the record
#   invariant        PB.invariant() — one running clock per board, badges consistent
#   playable         our board accepts a selection (dests appear)
#   locked           our board refuses a selection (the ahead-of-server gate)
#   opp_move_seen    the opponent's move made during the gap is on our board
#   ply_advanced     our ply is at least what it was before the break
#   game_over        the client knows the game ended
#   clocks_agree     our four clock readings match the other window's, allowing for tick

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
        ("cache_empty", "invariant"),
        blocked="two contexts cannot stage it: taking the camera offline removes a seat from BOTH "
        "boards, so the other board can advance one ply and never reach a capture. Needs four "
        "contexts, one per seat.",
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
        blocked="collapses into N5: clocks are wall-clock derived and self-correct across a freeze",
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
        (),
        blocked="needs a simul seating where one user holds both seats of a team; the bed seats one user per team",
    ),
    # ---- T: terminal ---------------------------------------------------------------------------
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
        ("our_move_played", "invariant"),
        blocked="needs test-users-survive-restart (the players) and "
        "bughouse-persist-moves-as-played (the game); today it returns at ply 0",
    ),
]


def by_id(scenario_id: str) -> Scenario:
    for s in SCENARIOS:
        if s.id == scenario_id:
            return s
    raise KeyError(scenario_id)
