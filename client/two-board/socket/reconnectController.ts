import { BugBoardName } from '../../types';
import { MsgMove, MsgMovesAfterReconnect } from '../../messages';
import {
    clearPendingMoves,
    consumePendingMove,
    hasPendingMove,
    loadPendingMoves,
    reconcilePendingMove,
    recordPendingMove,
} from './pendingMoves';

/* RECONNECTION AND RESYNCHRONISATION, IN ONE PLACE.
 * ==================================================================================================
 *
 * Everything this file decides used to be decided in six: the socket's open handler, four entry
 * points of the move cache, an in-memory field on the round controller, the board-message handler,
 * the snapshot applier and the clock resync. Each of those carried a correct comment about the case
 * it handled, and none of them named reconnection as its subject — so answering "what happens if I
 * reload while my move is in flight and the other board has moved twice" meant holding all six in
 * your head at once.
 *
 * The behaviour here is the behaviour that shipped. It is the product of measured incidents, and
 * where it looks surprising the surprise is explained rather than removed. One deliberate change is
 * marked as such: see `reconcile()`.
 *
 * WHAT THE CLIENT ACTUALLY KNOWS, and it is less than it seems:
 *
 *   F3  a move of ours queued for resend      durable (localStorage), survives the page
 *   F5  a board we are AHEAD of               in memory, dies with the page
 *
 * They answer what looks like one question — is a move of ours outstanding? — and they disagree in
 * exactly one situation, which is why both exist. F3 outlives the page because a move typed before
 * a refresh still has to reach the server, and nobody else has it: the server can hand back
 * position, ply, turn and clocks whenever we ask, but it cannot hand back a move that never arrived.
 * F5 does not outlive the page because it describes a claim THIS page is making, and a new page
 * makes no claim.
 *
 * So the question has three answers, not two, and `unknown` is the whole of the reload problem
 * stated without mentioning reloads.
 */

/** Is a move of ours outstanding on this board? */
export type Outstanding =
    /** Nothing of ours is in flight. Histories: N1-N8, and every board we are not playing. */
    | 'no'
    /** This page sent it and has not been answered. Histories: Q1-Q6, Q9, Q10. */
    | 'yes'
    /** Something is queued and THIS PAGE never saw its fate. Histories: Q7, Q8 — and any other way
     *  of arriving at a page that holds a queued move it did not send. */
    | 'unknown';

/** What the caller should do with one board after a message. Data, not action: a decision that can
 *  be read, compared and tested without a socket, a server or a clock. */
export interface BoardDecision {
    /** May this board invite a move — from the player or from a premove? */
    playable: boolean;
    /** Should the clocks in this message overwrite the local ones for this board? */
    clocksFromServer: boolean;
    /** Why, in one phrase, for the log and for the reader. */
    because: string;
}

const BOARDS: BugBoardName[] = ['a', 'b'];

export class ReconnectController {
    private readonly gameId: string;

    /* F5. Set when a move goes out, cleared the moment anything shows the server has dealt with it.
     * Deliberately NOT the durable cache: made durable it would gate boards after a reload on the
     * strength of a move the server may already have. */
    private ahead: Partial<Record<BugBoardName, string>> = {};

    /* Set once the game has a result. After that nothing may be resent and nothing is outstanding —
     * see `gameEnded()`, which is what bounds the cache. */
    private finished = false;

    constructor(gameId: string) {
        this.gameId = gameId;
    }

    // -- what the client knows ---------------------------------------------------------------

    /** The three-valued answer. Everything below is expressed in terms of it. */
    outstanding(board: BugBoardName): Outstanding {
        if (this.finished) return 'no';
        const queued = hasPendingMove(this.gameId, board);
        if (!queued) return 'no';
        return this.ahead[board] !== undefined ? 'yes' : 'unknown';
    }

    /* HOW `unknown` IS ANSWERED, and it is the one open decision in this file.
     *
     * Today it is answered as `no`: a page holding a queued move it did not send leaves its board
     * playable while the resend is in flight. Answering it as `yes` instead would gate the board
     * until something replies — safe, at the cost of a briefly unplayable board in the case where
     * nothing was really outstanding. Both are defensible; the current behaviour is preserved here
     * so that this change moves the decision without also making it.
     *
     * Whichever it becomes, it belongs HERE and not at the six call sites. */
    private treatsUnknownAsAhead(): boolean {
        return false;
    }

    private isAhead(board: BugBoardName): boolean {
        const answer = this.outstanding(board);
        return answer === 'yes' || (answer === 'unknown' && this.treatsUnknownAsAhead());
    }

    // -- events in -----------------------------------------------------------------------------

    /** E6: the player committed a move. Both records are written here, and only here. */
    moveSent(message: MsgMove): void {
        recordPendingMove(this.gameId, message);
        this.ahead[message.board as BugBoardName] = message.move;
    }

