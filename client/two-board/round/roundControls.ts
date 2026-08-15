import { h, VNode } from 'snabbdom';

import { _ } from '../../i18n';
import { patch } from '../../document';
import { ChatController, chatView } from '../../chat';
import { swap } from '../twoBoardCtrl';
import { RoundSeatViews } from './roundSeatView';

// Owns the round page's dialog (#offer-dialog) and game-controls (#game-controls)
// retained vnodes, plus the other ad-hoc DOM rendering `roundCtrl.ts` previously
// did inline. RoundControllerBughouse holds one instance instead of raw VNode
// fields, and calls its methods instead of document.*/patch()/h() directly.
export class RoundControlsView {
    private vdialog: VNode | HTMLElement;
    private gameControls: VNode | HTMLElement;

    constructor() {
        this.vdialog = patch(document.getElementById('offer-dialog')!, h('div#offer-dialog', ''));
        this.gameControls = document.getElementById('game-controls') as HTMLElement;
    }

    renderInitialGameControls(spectator: boolean, onDraw: () => void, onResign: () => void): void {
        const container = document.getElementById('game-controls') as HTMLElement;
        if (!spectator) {
            const buttons = [
                h('button#count', _('Count')),
                h('button#draw', { on: { click: onDraw }, props: { title: _('Draw') } }, [h('i', '½')]),
                h('button#resign', { on: { click: onResign }, props: { title: _('Resign') } }, [
                    h('i', { class: { icon: true, 'icon-flag-o': true } }),
                ]),
            ];
            this.gameControls = patch(container, h('div.btn-controls', buttons));
            patch(document.getElementById('count') as HTMLElement, h('div'));
        } else {
            this.gameControls = patch(container, h('div.btn-controls'));
        }
    }

    renderGameOverControls(
        spectator: boolean,
        onRematch: () => void,
        onNewOpponent: () => void,
        onAnalysis: () => void,
    ): void {
        this.gameControls = patch(this.gameControls, h('div'));
        const buttons: VNode[] = [];
        if (!spectator) {
            buttons.push(h('button.rematch', { on: { click: onRematch } }, _('REMATCH')));
            buttons.push(h('button.newopp', { on: { click: onNewOpponent } }, _('NEW OPPONENT')));
        }
        buttons.push(h('button.analysis', { on: { click: onAnalysis } }, _('ANALYSIS BOARD')));
        patch(this.gameControls, h('div.btn-controls.after', buttons));
    }

    renderDrawOffer(onReject: () => void, onAccept: () => void): void {
        this.vdialog = patch(
            this.vdialog,
            h('div#offer-dialog', [
                h('div.dcontrols', [
                    h('div', { class: { reject: true }, on: { click: onReject } }, h('i.icon.icon-abort.reject')),
                    h('div.text', _('Your opponent offers a draw')),
                    h('div', { class: { accept: true }, on: { click: onAccept } }, h('i.icon.icon-check')),
                ]),
            ]),
        );
    }

    renderRematchOffer(onReject: () => void, onAccept: () => void): void {
        this.vdialog = patch(
            this.vdialog,
            h('div#offer-dialog', [
                h('div.dcontrols', [
                    h('div', { class: { reject: true }, on: { click: onReject } }, h('i.icon.icon-abort.reject')),
                    h('div.text', _('Your opponent offers a rematch')),
                    h('div', { class: { accept: true }, on: { click: onAccept } }, h('i.icon.icon-check')),
                ]),
            ]),
        );
    }

    setDialogMessage(message: string): void {
        this.vdialog = patch(
            this.vdialog,
            h('div#offer-dialog', [
                h('div.dcontrols', [
                    h('div', { class: { reject: false } }),
                    h('div.text', message),
                    h('div', { class: { accept: false } }),
                ]),
            ]),
        );
    }

    clearDialog(): void {
        this.vdialog = patch(this.vdialog, h('div#offer-dialog', []));
    }
}

export function renderRoundChat(ctrl: ChatController): void {
    patch(document.getElementById('bugroundchat') as HTMLElement, chatView(ctrl, 'bugroundchat'));
}

