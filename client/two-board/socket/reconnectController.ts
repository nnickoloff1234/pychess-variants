import { BugBoardName } from '../../types';
import { MsgMove, MsgMovesAfterReconnect } from '../../messages';
import {
    clearPendingMoves,
    consumePendingMove,
    loadPendingMoves,
    pendingMove,
    reconcilePendingMove,
    recordPendingMove,
} from './pendingMoves';

/* RECONNECTION AND RESYNCHRONISATION, IN ONE PLACE.
 * ==================================================================================================
 *
 * Everything here used to be decided in six places: the socket's open handler, four entry points of
 * the move cache, a field on the round controller, the board-message handler, the snapshot applier
 * and the clock resync. Each carried a correct note about the case it handled; none of them said
 * that reconnection was the subject. Answering "what happens if I reload while my move is in flight
 * and the other board has moved twice" meant holding all six in your head at once.
 *
 *
 * THE DECISION TREE
 * -----------------
 * The source of truth for this file and for the tests that cover it. Read a path top to bottom and
 * it is a sentence. Every branch is numbered; the code below quotes those numbers where it decides,
 * and so does every test in `tests/reconnectController.test.ts`. Where the code does not yet do what
 * a branch says, the branch says so.
 *
 *   1  a connection is established
 *   |
 *   +-- 1.1  nothing was waiting to be sent
 *   |   |
 *   |   +-- 1.1.1  the game has finished
 *   |   |            show the result, stop all four clocks, forget the game
 *   |   |
 *   |   +-- 1.1.2  nothing changed while we were away
 *   |   |            take all four clocks, the board stays ours to play
 *   |   |
 *   |   +-- 1.1.3  moves happened while we were away
 *   |   |            take the position, the move list and all four clocks,
 *   |   |            jump to the newest move, the board stays ours to play
 *   |   |
 *   |   +-- 1.1.4  the position is OLDER than the one we hold
 *   |                a move we have already been shown is missing from it
 *   |
 *   |                take the position anyway — it is the only truth left; a
 *   |                move the server cannot remember did not survive, whatever
 *   |                we were told earlier
 *   |
 *   |                the board STAYS PLAYABLE, and that is the difference from
 *   |                1.2.3: nothing of ours is in flight, so there is no move
 *   |                to race, and playing it again is the whole of the repair
 *   |                available to the reader. shutting the board would block it
 *   |
 *   |                SAY SO. the harm in this branch is not the rollback, which
 *   |                cannot be undone from here — it is accepting one in
 *   |                silence, which is what every other branch under 1.1 would
 *   |                do with it
 *   |
 *   +-- 1.2  a move was waiting to be sent
 *       |
 *       +-- 1.2.1  the new position already contains it
 *       |            forget the waiting move, take all four clocks,
 *       |            the board stays ours to play
 *       |
 *       +-- 1.2.2  the new position cannot accept it
 *       |            drop the waiting move — it can never be played, and keeping
 *       |            it would send it again on every reconnection for the rest of
 *       |            the game — then the board is ours to play again
 *       |
 *       +-- 1.2.3  the new position does not contain it, but could accept it
 *           |        send the move again, and take that board's moves away
 *           |        (applying the position has just handed the turn back to us,
 *           |         so this undoes that rather than keeping anything shut)
 *           |
 *           |        the board then accepts no move, and no premove is released
 *           |        into THIS position. A premove can still be ARMED, which is
 *           |        deliberate: a premove is an intention for a position that has
 *           |        not arrived yet, and what must not happen is it firing into a
 *           |        position we already know is behind
 *           |
 *           |        this holds whether this page sent the move or an earlier one
 *           |        did and was reloaded: a move waiting in either record is a
 *           |        move waiting, and which page sent it was never the question
 *           |
 *           +-- 1.2.3.1  the server plays it
 *           |              take that board's two clocks even though ours is
 *           |              stopped, forget the waiting move, give the board back
 *           |
 *           +-- 1.2.3.2  the server stays silent      (it already had that move)
 *           |              nothing comes back; the next position it sends contains
 *           |              the move, and that is what lets us forget it — which is
 *           |              branch 1.2.1 reached a second time
 *           |
 *           +-- 1.2.3.3  the server refuses it        (the game is already over)
 *           |              forget everything; the result arrives with the position
 *           |
 *           +-- 1.2.3.4  the server rejects it        (it does not fit the position)
 *                          the game is NOT ended. The server hands back the position
 *                          it holds and waits; we reset to it, and branch 1.2.2
 *                          drops the move the next time we look at it
 *
 *
 * AND THE SAME QUESTIONS FOR A SINGLE MOVE, which is the other way news arrives
 * ----------------------------------------------------------------------------
 *
 *   2  one move arrives
 *   |
 *   +-- 2.1  somebody else made it
 *   |   |
 *   |   +-- 2.1.1  it is the next move in the game
 *   |   |            show it, take that board's two clocks, let a move queued
 *   |   |            behind it go, leave the other board alone
 *   |   |
 *   |   +-- 2.1.2  it is older than what we are already showing
 *   |   |            take that board's two clocks and nothing else — the position
 *   |   |            stays where the reader put it
 *   |   |
 *   |   +-- 2.1.3  it is further ahead than the next move
 *   |                a move we were never told about is missing between us and it,
 *   |                so applying this one would skip a ply the reader never saw
 *   |
 *   |                take that board's two clocks, leave the position, and SAY SO
 *   |
 *   |                the same treatment as 2.1.2 and for the opposite reason: there
 *   |                we are ahead of the message, here the message is ahead of us,
 *   |                and only one of those is a gap in what we know. we cannot ask
 *   |                for the missing move from here — a full position is what fills
 *   |                a hole, and the next one will
 *   |
 *   +-- 2.2  it is our own move coming back
 *       |
 *       +-- 2.2.1  we sent it once and waited
 *       |            show the position, keep every clock we have
 *       |
 *       +-- 2.2.2  we had to send it again after a break
 *                    show the position, and take that board's two clocks from the
 *                    server: it charged the disconnected time to us and our own
 *                    reading never saw it
 *
 * WHICH CLOCKS COME FROM THE SERVER, AND WHICH KEEP TICKING HERE
 * --------------------------------------------------------------
 * There are four clocks — two on each board — and they are never all decided together. Clocks are
 * taken a BOARD AT A TIME, both of that board's clocks at once, because a message about one board
 * carries a trustworthy pair only for that board.
 *
 * A POSITION FOR THE WHOLE GAME, which is what a returning connection is given: all four clocks are
 * taken, both boards. This is the only case where every clock is replaced.
 *
 * SOMEONE ELSE'S MOVE: both clocks of the board that moved are taken. The two on the other board are
 * left alone and go on ticking here. The message does carry numbers for the other board and they are
 * not to be believed — only the clock belonging to the player who actually moved was measured by the
 * person whose clock it is; the rest are that player's browser reporting on clocks it does not own,
 * frozen at whenever they last started.
 *
 * OUR OWN MOVE: nothing is taken, normally. We stopped our own clock at the instant we sent the
 * move, and that reading is better than anything that can come back to us. The exception is a move
 * we had to send AGAIN after a break: the server replayed it with its own clocks and charged the
 * disconnected time to whoever was on move, which was us, so its number is the true one and ours is
 * the stale one — even though our clock is sitting still.
 *
 * AND A CLOCK IS ALWAYS STOPPED BEFORE IT IS SET. Setting a value on a running clock subtracts the
 * time since it started a second time, because the server has already deducted it. It never bites on
 * an ordinary move, where the clock being set is the one that was waiting; it bites on every
 * returning connection, which is exactly when both boards have a clock running.
 *
 *
 * WHAT IS NOT IN THE TREE, AND WHY
 * --------------------------------
 * HOW the connection broke does not appear anywhere in it. A dropped network, a sleeping laptop, a
 * page the reader reloaded and a server that went away all reach the same branches, because they
 * differ only in what they leave behind — and what they leave behind is already the first question
 * the tree asks. Asking "was this a refresh?" would be asking about the cause of a fact we can
 * simply look at.
 *
 * A RESTARTED SERVER IS THE ONE THING THAT BREAKS THAT SYMMETRY, and 1.1.4 is where it shows. Every
 * other break leaves the server ahead of us or level with us, because a server only moves forward;
 * a restart can leave it BEHIND, having acknowledged a move from memory and then died before the
 * write it had queued. Even then the tree is not asked what happened — it is asked what arrived,
 * and "a position missing a move we were shown" is a fact about the message, not about the cause.
 *
 * A restart also moves a journey from one branch to another WITHOUT changing what the reader sees.
 * `lastmovePerBoardAndUser`, the map the server uses to ignore a move a player has already made,
 * lives only in memory. So a move resent in a reconnect payload takes 1.2.3.2 (the server stays
 * silent) against a server that has been up all along, and 1.2.3.4 (the server rejects it and hands
 * back its position) against one that has just restarted. Both are correct and both end with the
 * client in step; it is only safe because a refused move no longer ends the game.
 *
 * A reloaded page loses the note that says WE are the ones waiting on a move, while the move itself
 * survives in storage. That used to matter — the board was handed back to a reader who still had a
 * move in flight — and it no longer does: a move waiting in either record now keeps the board shut,
 * so a page that has just started is as careful as one that has been running all along.
 *
 *
 * THE THREE THINGS THIS CLASS REMEMBERS
 * -------------------------------------
 * A MOVE WAITING TO BE SENT — kept in storage, so it survives the page. Nobody else has it: the
 * server can hand back the position, the move list and the clocks whenever we ask, but it cannot
 * hand back a move that never reached it.
 *
 * A MOVE THIS PAGE IS WAITING ON — kept in memory, so it dies with the page. It is a claim this page
 * is making, and a fresh page makes no claim. It exists beside the durable record so that a browser
 * refusing to store anything is still careful for as long as the page lives.
 *
 * The first two answer what sounds like one question, and they disagree in exactly one situation,
 * which is the defect described above.
 *
 * THE LAST MOVE WE HAVE BEEN SHOWN on each board — in memory, because it records what THIS page has
 * witnessed and a page that has just started has witnessed nothing. Branch 1.1.4 compares an
 * arriving position against it. It is fed from all three ways a move reaches us: a confirmation of
 * our own (2.2), somebody else's move (2.1.1), and a snapshot (1) — which is why branch 2.1 had to
 * come into this class before 1.1.4 could see a rollback that lost an opponent's move.
 */

