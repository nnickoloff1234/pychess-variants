/* The decision tree in `reconnectController.ts`, one test per path through it.
 *
 * Each test names the branch it covers. The numbers are the tree's, so a failure points at a branch
 * rather than at a method, and a branch with no number quoted here has no test.
 *
 * Each name is a sentence read off that tree, so a failure says which branch broke rather than which
 * method did. What these cannot reach is everything below "send the move again": whether the server
 * plays, ignores, refuses or rejects it is the server's behaviour, and it is covered by the scenario
 * bed in `tests/reconnect_matrix`. */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { ReconnectController } from '@/two-board/socket/reconnectController';
import { pendingMovesStorageKey, pendingMove } from '@/two-board/socket/pendingMoves';
import { MsgMove } from '@/messages';

const GAME = 'testgame';
const anything = () => true;
const nothing = () => false;

const move = (board: 'a' | 'b', uci: string, ply = 1): MsgMove =>
    ({ type: 'move', gameId: GAME, move: uci, clocks: [0, 0], clocksB: [0, 0], ply, board }) as MsgMove;

const stored = () => localStorage.getItem(pendingMovesStorageKey(GAME));

beforeEach(() => localStorage.clear());

describe('a connection is established, nothing was waiting to be sent', () => {
    // 1.1.2 — nothing changed while we were away.
    test('1.1.2  the board stays ours to play', () => {
        const ctrl = new ReconnectController(GAME);
        const decision = ctrl.snapshot({ a: [], b: [] }, anything);
        expect(decision.a.playable).toBe(true);
        expect(decision.b.playable).toBe(true);
    });

    // 1.1.3 — moves happened while we were away.
    test('1.1.3  moves by others change nothing about our right to play', () => {
        const ctrl = new ReconnectController(GAME);
        const decision = ctrl.snapshot({ a: ['e2e4', 'e7e5'], b: ['d2d4'] }, anything);
        expect(decision.a.playable).toBe(true);
    });
});

describe('a connection is established, the position went backwards', () => {
    // 1.1.4 — a move we have already been shown is missing from the position that arrived. Reachable
    // only from a server that acknowledged a move and then lost the write it had queued, which is
    // what `bughouse-persist-moves-as-played` made possible and scenario T5 stages.

    test('1.1.4  a position missing a move we were shown is reported, not obeyed in silence', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'g1f3'));
        ctrl.moveArrived('a', 'g1f3', true, 'next'); // the server said it had it

        // ...and then comes back without it.
        const decision = ctrl.snapshot({ a: ['e2e4', 'e7e5'], b: [] }, anything);

        expect(decision.a.rolledBack).toBe(true);
        expect(decision.a.because).toContain('1.1.4');
    });

    test('1.1.4  the board STAYS PLAYABLE, because replaying the move is the only repair', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'g1f3'));
        ctrl.moveArrived('a', 'g1f3', true, 'next');

        const decision = ctrl.snapshot({ a: ['e2e4', 'e7e5'], b: [] }, anything);

        // Unlike 1.2.3, which shuts the board because a move of ours is in flight. Nothing is in
        // flight here, and shutting it would stop the reader playing the lost move again.
        expect(decision.a.playable).toBe(true);
    });

    test('1.1.4  only the board that went backwards is reported', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'g1f3'));
        ctrl.moveArrived('a', 'g1f3', true, 'next');
        ctrl.moveSent(move('b', 'd2d4'));
        ctrl.moveArrived('b', 'd2d4', true, 'next');

        const decision = ctrl.snapshot({ a: ['e2e4'], b: ['d2d4'] }, anything);

        expect(decision.a.rolledBack).toBe(true);
        expect(decision.b.rolledBack).toBe(false);
    });

    test('1.1.3  a position that merely moved ON is not a rollback', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'g1f3'));
        ctrl.moveArrived('a', 'g1f3', true, 'next');

        // Our move is still there, with the opponent's reply on top of it.
        const decision = ctrl.snapshot({ a: ['e2e4', 'e7e5', 'g1f3', 'b8c6'], b: [] }, anything);

        expect(decision.a.rolledBack).toBe(false);
        expect(decision.a.playable).toBe(true);
    });

    test('1.1.4  a page that has seen nothing cannot be surprised', () => {
        // A RELOADED PAGE CANNOT DETECT THIS, and that is deliberate: `seen` is in memory, like
        // `ahead`, because it records what THIS page has witnessed. A fresh page has witnessed
        // nothing and has no earlier position to weigh the new one against.
        const ctrl = new ReconnectController(GAME);
        const decision = ctrl.snapshot({ a: ['e2e4'], b: [] }, anything);
        expect(decision.a.rolledBack).toBe(false);
    });

    test('1.1.4  a rollback is an event, not a state that sticks', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'g1f3'));
        ctrl.moveArrived('a', 'g1f3', true, 'next');

        expect(ctrl.snapshot({ a: ['e2e4'], b: [] }, anything).a.rolledBack).toBe(true);
        // The next snapshot is judged against the position we have now been shown, not the one we
        // lost — otherwise every later message would repeat the same complaint.
        expect(ctrl.snapshot({ a: ['e2e4', 'e7e5'], b: [] }, anything).a.rolledBack).toBe(false);
    });
});