export function resetMovelistDom(): void {
    const container = document.getElementById('movelist') as HTMLElement;
    patch(container, h('div#movelist'));
}

// clears the gating/promotion widget left over the ground when the game ends by timeout
export function clearExtensionChoice(): void {
    const container = document.getElementById('extension_choice') as HTMLElement;
    if (container instanceof Element) patch(container, h('extension'));
}

export function clearAbortIndicator(): void {
    const container = document.getElementById('abort') as HTMLElement;
    if (container) patch(container, h('div'));
}

export function insertRematchButton(onViewRematch: () => void): void {
    const btnsAfter = document.querySelector('.btn-controls.after') as HTMLElement;
    const rematchButton = h('button.newopp', { on: { click: onViewRematch } }, _('VIEW REMATCH'));
    const rematchButtonLocation = btnsAfter!.insertBefore(document.createElement('div'), btnsAfter!.firstChild);
    patch(rematchButtonLocation, rematchButton);
}

// Seat rearrangement for flipBoards()/switchBoards(). Both work on seat strips —
// the element holding one seat's pocket, clock and name — but on different parts
// of them, because the two operations are not the same kind of move.
//
// FLIP exchanges the two seats of a board between its strips, and must leave the
// pockets where they are: chessgroundx's toggleOrientation() calls redrawAll(),
// which re-renders each pocket for the new orientation in place, so the top
// pocket element always holds the top player's pocket. Moving the elements as
// well would apply the exchange twice and show each player the wrong pocket.
export function swapSeatBlocksForFlip(views: RoundSeatViews): void {
    swap(views.a[0].blockElement(), views.a[1].blockElement());
    swap(views.b[0].blockElement(), views.b[1].blockElement());
}

// SWITCH exchanges board A's strips with board B's, pocket and seat together, by
// swapping where the strips are placed. This is what used to be a grid-area swap
// on the seat blocks plus a DOM swap of the pocket elements; one strip carries both.
export function swapSeatStripAreasForSwitch(views: RoundSeatViews): void {
    swapGridArea(views.a[0].stripElement(), views.b[0].stripElement(), 'clock-top', 'clockB-top');
    swapGridArea(views.a[1].stripElement(), views.b[1].stripElement(), 'clock-bot', 'clockB-bot');
}

// The inline value wins over the class-based area from CSS, so the fallbacks must
// name what the stylesheet would have placed the element in.
function swapGridArea(one: HTMLElement, other: HTMLElement, oneArea: string, otherArea: string): void {
    const held = one.style.gridArea || oneArea;
    one.style.gridArea = other.style.gridArea || otherArea;
    other.style.gridArea = held;
}

// Which board and which strips are the viewer's own, and which the partner's, as
// classes CSS can select on. Nothing else carries this: `.bug` is board IDENTITY —
// roundSeatView sets it from `board === 'b'` — so it is the partner's for a board-A
// player and the viewer's own for a board-B player. The role lives only in the grid
// area, which CSS cannot select on, and which switchBoards() rewrites at runtime.
//
// Derived from the effective area rather than from the seats, so it stays true
// through a switch without a second source of truth to keep in step. Call it after
// the initial placement and again after every swap.
//
// Both boards and strips need it: a mode that draws the partner smaller has to size
// each element from the role's scale, and keying that off `#mainboard`/`#bugboard`
// would give a board-A player the partner's size on their own board.
export function markRoles(views: RoundSeatViews): void {
    for (const board of ['a', 'b'] as const) {
        for (const position of [0, 1] as const) {
            const el = views[board][position].stripElement();
            const fallback = `clock${board === 'b' ? 'B' : ''}-${position === 0 ? 'top' : 'bot'}`;
            const own = (el.style.gridArea || fallback).startsWith('clock-');
            el.classList.toggle('own-seat', own);
            el.classList.toggle('partner-seat', !own);
        }
    }
    for (const [id, fallback] of [
        ['mainboard', 'board'],
        ['bugboard', 'boardPartner'],
    ] as const) {
        const el = document.getElementById(id);
        if (!el) continue;
        const own = (el.style.gridArea || fallback) === 'board';
        el.classList.toggle('own-board', own);
        el.classList.toggle('partner-board', !own);
    }
}