/** What the caller should do with one board after a message. Data, not action: a decision that can
 *  be read, compared and tested without a socket, a server or a clock. */
export interface BoardDecision {
    /** May this board invite a move — from the reader or from a move queued behind the last one? */
    playable: boolean;
    /** Why, in one phrase, for the log and for the reader. */
    because: string;
    /** Branch 1.1.4 — the position that arrived is OLDER than one we had already been shown.
     *
     *  Separate from `because` because it is the one thing here a caller must ACT on rather than
     *  merely record: `roundCtrl` warns on it. Everything else in this type describes a normal
     *  outcome; this one says the server lost something it had already told us about. */
    rolledBack: boolean;
}

/* THE CLOCKS ARE NOT DECIDED HERE YET, and this type deliberately does not pretend otherwise. It
   once carried a `clocksFromServer` flag that was true in every branch and read by nobody, which
   said something untrue about the case where our own move comes back: there, the local reading is
   kept. The rule is written out above; moving it into this decision is work that has not been done,
   and a field that is always true is worse than an absent one. */

/** Where a single move sits relative to the position this page is showing.
 *
 *  A BOOLEAN WAS NOT ENOUGH, and that was finding 3 of the case-to-code audit. `latestPly` answered
 *  "is this the next move" with yes or no, so "older than what we show" and "further ahead than the
 *  next one" were the same no and got the same answer. They are opposite situations: in one we are
 *  ahead of the message, in the other the message is ahead of us and a move is missing in between.
 *  Naming three answers is what lets branch 2.1.3 exist at all. */