describe('a connection is established, a move was waiting to be sent', () => {
    // 1.2.1
    test('1.2.1  the new position already contains it: forget it, the board is ours', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        const decision = ctrl.snapshot({ a: ['e2e4'], b: [] }, anything);
        expect(ctrl.waiting('a')).toBe(false);
        expect(decision.a.playable).toBe(true);
        expect(stored()).toBeNull();
    });

    // 1.2.1, reached the way branch 1.2.3.2 reaches it: the server said nothing, and the move is
    // in the history under the opponent's reply rather than as the last move.
    test('1.2.1  it is in the position but not as the last move: still forgotten', () => {
        // The opponent has replied on top of ours. Looking only at the last move missed this, and
        // the entry then sat in storage until the game ended.
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        ctrl.snapshot({ a: ['e2e4', 'e7e5'], b: [] }, anything);
        expect(ctrl.waiting('a')).toBe(false);
        expect(stored()).toBeNull();
    });

    // 1.2.2 — and the branch that makes 1.2.3.4 survivable: a rejected move must be droppable.
    test('1.2.2  the new position cannot accept it: the move is dropped and the board comes back', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        const decision = ctrl.snapshot({ a: ['d2d4'] }, nothing);
        expect(ctrl.waiting('a')).toBe(false);
        expect(decision.a.playable).toBe(true);
        expect(stored()).toBeNull();
    });

    // 1.2.3
    test('1.2.3  the position does not contain it but could accept it: the board is taken away', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        const decision = ctrl.snapshot({ a: [], b: [] }, anything);
        expect(ctrl.waiting('a')).toBe(true);
        expect(decision.a.playable).toBe(false);
        expect(decision.b.playable).toBe(true); // the other board is untouched
    });

    // 1.2.3 reached from a page with no memory of sending: the case that used to be treated as
    // though nothing were waiting.
    test('1.2.3  a reloaded page is as careful as one that never stopped', () => {
        // The page that sent the move is gone; only storage remembers it. This used to be treated
        // as though nothing were waiting, which handed the board back with a move still in flight.
        const sender = new ReconnectController(GAME);
        sender.moveSent(move('a', 'e2e4'));

        const reloaded = new ReconnectController(GAME); // no memory of having sent anything
        expect(reloaded.waiting('a')).toBe(true);
        expect(reloaded.snapshot({ a: [], b: [] }, anything).a.playable).toBe(false);
    });

    // 1.2.3 — the sending half.
    test('1.2.3  the move survives the page, so it can still be sent', () => {
        new ReconnectController(GAME).moveSent(move('a', 'e2e4'));
        const reloaded = new ReconnectController(GAME);
        expect(reloaded.socketOpened().movesQueued.map(m => m.move)).toEqual(['e2e4']);
    });
});

describe('the two boards are decided separately', () => {
    // 1.2.3 on one board while 1.1 holds on the other: the tree is walked per board.
    test('1.2.3 + 1.1  a move waiting on one board does not shut the other', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('b', 'e2e4'));
        const decision = ctrl.snapshot({ a: [], b: [] }, anything);
        expect(decision.a.playable).toBe(true);
        expect(decision.b.playable).toBe(false);
    });

    // 1.2.3 on both boards at once, which only a player holding two seats can reach.
    test('1.2.3  one waiting move on each, as a player holding two seats can have', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4', 1));
        ctrl.moveSent(move('b', 'd2d4', 2));
        expect(ctrl.socketOpened().movesQueued.map(m => m.move)).toEqual(['e2e4', 'd2d4']);
        const decision = ctrl.snapshot({ a: [], b: [] }, anything);
        expect(decision.a.playable).toBe(false);
        expect(decision.b.playable).toBe(false);
    });
});

