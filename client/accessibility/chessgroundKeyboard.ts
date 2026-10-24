import { h, VNode } from 'snabbdom';
import * as util from 'chessgroundx/util';
import { Api } from 'chessgroundx/api';

import { patch } from '@/document';
import { Variant } from '@/variants';
import { BoardName } from '@/types';

/**
 * Keyboard access to a chessgroundx board: one button per square, laid over the board.
 *
 * TEMPORARY. Its proper home is chessgroundx itself, to be proposed upstream. It sits beside
 * `.cg-wrap`, never inside it, because chessgroundx empties that element on every flip.
 */
export class ChessgroundKeyboard {
    private chessground: Api | undefined;
    private boardVNode: VNode | undefined;

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
        this.boardVNode = patch(this.boardVNode, this.renderBoard());
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
                squares.push(h('button', { key, attrs: { type: 'button', tabindex: '-1', 'data-key': key } }));
            }
        }
        return h(
            'div.cg-keyboard',
            {
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