export type MovePlace = 'next' | 'older' | 'ahead';

/** What the caller should do with one arriving move. Data, not action — the same contract as
 *  `BoardDecision`, so a case can be read and compared without a socket, a board or a clock. */
export interface MoveDecision {
    /** Apply the position this message carries. */
    applyPosition: boolean;
    /** Take BOTH of that board's clocks. Never the other board's — see the clock rules above. */
    takeClocks: boolean;
    /** Let a move queued behind this one go. Only ever true when the position is applied: a premove
     *  released into a position we did not apply would be answering a question nobody asked. */
    releasePremove: boolean;
    /** Branch 2.1.3 — a move is missing between what we show and what arrived. Same standing as
     *  `BoardDecision.rolledBack`: the caller must SAY it, not merely record it. */
    movesMissing: boolean;
    /** Why, in one phrase, carrying the branch number. */
    because: string;
}

const BOARDS: BugBoardName[] = ['a', 'b'];

export class ReconnectController {
    private readonly gameId: string;

    /* THE MOVES THIS PAGE IS WAITING ON, per board. Set when a move goes out, cleared the moment
     * anything shows the server has dealt with it. Kept in memory on purpose: it is a claim this
     * page is making, and a page that has just started has made none. */
    private ahead: Partial<Record<BugBoardName, string>> = {};

