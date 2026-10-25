import { h, VNode } from 'snabbdom';
import * as cg from 'chessgroundx/types';
import * as util from 'chessgroundx/util';
import { Api } from 'chessgroundx/api';

import { patch } from '@/document';
import { pieceName, Variant } from '@/variants';
import { BoardName } from '@/types';
import { colorName, squareName } from './boardSummary';

const ARROWS: Record<string, [number, number]> = {
    ArrowUp: [0, 1],
    ArrowDown: [0, -1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
};

/**
 * Keyboard access to a chessgroundx board: one button per square, laid over the board.
 *
 * TEMPORARY. Its proper home is chessgroundx itself, to be proposed upstream. It sits beside
 * `.cg-wrap`, never inside it, because chessgroundx empties that element on every flip.
 */
export class ChessgroundKeyboard {
    private chessground: Api | undefined;
    private boardVNode: VNode | undefined;
    // The one square Tab reaches. Until the player first focuses the board it follows the side at
    // the bottom, which a round page sets only after the first paint; after that it stays put.
    private cursor: cg.Key | undefined;
    private visited = false;

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

    attach(chessground: Api): void {
        this.chessground = chessground;
    }

    update(): void {
        if (this.boardVNode === undefined || this.chessground === undefined) return;
        if (!this.visited) this.cursor = this.startSquare(this.chessground.state);
        this.boardVNode = patch(this.boardVNode, this.renderBoard());
    }

    private onFocus(e: FocusEvent): void {
        const key = (e.target as HTMLElement).dataset.key as cg.Key | undefined;
        if (key === undefined) return;
        this.visited = true;
        this.cursor = key;
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
        this.moveCursor(step);
    }

    // A button's click comes from Enter, Space, or a screen reader activating it; never the mouse,
    // which the layer lets through. It does what a click on that square does.
    private onActivate(e: MouseEvent): void {
        const key = (e.target as HTMLElement).dataset.key as cg.Key | undefined;
        if (key === undefined) return;
        this.cursor = key;
        this.chessground?.selectSquare(key);
    }

    // Arrows follow the orientation: Up is always away from the player. Past the edge, nothing moves.
    private moveCursor([df, dr]: [number, number]): void {
        if (this.cursor === undefined || this.chessground === undefined) return;
        const sign = this.chessground.state.orientation === 'white' ? 1 : -1;
        const [file, rank] = util.key2pos(this.cursor);
        const target: cg.Pos = [file + sign * df, rank + sign * dr];
        const { width, height } = this.variant.board.dimensions;
        if (target[0] < 0 || target[0] >= width || target[1] < 0 || target[1] >= height) return;
        this.cursor = util.pos2key(target);
        this.update();
        const board = this.boardVNode?.elm as HTMLElement | undefined;
        board?.querySelector<HTMLElement>(`[data-key="${this.cursor}"]`)?.focus();
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
    private label(key: cg.Key): string {
        const square = squareName(key, this.variant.notation, this.variant.board.dimensions);
        const piece = this.chessground?.state.boardState.pieces.get(key);
        if (piece === undefined) return square;
        return `${square} ${colorName(this.variant, piece.color)} ${pieceName(this.variant, piece.role, piece.color)}`;
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
                squares.push(
                    h('button', {
                        key,
                        attrs: {
                            type: 'button',
                            tabindex: key === this.cursor ? '0' : '-1',
                            'data-key': key,
                            'aria-label': this.label(key),
                        },
                    }),
                );
            }
        }
        return h(
            'div.cg-keyboard',
            {
                on: {
                    focusin: (e: FocusEvent) => this.onFocus(e),
                    keydown: (e: KeyboardEvent) => this.onKey(e),
                    click: (e: MouseEvent) => this.onActivate(e),
                },
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
}