describe('one move arrives', () => {
    // Branch 2, which the controller only started owning on 2026-09-07. Before that 2.1 was decided
    // inline in `roundCtrl` and nothing here could reach it.

    test('2.1.1  the next move: show it, take that board’s clocks, let a premove go', () => {
        const ctrl = new ReconnectController(GAME);
        const d = ctrl.moveArrived('a', 'e7e5', false, 'next');
        expect(d.applyPosition).toBe(true);
        expect(d.takeClocks).toBe(true);
        expect(d.releasePremove).toBe(true);
        expect(d.movesMissing).toBe(false);
        expect(d.because).toContain('2.1.1');
    });

    test('2.1.2  older than what we show: the clocks, and nothing else', () => {
        const ctrl = new ReconnectController(GAME);
        const d = ctrl.moveArrived('a', 'e7e5', false, 'older');
        expect(d.takeClocks).toBe(true);
        expect(d.applyPosition).toBe(false);
        expect(d.releasePremove).toBe(false);
        expect(d.because).toContain('2.1.2');
    });

    test('2.1.3  further ahead than the next move: reported, and not applied', () => {
        const ctrl = new ReconnectController(GAME);
        const d = ctrl.moveArrived('a', 'g8f6', false, 'ahead');
        expect(d.movesMissing).toBe(true);
        // Applying it would skip a ply the reader was never shown.
        expect(d.applyPosition).toBe(false);
        expect(d.takeClocks).toBe(true);
        expect(d.because).toContain('2.1.3');
    });

    test('2.1.3  a move we skipped is NOT remembered as seen', () => {
        // Otherwise the hole we just reported becomes invisible to 1.1.4: a later position missing
        // that move would look like a rollback of something we had actually been shown.
        const ctrl = new ReconnectController(GAME);
        ctrl.moveArrived('a', 'g8f6', false, 'ahead');
        expect(ctrl.snapshot({ a: ['e2e4'], b: [] }, anything).a.rolledBack).toBe(false);
    });

    test('2.1.1  somebody else’s move IS remembered, so 1.1.4 can miss it later', () => {
        // The whole point of moving branch 2.1 into this class: a rollback that loses only an
        // opponent's move used to be undetectable, because the class never heard about it.
        const ctrl = new ReconnectController(GAME);
        ctrl.moveArrived('a', 'e7e5', false, 'next');
        expect(ctrl.snapshot({ a: ['e2e4'], b: [] }, anything).a.rolledBack).toBe(true);
    });

    test('2.2.1  our own move, sent once and waited: keep every clock we have', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        const d = ctrl.moveArrived('a', 'e2e4', true, 'next');
        expect(d.applyPosition).toBe(true);
        expect(d.takeClocks).toBe(false);
        expect(d.because).toContain('2.2.1');
        expect(ctrl.waiting('a')).toBe(false);
    });

    test('2.2.2  our own move, sent again after a break: the server’s clocks win', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        ctrl.socketOpened(); // marks the entry as resent
        const d = ctrl.moveArrived('a', 'e2e4', true, 'next');
        expect(d.takeClocks).toBe(true);
        expect(d.because).toContain('2.2.2');
    });

    test('2.2  our own move is applied whatever its place, because it made this position', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        expect(ctrl.moveArrived('a', 'e2e4', true, 'older').applyPosition).toBe(true);
    });

    test('2.2.1  a confirmation for a move we were not holding changes nothing', () => {
        const ctrl = new ReconnectController(GAME);
        const d = ctrl.moveArrived('a', 'e2e4', true, 'next');
        expect(d.takeClocks).toBe(false);
        expect(stored()).toBe(null);
    });
});

describe('the game has finished', () => {
    // 1.1.1, and what makes 1.2.3.3 harmless: a refused move is forgotten with everything else.
    test('1.1.1  nothing is waiting any more, and nothing is left in storage', () => {
        const ctrl = new ReconnectController(GAME);
        ctrl.moveSent(move('a', 'e2e4'));
        ctrl.gameEnded();
        expect(ctrl.waiting('a')).toBe(false);
        expect(stored()).toBeNull();
        expect(ctrl.snapshot({ a: [], b: [] }, anything).a.playable).toBe(false);
    });
});

describe('storage that refuses to work', () => {
    // 1.2.3 when storage refuses to help: the in-memory record alone has to carry it.
    test('1.2.3  the board is still kept shut for as long as this page lives', () => {
        const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('storage is blocked');
        });
        // the module warns on purpose when storage fails; that is the behaviour, not noise to fix
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const ctrl = new ReconnectController(GAME);
            ctrl.moveSent(move('a', 'e2e4'));
            expect(pendingMove(GAME, 'a')).toBeUndefined(); // nothing was stored
            expect(ctrl.waiting('a')).toBe(true); // and it still knows
        } finally {
            setItem.mockRestore();
            warn.mockRestore();
        }
    });
});