    /* Set once the game has a result — branch 1.1.1. After that nothing may be sent and nothing is
     * waiting; `gameEnded()` is what bounds storage. */
    private finished = false;

    /* THE LAST MOVE THIS PAGE HAS BEEN SHOWN on each board — what branch 1.1.4 compares against.
     *
     * In memory, like `ahead` and for the same reason: it is what THIS page has witnessed, and a
     * page that has just started has witnessed nothing, so it has nothing to be surprised by. A
     * reload therefore cannot detect a rollback, which is honest — it has no earlier position of
     * its own to weigh the new one against.
     *
     * FED FROM THE TWO PLACES THIS CLASS LEARNS A POSITION: a confirmation of our own move (2.2)
     * and a snapshot (1). It is NOT fed from the opponent's single moves, because branch 2.1 is
     * still decided in `updateSingleBoardAndClocks` and never reaches this class — so a rollback
     * that loses only an opponent move we were told about separately goes undetected. That gap is
     * exactly the width of 2.1's absence, and it closes when 2.1 moves here. */
    private seen: Partial<Record<BugBoardName, string>> = {};

    /* Per-snapshot, not sticky: recomputed at the top of every `snapshot()` and read by `decide()`
     * in the same call. A rollback is an event, not a state to sit in. */
    private rolledBack: Partial<Record<BugBoardName, boolean>> = {};

    constructor(gameId: string) {
        this.gameId = gameId;
    }

    // -- what the client knows ---------------------------------------------------------------

    /** Is a move of ours still waiting on this board — to be sent, or to be answered?
     *
     *  EITHER RECORD SAYING SO IS ENOUGH, and that is the whole of it. There used to be a third
     *  answer here, "a move is waiting but this page did not send it", which is what a reloaded page
     *  finds — and the code treated that as though nothing were waiting, which is how a reader could
     *  be handed back a board with a move already in flight. The distinction was never worth making:
     *  what matters is whether a move is waiting, not which page sent it.
     *
     *  Both records are consulted rather than just the durable one, so that a browser refusing to
     *  store anything still keeps the board shut for as long as this page is alive. */
    waiting(board: BugBoardName): boolean {
        return pendingMove(this.gameId, board) !== undefined || this.ahead[board] !== undefined;
    }

    // -- events in -----------------------------------------------------------------------------

    /** The reader has committed a move. Both records are written here, and only here.
     *
     *  Not a branch of the tree: this is what CREATES the state the tree calls "a move was waiting
     *  to be sent" (1.2). */
    moveSent(message: MsgMove): void {
        recordPendingMove(this.gameId, message);
        this.ahead[message.board as BugBoardName] = message.move;
    }

