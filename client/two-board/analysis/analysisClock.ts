import { h, VNode } from 'snabbdom';

import * as cg from 'chessgroundx/types';

import { patch } from '../../document';
import AnalysisController from './analysisCtrl';
import { GameControllerBughouse } from '../common/gameCtrl';
import { clockTimeAt } from '../common/players';
import { Clocks } from '../../messages';
import { BugBoardName } from '../../types';
import { BLACK, WHITE } from '../../chess';

export function renderClocks(ctrl: AnalysisController) {
    const lastStep = ctrl.tree.hasAnalysisTree() ? ctrl.tree.getTreeCurrentNode()?.step : ctrl.steps[ctrl.ply];
    if (!lastStep) return;
    const seatTime = (board: BugBoardName, color: cg.Color) =>
        clockTimeAt(lastStep, ctrl.seats.byBoardAndColor(board, color));
    if (lastStep.clocks) {
        renderClocksCC([seatTime('a', 'white')!, seatTime('a', 'black')!], ctrl.boardA, '');
    }
    if (lastStep.clocksB) {
        renderClocksCC([seatTime('b', 'white')!, seatTime('b', 'black')!], ctrl.boardB, '.bug');
    }
}

export function renderClocksCC(clocks: Clocks, ctrl: GameControllerBughouse, suffix: string) {
    const isWhiteTurn = ctrl.turnColor === 'white';
    const whitePov = !ctrl.flipped();

    const wclass = whitePov ? 'bottom' : 'top';

    const wtime = clocks[WHITE];
    let wel: VNode | HTMLElement = document.querySelector(`div.anal-clock.${wclass}${suffix}`) as HTMLElement;
    if (wel) {
        wel = patch(wel, h(`div.anal-clock.${wclass}${suffix}`, ''));
        patch(wel, renderClock(wtime!, isWhiteTurn, wclass + suffix));
    }
    const bclass = whitePov ? 'top' : 'bottom';
    const btime = clocks[BLACK];
    let bel: VNode | HTMLElement = document.querySelector(`div.anal-clock.${bclass}${suffix}`) as HTMLElement;
    if (bel) {
        bel = patch(bel, h(`div.anal-clock.${bclass}${suffix}`, ''));
        patch(bel, renderClock(btime!, !isWhiteTurn, bclass + suffix));
    }
}

function renderClock(time: number, active: boolean, cls: string): VNode {
    return h(
        'div.anal-clock.' + cls,
        {
            class: { active },
        },
        clockContent(time),
    );
}

function clockContent(time: number): Array<string | VNode> {
    if (!time && time !== 0) return ['-'];
    const date = new Date(time),
        millis = date.getUTCMilliseconds(),
        sep = ':',
        baseStr = pad2(date.getUTCMinutes()) + sep + pad2(date.getUTCSeconds());
    if (time >= 3600000) return [Math.floor(time / 3600000) + sep + baseStr];
    return time >= 60000 ? [baseStr] : [baseStr, h('tenths', '.' + Math.floor(millis / 100).toString())];
}

function pad2(num: number): string {
    return (num < 10 ? '0' : '') + num;
}