    /** E1: the socket opened — a reconnection, or the first connection, which are the same code
     *  path and always have been.
     *
     *  Returns what to send. An empty queue still sends the message: the server handles it, and a
     *  client that skipped it would be deciding something it does not have to decide.
     *
     *  THE SERVER MAY ANSWER IN FOUR WAYS AND ONE OF THEM IS SILENCE: it plays and broadcasts the
     *  move (Q1, Q4); it recognises a duplicate and returns without broadcasting (Q2, Q3, Q7); it
     *  refuses because the game is finished (T1, T2, T3); or the move is no longer legal and the
     *  game ends against us. Only the first produces a confirmation, which is why `reconcile()`
     *  exists as a separate way for a cache entry to be cleared. */
    socketOpened(): MsgMovesAfterReconnect {
        return loadPendingMoves(this.gameId);
    }

    /** E3: the server confirmed a move of ours.
     *
     *  Returns whether the SERVER's clocks must win for that board. They must when the move was
     *  RESENT: the server replayed it with its own clocks — it had to, the queued copy carries
     *  `[-1, -1]` — and charged the stall to the seat whose turn it still was, which is ours. The
     *  value we paused locally never saw that stall, so it is the stale one even though our clock is
     *  not running. Measured on `aMyeueDb`: the mover held 3576 while every other window and the
     *  record held 3513, permanently. A single window cannot see this; only a cross-window
     *  comparison of a stopped clock can. */
    ownMoveConfirmed(board: BugBoardName, move: string | undefined): boolean {
        delete this.ahead[board];
        return move !== undefined && consumePendingMove(this.gameId, board, move);
    }

    /** E2: an authoritative board state arrived. `history` is every move played on each board.
     *
     *  A snapshot answers two questions at once — has our move landed, and may this board be played
     *  on — and the answers are per board. */
    snapshot(history: Record<BugBoardName, string[]>): Record<BugBoardName, BoardDecision> {
        for (const board of BOARDS) this.reconcile(board, history[board] ?? []);
        return { a: this.decide('a'), b: this.decide('b') };
    }

    /** E5: the game has a result. */
    gameEnded(): void {
        this.finished = true;
        this.ahead = {};
        /* Nothing can be resent into a finished game, so whatever is still cached is dead —
         * including an entry the server deduplicated in silence, which no confirmation will ever
         * clear. This is what bounds the cache: every game ends, and every game's key goes with it.
         * Histories: T1, T2, T3. */
        clearPendingMoves(this.gameId);
    }

    // -- the decisions ---------------------------------------------------------------------------

    /** Has this board's authoritative history overtaken the move we are holding?
     *
     *  THE SNAPSHOT IS ALSO AN ANSWER, and for a resent move it is usually the ONLY one: the server
     *  drops a duplicate and returns without broadcasting, so a client waiting for a confirmation
     *  waits forever and resends the same move on every later reconnection.
     *
     *  SEARCHED THROUGH THE WHOLE HISTORY, NOT JUST THE LAST MOVE — and this is the one deliberate
     *  behaviour change in this file. Matching only the last move covers Q2 and Q7, where our move
     *  is the most recent thing on the board, and misses Q3, where the opponent has replied on top
     *  of it: the last move is then THEIRS, ours never matches, and the entry survives until the
     *  game ends. The shipped code says so itself — "a snapshot taken after the opponent has replied
     *  shows their move here, not ours" — and left it to `clearPendingMoves()`. The reconnect
     *  scenario bed reproduces it as Q3.
     *
     *  MATCHED ON THE MOVE, NEVER ON A PLY. The global ply advances on the OTHER board's moves too
     *  (histories N2, N5, Q4), so a ply comparison would also discard an entry whose move never
     *  reached the server — and that entry is the only thing that can still recover it. */
    private reconcile(board: BugBoardName, history: string[]): void {
        const ours = this.ahead[board];
        if (ours !== undefined && history.includes(ours)) delete this.ahead[board];
        for (const move of history) reconcilePendingMove(this.gameId, board, move);
    }

    private decide(board: BugBoardName): BoardDecision {
        if (this.finished) {
            return { playable: false, clocksFromServer: true, because: 'the game has a result' };
        }

        /* A BOARD WE ARE AHEAD OF MUST NOT INVITE A MOVE.
         *
         * The snapshot has been applied in full and the player sees the server's truth — nothing is
         * hidden. But applying it recomputes our legal moves from the position it carried, so a
         * snapshot that predates our own move hands back a turn the server has already passed.
         * Anything that moves from there — a premove releasing itself, or the player, who has just
         * watched their move vanish and may simply play it again — sends a move for a ply the server
         * is beyond, and the server ends the game as INVALIDMOVE against us.
         *
         * Reached by: Q1, Q4, Q9, Q10 — our move queued and the snapshot older than it. Narrowed by
         * `reconcile()` above, which has just removed this board from `ahead` if the history
         * contains our move (Q2, Q3, Q5, Q6, Q7). What is left is genuinely unresolved. */
        if (this.isAhead(board)) {
            return {
                playable: false,
                clocksFromServer: true,
                because: 'we are ahead of the server on this board',
            };
        }

        /* Reached by: N1 (nothing happened), N2/N3 (only the other board moved), N4/N5/N6/N8 (the
         * opponent moved while we were away), Q2/Q3/Q7 (our move is already in the history). In all
         * of them the server's state is the truth and the board is ours to play. */
        return { playable: true, clocksFromServer: true, because: 'in sync with the server' };
    }
}