    /** Branch 1 — a connection has been established. A reconnection and the first connection are the
     *  same code path and always have been.
     *
     *  Returns what to send. An empty queue still sends the message: the server handles it, and a
     *  client that skipped it would be deciding something it does not have to decide.
     *
     *  THE SERVER MAY ANSWER IN FOUR WAYS (1.2.3.1 to 1.2.3.4) AND ONE OF THEM IS SILENCE: it plays the move and tells
     *  everyone; it recognises a move it already has and says nothing at all; it refuses because the
     *  game is over; or it rejects the move because it does not fit the position, in which case it
     *  hands back the position it holds and waits (it used to end the game instead). Only the first
     *  sends a confirmation — which is why a move can also be forgotten by seeing it in a later
     *  position, and why that is a separate path from being told. */
    socketOpened(): MsgMovesAfterReconnect {
        return loadPendingMoves(this.gameId);
    }

    /** BRANCH 2 — one move has arrived, which is the other way news reaches this page.
     *
     *  `mine` says whether we made it — 2.1 or 2.2. `place` says where it sits relative to what we
     *  are showing, and is only consulted for somebody else's move: our own confirmation is always
     *  applied, because the position it carries is the one our own move produced.
     *
     *  EVERY MOVE PASSES THROUGH HERE, INCLUDING OTHER PEOPLE'S, and that is the point of the method
     *  rather than a side effect of it. Branch 1.1.4 detects a rolled-back position by comparing it
     *  against `seen`, and while 2.1 was decided in `roundCtrl` this class never learned of a move
     *  it did not make — so a rollback that lost only an opponent's move was invisible. The
     *  ownership gap and the detection gap were the same gap; this closes both.
     */
    moveArrived(
        board: BugBoardName,
        move: string | undefined,
        mine: boolean,
        place: MovePlace,
    ): MoveDecision {
        if (mine) return this.ourMoveCameBack(board, move);

        // 2.1 — somebody else made it. Their clocks are always taken: this message is the only
        // trustworthy report of that board's pair, whether or not we apply the position it carries.
        if (place === 'next') {
            // 2.1.1 — the next move in the game.
            if (move !== undefined) this.seen[board] = move;
            return {
                applyPosition: true,
                takeClocks: true,
                releasePremove: true,
                movesMissing: false,
                because: '2.1.1 the next move in the game',
            };
        }

        if (place === 'older') {
            // 2.1.2 — older than what we are already showing. The reader has scrolled back, or this
            // is a message we have already seen; either way the position they are looking at is not
            // ours to move.
            return {
                applyPosition: false,
                takeClocks: true,
                releasePremove: false,
                movesMissing: false,
                because: '2.1.2 older than what we are showing',
            };
        }

        // 2.1.3 — further ahead than the next move, so a move we were never told about is missing
        // between what we show and what arrived. NOT RECORDED IN `seen`: we have not been shown
        // this move, we have been shown a message about it, and treating it as seen would make the
        // very hole we are reporting invisible to 1.1.4 afterwards.
        return {
            applyPosition: false,
            takeClocks: true,
            releasePremove: false,
            movesMissing: true,
            because: '2.1.3 further ahead than the next move; one is missing in between',
        };
    }

