import { h, VNode } from 'snabbdom';
import * as cg from 'chessgroundx/types';
import * as util from 'chessgroundx/util';
import { Api } from 'chessgroundx/api';

import { _ } from '@/i18n';
import { patch } from '@/document';
import { pieceName, Variant } from '@/variants';
import { BoardName } from '@/types';
import { pocketShape } from '@/pocketRow';
import { colorName, squareName } from './boardSummary';

const ARROWS: Record<string, [number, number]> = {
    ArrowUp: [0, 1],
    ArrowDown: [0, -1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
};

type PocketPosition = 'top' | 'bottom';

// Where the cursor can be: a board square ("e4") or a role in a pocket ("white:n").
type Spot = string;

const pocketSpot = (color: cg.Color, role: cg.Role): Spot => `${color}:${role}`;

function parsePocketSpot(spot: Spot): cg.Piece | undefined {
    const [color, role] = spot.split(':');
    return role === undefined ? undefined : { color: color as cg.Color, role: role as cg.Role };
}

/**
 * Keyboard access to a chessgroundx board: one button per square, laid over the board, and one per
 * pocket role, laid over the pockets.
 *
 * TEMPORARY. Its proper home is chessgroundx itself, to be proposed upstream. It sits beside
 * `.cg-wrap`, never inside it, because chessgroundx empties that element on every flip.
 */
export class ChessgroundKeyboard {
    private chessground: Api | undefined;
    private boardVNode: VNode | undefined;
    private pocketVNodes: Partial<Record<PocketPosition, VNode>> = {};
    // The one spot Tab reaches. Until the player first focuses the board it follows the side at
    // the bottom, which a round page sets only after the first paint; after that it stays put.
    private cursor: Spot | undefined;
    private visited = false;
    // The square a pocket was entered from, to return to.
    private pocketOrigin: cg.Key | undefined;

    constructor(
        private readonly variant: Variant,
        private readonly boardName: BoardName,
    ) {}

    /** The square buttons; the page puts this beside the board's `.cg-wrap`. */
    boardView(): VNode {
        const view = this.renderBoard();
        view.data!.hook = { insert: vnode => (this.boardVNode = vnode) };
        return view;
    }

    /** One pocket's role buttons; the page puts this beside that pocket's row (`#pocket0`, `#pocket1`). */
    pocketView(position: PocketPosition): VNode {
        const view = this.renderPocket(position);
        view.data!.hook = { insert: vnode => (this.pocketVNodes[position] = vnode) };
        return view;
    }

    attach(chessground: Api): void {
        this.chessground = chessground;
    }

    update(): void {
        if (this.boardVNode === undefined || this.chessground === undefined) return;
        if (!this.visited) this.cursor = this.startSquare(this.chessground.state);
        this.boardVNode = patch(this.boardVNode, this.renderBoard());
        for (const position of ['top', 'bottom'] as const) {
            const vnode = this.pocketVNodes[position];
            if (vnode !== undefined) this.pocketVNodes[position] = patch(vnode, this.renderPocket(position));
        }
    }

    private onFocus(e: FocusEvent): void {
        const spot = (e.target as HTMLElement).dataset.spot;
        if (spot === undefined) return;
        this.visited = true;
        this.cursor = spot;
    }

    // Leaving the board from a pocket leaves the tab stop on the square the pocket was entered
    // from, so the board's place in the Tab order never moves.
    private onBlur(e: FocusEvent): void {
        const next = e.relatedTarget as HTMLElement | null;
        if (next?.closest('.cg-keyboard, .cg-keyboard-pocket')) return;
        if (this.cursor !== undefined && parsePocketSpot(this.cursor) && this.pocketOrigin !== undefined) {
            this.cursor = this.pocketOrigin;
            this.update();
        }
    }

    // Keys the board handles never reach Mousetrap on document, so they do not also step the move list.
    private onKey(e: KeyboardEvent): void {
        // Enter and Space activate the button (a click, below); Mousetrap binds Enter on document.
        if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            return;
        }
        const step = ARROWS[e.key];
        if (step === undefined || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();
        const next = this.step(step);
        if (next === undefined) return;
        this.cursor = next;
        this.update();
        this.focusCursor();
    }

    // A button's click comes from Enter, Space, or a screen reader activating it; never the mouse,
    // which the layer lets through. It does what a click on that square or pocket piece does.
    private onActivate(e: MouseEvent): void {
        const spot = (e.target as HTMLElement).dataset.spot;
        if (spot === undefined || this.chessground === undefined) return;
        this.cursor = spot;
        const piece = parsePocketSpot(spot);
        if (piece === undefined) {
            this.chessground.selectSquare(spot as cg.Key);
            return;
        }
        // Gating variants never drop: their pocket pieces enter only by gating.
        const count = this.chessground.state.boardState.pockets?.[piece.color].get(piece.role) ?? 0;
        if (!this.variant.rules.gate && count > 0) this.chessground.selectPocket(piece);
    }

    private focusCursor(): void {
        const views = [this.boardVNode, this.pocketVNodes.top, this.pocketVNodes.bottom];
        for (const view of views) {
            const el = (view?.elm as HTMLElement | undefined)?.querySelector<HTMLElement>(
                `[data-spot="${this.cursor}"]`,
            );
            if (el) return el.focus();
        }
    }

    // Arrows follow the orientation: Up is always away from the player. One step past the a-file is
    // white's pocket, past the last file black's (the user's own model); anywhere else past the edge,
    // nothing moves. In a pocket, Up and Down step through the roles and inward goes back.
    private step([df, dr]: [number, number]): Spot | undefined {
        if (this.cursor === undefined || this.chessground === undefined) return undefined;
        const sign = this.chessground.state.orientation === 'white' ? 1 : -1;
        const { width, height } = this.variant.board.dimensions;

        const piece = parsePocketSpot(this.cursor);
        if (piece !== undefined) {
            const roles = this.variant.pocket!.roles[piece.color];
            if (df === 0) {
                const i = roles.indexOf(piece.role) - dr;
                return i < 0 || i >= roles.length ? undefined : pocketSpot(piece.color, roles[i]);
            }
            const inward = piece.color === 'white' ? sign * df > 0 : sign * df < 0;
            return inward ? this.pocketOrigin : undefined;
        }

        const [file, rank] = util.key2pos(this.cursor as cg.Key);
        const target: cg.Pos = [file + sign * df, rank + sign * dr];
        if (target[1] < 0 || target[1] >= height) return undefined;
        if (target[0] < 0 || target[0] >= width) {
            const color: cg.Color = target[0] < 0 ? 'white' : 'black';
            if (!this.variant.pocket) return undefined;
            this.pocketOrigin = this.cursor as cg.Key;
            return pocketSpot(color, this.variant.pocket.roles[color][0]);
        }
        return util.pos2key(target);
    }

    // The king of the side at the bottom, else that side's bottom-left square.
    private startSquare(state: Api['state']): cg.Key {
        const color = state.orientation;
        for (const [key, piece] of state.boardState.pieces) {
            if (piece.color === color && this.variant.kingRoles.includes(piece.role)) return key;
        }
        const { width, height } = this.variant.board.dimensions;
        return util.pos2key(color === 'white' ? [0, 0] : [width - 1, height - 1]);
    }

    // "e4 White pawn"; an empty square is just its name. Squares in the variant's own notation.
    private squareLabel(key: cg.Key): string {
        const square = squareName(key, this.variant.notation, this.variant.board.dimensions);
        const piece = this.chessground?.state.boardState.pieces.get(key);
        if (piece === undefined) return square;
        return `${square} ${colorName(this.variant, piece.color)} ${pieceName(this.variant, piece.role, piece.color)}`;
    }

    // "White pocket: knight, 2"; a role with none left is still a stop, so the positions never shift.
    private pocketLabel(color: cg.Color, role: cg.Role): string {
        const count = this.chessground?.state.boardState.pockets?.[color].get(role) ?? 0;
        return `${_('%1 pocket', colorName(this.variant, color))}: ${pieceName(this.variant, role, color)}, ${count}`;
    }

    private button(spot: Spot, label: string): VNode {
        return h('button', {
            key: spot,
            attrs: {
                type: 'button',
                tabindex: spot === this.cursor ? '0' : '-1',
                'data-spot': spot,
                'aria-label': label,
            },
        });
    }

    private handlers() {
        return {
            focusin: (e: FocusEvent) => this.onFocus(e),
            focusout: (e: FocusEvent) => this.onBlur(e),
            keydown: (e: KeyboardEvent) => this.onKey(e),
            click: (e: MouseEvent) => this.onActivate(e),
        };
    }

    // Rows top to bottom as the player sees them, so the reading order follows the screen.
    private renderBoard(): VNode {
        const { width, height } = this.variant.board.dimensions;
        const asWhite = (this.chessground?.state.orientation ?? 'white') === 'white';
        const suffix = this.boardName === '' ? '' : `-${this.boardName}`;
        const squares: VNode[] = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const key = util.pos2key(asWhite ? [col, height - 1 - row] : [width - 1 - col, row]);
                squares.push(this.button(key, this.squareLabel(key)));
            }
        }
        return h(
            'div.cg-keyboard',
            {
                on: this.handlers(),
                style: {
                    width: `var(--cg-width${suffix})`,
                    height: `var(--cg-height${suffix})`,
                    gridTemplateColumns: `repeat(${width}, 1fr)`,
                    gridTemplateRows: `repeat(${height}, 1fr)`,
                },
            },
            squares,
        );
    }

    // Laid out like chessgroundx's pocket row (`pocketShape`), which shows the top player's
    // opponent at the top.
    private renderPocket(position: PocketPosition): VNode {
        if (!this.variant.pocket) return h('div.cg-keyboard-pocket');
        const orientation = this.chessground?.state.orientation ?? 'white';
        const color = position === 'top' ? util.opposite(orientation) : orientation;
        const { width, height } = this.variant.board.dimensions;
        const { pieceRows, pocketLength } = pocketShape(this.variant, color);
        const suffix = this.boardName === '' ? '' : `-${this.boardName}`;
        return h(
            'div.cg-keyboard-pocket',
            {
                on: this.handlers(),
                style: {
                    width: `calc(var(--cg-width${suffix}) / ${width} * ${pocketLength})`,
                    height: `calc(var(--cg-height${suffix}) / ${height} * ${pieceRows})`,
                    gridTemplateColumns: `repeat(${pocketLength}, 1fr)`,
                    gridTemplateRows: `repeat(${pieceRows}, 1fr)`,
                },
            },
            this.variant.pocket.roles[color].map(role =>
                this.button(pocketSpot(color, role), this.pocketLabel(color, role)),
            ),
        );
    }
}
