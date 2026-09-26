import { h, VNode } from 'snabbdom';

import { patch } from '../../document';
import { player as playerBar } from '../../player';
import { BugBoardName } from '../../types';
import { Seat } from '../common/seat';
import { SeatConfiguration } from '../common/seatConfiguration';
import { GameControllerBughouse } from '../common/gameCtrl';
import AnalysisController from './analysisCtrl';

// The four player bars of the analysis page, keyed by PHYSICAL SCREEN POSITION —
// exactly as the analysis clocks beside them are, and for the same reason: which
// player is at the top of a board depends on that board's current orientation, so
// a bar keyed by color or by seat would be wrong the moment the boards are flipped.
//
// `.bug` is board IDENTITY here (board B whoever played on it), matching the clock
// slots. It never decides layout — the STACK a bar sits in decides that — it only
// names the element, so that a flip re-renders the right one.
export type SeatSlot = 'top' | 'bottom' | 'top.bug' | 'bottom.bug';

// Position 0 is the top of a board, 1 the bottom, which is the round page's
// convention and what `.seat-strip0` / `.seat-strip1` mean in the stylesheet.
const SLOT_SELECTOR: Record<SeatSlot, string> = {
    top: 'round-player0#anal-seat-top',
    bottom: 'round-player1#anal-seat-bottom',
    'top.bug': 'round-player0#anal-seat-top-bug.bug',
    'bottom.bug': 'round-player1#anal-seat-bottom-bug.bug',
};

// The presence icon's own id, which `player()` keeps separate from its root: the
// root carries the page-layout tag and classes, the icon id addresses the dot.
const PRESENCE_ID: Record<SeatSlot, string> = {
    top: 'anal-presence-top',
    bottom: 'anal-presence-bottom',
    'top.bug': 'anal-presence-top-bug',
    'bottom.bug': 'anal-presence-bottom-bug',
};

const slotOf = (position: 0 | 1, board: BugBoardName): SeatSlot =>
    `${position === 0 ? 'top' : 'bottom'}${board === 'b' ? '.bug' : ''}` as SeatSlot;

export class AnalysisSeatView {
    private slots: Record<SeatSlot, VNode | HTMLElement>;

    constructor() {
        this.slots = {
            top: h(SLOT_SELECTOR.top),
            bottom: h(SLOT_SELECTOR.bottom),
            'top.bug': h(SLOT_SELECTOR['top.bug']),
            'bottom.bug': h(SLOT_SELECTOR['bottom.bug']),
        };
    }

    // The empty bar analysis.ts embeds in a seat strip, addressed the way the strip
    // is built — by the board it belongs to and which end of it — rather than by the
    // slot name, which is this module's business.
    placeholder(board: BugBoardName, position: 0 | 1): VNode {
        return this.slots[slotOf(position, board)] as VNode;
    }

    render(slot: SeatSlot, vnode: VNode): void {
        this.slots[slot] = patch(this.slots[slot], vnode);
    }
}

export function renderSeatNames(ctrl: AnalysisController): void {
    /* WHO IS ONLINE, FROM THE PAGE MODEL — the server put it there at render time, the same way
       the player lists and profiles get theirs (`views/players50.py`). It is `User.online`: online
       ANYWHERE on the site, not "connected to this game", which is the round page's question and a
       different one. On a finished game the narrow reading would be grey for almost everyone,
       including a player sitting in the lobby.

       CORRECT AT PAGE LOAD AND NOT AFTER. Nothing updates it while the page is open; that is phase
       2 of `analysis-page-presence-websocket` and needs a connection this page still does not have.
       The same guarantee the player lists give, which is where a reader has seen this dot before. */
    const online = (boardName: BugBoardName, color: 'white' | 'black'): boolean =>
        boardName === 'a'
            ? color === 'white'
                ? !!ctrl.model['wonline']
                : !!ctrl.model['bonline']
            : color === 'white'
              ? !!ctrl.model['wonlineB']
              : !!ctrl.model['bonlineB'];

    /* AND NO DOT AT ALL WHERE THERE IS NOBODY. The analysis board opened from the Tools menu has no
       game and no players — it renders no usernames — so a presence icon there is about nobody.
       `isAnalysisBoard` is the page's own test, computed once in `analysis.ts`. */
    const hasPlayers = ctrl.model['gameId'] !== '';

    renderSeatNamesCC(ctrl.seatView, ctrl.seats, ctrl.boardA, 'a', ctrl.model['level'], online, hasPlayers);
    renderSeatNamesCC(ctrl.seatView, ctrl.seats, ctrl.boardB, 'b', ctrl.model['level'], online, hasPlayers);
}

function renderSeatNamesCC(
    view: AnalysisSeatView,
    seats: SeatConfiguration<Seat>,
    board: GameControllerBughouse,
    boardName: BugBoardName,
    level: number,
    online: (boardName: BugBoardName, color: 'white' | 'black') => boolean,
    hasPlayers: boolean,
): void {
    // Same derivation the clocks use: `flipped()` is the board's own state, so the
    // two stay in step without either knowing about the other.
    const whitePov = !board.flipped();
    const colorAt = (position: 0 | 1): 'white' | 'black' =>
        (position === 0) === whitePov ? 'black' : 'white';

    for (const position of [0, 1] as const) {
        const slot = slotOf(position, boardName);
        const color = colorAt(position);
        const seat = seats.byBoardAndColor(boardName, color);
        view.render(
            slot,
            playerBar(
                PRESENCE_ID[slot],
                seat.player.title,
                seat.player.username,
                seat.player.rating,
                level,
                online(boardName, color),
                SLOT_SELECTOR[slot],
                false,
                hasPlayers,
            ),
        );
    }
}