    /** Branch 2.2 — the server has told us about a move of ours.
     *
     *  The clocks must come from the server when the move had been SENT AGAIN (2.2.2 rather than
     *  2.2.1). The server replays such a move with its own clocks — it has to, because the stored
     *  copy carries no usable times — and it charges the time spent disconnected to whoever was on
     *  move, which is us. The value we paused locally never saw that time pass, so it is the stale
     *  one, even though our clock is no longer running. Measured once at sixty-three seconds: the
     *  mover's own window was that much richer than every other window and than the saved game,
     *  permanently. A window cannot notice this on its own, because each window is internally
     *  consistent; only comparing a stopped clock across windows shows it.
     *
     *  THE OTHER HALF OF THAT CONDITION STAYS WITH THE CALLER. `roundCtrl` also takes the clocks
     *  when the seat's clock is still RUNNING, which means `sendMove()` never paused it in this
     *  page's lifetime — a fact about a Clock object this class has never held. It is ORed with
     *  what is decided here rather than folded in, so neither half has to pretend to know the
     *  other's business. Task 3.4 is where that division is settled for good. */
    private ourMoveCameBack(board: BugBoardName, move: string | undefined): MoveDecision {
        delete this.ahead[board];
        // A CONFIRMATION IS THE STRONGEST THING WE ARE EVER TOLD, and branch 1.1.4 exists because
        // it is not durable: the server can acknowledge a move from memory and then lose the write
        // it had not made yet. Remembering what we were told is what lets a later position be
        // recognised as older than it, rather than simply obeyed.
        if (move !== undefined) this.seen[board] = move;
        const resent = move !== undefined && consumePendingMove(this.gameId, board, move);
        return {
            applyPosition: true,
            takeClocks: resent,
            // Our own move coming back is not a position anything can be queued behind: whatever
            // was queued went out with it. The full path releases premoves after a snapshot; this
            // one has never released any, and that is unchanged.
            releasePremove: false,
            movesMissing: false,
            because: resent ? '2.2.2 sent again after a break' : '2.2.1 sent once and waited',
        };
    }

    /** Branch 1 — the server has sent an authoritative position, which is what every reconnection
     *  is answered with. `history` is every move played on each board.
     *
     *  A snapshot answers two questions at once — has our move landed, and may this board be played
     *  on — and the answers are per board. */
    snapshot(
        history: Record<BugBoardName, string[]>,
        playableNow: (board: BugBoardName, move: string) => boolean,
    ): Record<BugBoardName, BoardDecision> {
        for (const board of BOARDS) {
            const moves = history[board] ?? [];
            // Asked BEFORE reconcile, which may clear the very record that answers it, and before
            // `seen` is moved on to this position.
            this.rolledBack[board] = this.wentBackwards(board, moves);
            this.reconcile(board, moves, playableNow);
            const last = moves[moves.length - 1];
            if (last !== undefined) this.seen[board] = last;
        }
        return { a: this.decide('a'), b: this.decide('b') };
    }

    /** Branch 1.1.4 — is this position missing a move we have already been shown?
     *
     *  MOVES ARE COMPARED, NOT COUNTED, for the same reason `reconcile()` compares them: the move
     *  number counts both boards, so it advances when the other board plays and says nothing about
     *  this one. The same weakness applies as there — a move string that occurs twice in a game
     *  (a piece going out and back) can be found at its earlier occurrence, so a rollback of the
     *  second one is missed. Both are under-reporting, never false alarms, which is the right way
     *  round for something that will be shown to a reader. */
    private wentBackwards(board: BugBoardName, history: string[]): boolean {
        const last = this.seen[board];
        return last !== undefined && !history.includes(last);
    }

    /** Branch 1.1.1 — the game now has a result.
     *
     *  Nothing can be sent into a finished game, so a move still waiting is dead — including one the
     *  server quietly ignored, which nothing will ever come back to clear. This is what stops
     *  storage growing without bound: every game ends, and its entry goes when it does. */
    gameEnded(): void {
        this.finished = true;
        this.ahead = {};
        this.seen = {};
        this.rolledBack = {};
        clearPendingMoves(this.gameId);
    }

    // -- the decisions ---------------------------------------------------------------------------

    /** Has the position the server just sent overtaken the move we are still holding?
     *
     *  SEEING THE MOVE IN A POSITION IS ALSO AN ANSWER, and for a move that was sent again it is
     *  usually the only one there will be: the server says nothing at all about a move it already
     *  has, so a page waiting to be told waits for ever and sends the same move again on every
     *  later reconnection.
     *
     *  THE WHOLE MOVE LIST IS SEARCHED, NOT ONLY THE LAST MOVE. This is the one deliberate change of
     *  behaviour in this file. Looking only at the last move works while our move is the most recent
     *  thing on that board, and fails the moment the opponent has replied to it — then the last move
     *  is theirs, ours is never found, and it sits in storage until the game ends. The old code knew
     *  this and left it alone; the scenario bed reproduces it.
     *
     *  MOVES ARE COMPARED, NEVER MOVE NUMBERS. The move number counts both boards, so it advances
     *  when the other board plays — and comparing numbers would throw away a move that never reached
     *  the server, which is the one thing that can still rescue it.
     *
     *  Branches 1.2.1 and 1.2.2. Anything that survives both is 1.2.3, decided in `decide()`. */
    private reconcile(
        board: BugBoardName,
        history: string[],
        playableNow: (board: BugBoardName, move: string) => boolean,
    ): void {
        const ours = this.ahead[board] ?? pendingMove(this.gameId, board);
        if (ours === undefined) return;

        // 1.2.1 — the position already contains it.
        if (history.includes(ours)) {
            // The server has it. Nothing more will be said about it — a move it already holds is
            // answered with silence — so seeing it here is the only answer there will be.
            delete this.ahead[board];
            reconcilePendingMove(this.gameId, board, ours);
            return;
        }

        /* A WAITING MOVE THAT CANNOT BE PLAYED IN THIS POSITION IS DROPPED.
         *
         * Without this it would be sent again on every reconnection for the rest of the game. That
         * used not to matter, because a move the server refused ended the game; now it refuses the
         * move, hands back the position, and waits — so a client that keeps a move it can see is
         * impossible would send it for ever.
         *
         * Legality is asked of the caller rather than worked out here: this class has no board, and
         * a test can answer the question without one. */
        // 1.2.2 — the position cannot accept it.
        if (!playableNow(board, ours)) {
            delete this.ahead[board];
            reconcilePendingMove(this.gameId, board, ours);
        }
    }

    private decide(board: BugBoardName): BoardDecision {
        const rolledBack = this.rolledBack[board] === true;

        if (this.finished) {
            return { playable: false, because: '1.1.1 the game has a result', rolledBack };
        }

        /* A BOARD WITH A MOVE STILL WAITING MUST NOT INVITE ANOTHER.
         *
         * The snapshot has been applied in full and the player sees the server's truth — nothing is
         * hidden. But applying it recomputes our legal moves from the position it carried, so a
         * snapshot that predates our own move hands back a turn the server has already passed.
         * Anything that moves from there — a premove releasing itself, or the reader, who has just
         * watched their move vanish and may simply play it again — sends a move for a turn the
         * server is beyond. The server now answers that by handing back its position rather than by
         * ending the game, so the cost is no longer a lost game; it is a reader whose move is thrown
         * away without explanation, which is still worth preventing.
         *
         * How we get here: we made a move, and the position just sent is older than it. `reconcile()`
         * has already run, so a move the server does hold would no longer be waiting — what is left
         * is one it genuinely has not shown us. */
        if (this.waiting(board)) {
            return {
                playable: false,
                because: '1.2.3 a move of ours is still waiting on this board',
                rolledBack,
            };
        }

        /* 1.1.4 — THE POSITION IS OLDER THAN ONE WE HAVE ALREADY BEEN SHOWN.
         *
         * PLAYABLE, DELIBERATELY, AND THAT IS THE DIFFERENCE FROM 1.2.3. There, a move of ours is
         * in flight and a second one would race it, so the board is shut. Here nothing of ours is
         * in flight: the move is gone, the server has no record of it, and the recovery available
         * to the reader is to play it again. Shutting the board would block the only repair there
         * is.
         *
         * The position is taken as it stands, because it is the only truth left — a move the
         * server cannot remember did not survive, whatever we were told earlier. What must not
         * happen is taking it in SILENCE, which is what `rolledBack` is for. */
        if (rolledBack) {
            return {
                playable: true,
                because: '1.1.4 the position is older than one we were shown; a move has been lost',
                rolledBack,
            };
        }

        /* 1.1.2, 1.1.3 and 1.2.1 all arrive here: nothing of ours is waiting, or the position
         * already contains the move that was. Either way the server's state is the truth and the
         * board is the reader's to play. */
        return { playable: true, because: '1.1/1.2.1 in step with the server', rolledBack };
    }
}
