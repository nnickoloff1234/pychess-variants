/**
 * The square unit that drives the bughouse short-landscape round layout.
 *
 * That mode stacks ten square-sized rows in the viewport height — one pocket
 * row, eight board rows, one pocket row — so the largest usable square is a
 * tenth of the available height, quantised the same way chessgroundx quantises
 * a board.
 *
 * Publishing this lets the grid reserve exactly what the board will occupy,
 * instead of reserving a fluid `vh` slot that the board then under-fills. The
 * leftover of that mismatch is what renders as stray lines between the boards
 * and under them, and what makes pocket squares half a pixel taller than board
 * squares.
 */

const CSS_PROPERTY = '--bug-sq';

/** Board rows plus the pocket row above and below. */
const ROWS_IN_SHORT_LANDSCAPE = 10;

/**
 * Portrait sizes its two boards from different axes, so each needs its own unit.
 *
 * The player's own board is full width, so its square comes from the viewport
 * WIDTH divided by the file count. The partner's board is a fifth of the viewport
 * height and square, so its square comes from that height.
 *
 * Both are published for the same reason as the short-landscape unit: the grid
 * must reserve exactly what the board will occupy. `cg-board` is
 * `position: absolute`, so it contributes no layout height and the surrounding box
 * is sized entirely by CSS — reserve a rounder number than the board takes and the
 * remainder shows as a line between the board and the pocket beneath it. Measured
 * at 386x835: a 378px box against a 373.33px board left a 4.66px band.
 */
const PORTRAIT_MAIN_PROPERTY = '--bug-portrait-sq';
const PORTRAIT_PARTNER_PROPERTY = '--bug-portrait-partner-sq';

/** Files on a standard board; both portrait boards are 8x8. */
const FILES = 8;

/** The partner board's share of the viewport height. Matches the CSS. */
const PARTNER_HEIGHT_FRACTION = 0.2;

/**
 * DUPLICATED FROM chessgroundx 10.7.5, `updateBounds()` in src/render.ts:
 *
 *   const width =
 *     (Math.floor((bounds.width * window.devicePixelRatio) / s.dimensions.width) *
 *       s.dimensions.width) / window.devicePixelRatio;
 *
 * Note `s.dimensions.width` there is the **file count**, not a pixel width.
 *
 * It is duplicated because chessgroundx performs the snap inside updateBounds()
 * and exposes no pure function for it, while we need the answer *before* a board
 * exists in order to size the grid that the board will be measured in. Ask
 * upstream to export it and delete this copy; if upstream changes its rule and
 * this is not updated, the slack returns and is immediately visible as those
 * stray lines reappearing.
 *
 * Quantising to whole device pixels per division is what keeps every square
 * boundary on a device-pixel edge, so the board image rasterises with uniform
 * squares instead of ones that look a pixel wider or narrower than their
 * neighbours.
 */
export function quantize(size: number, divisions: number, dpr: number): number {
    return (Math.floor((size * dpr) / divisions) * divisions) / dpr;
}

/** The largest square for which `rows` of them fit `height`, device-pixel aligned. */
export function squareUnit(
    height: number,
    rows: number = ROWS_IN_SHORT_LANDSCAPE,
    dpr: number = window.devicePixelRatio,
): number {
    return quantize(height, rows, dpr) / rows;
}

/** Viewport height excluding any scrollbar, which is what the rows must fit into. */
function availableHeight(): number {
    return document.documentElement.clientHeight;
}

/** Viewport width excluding any scrollbar, which is what the full-width board fits into. */
function availableWidth(): number {
    return document.documentElement.clientWidth;
}

/**
 * Publish the unit for CSS.
 *
 * MUST be called before the boards are constructed. The grid tracks reference
 * `var(--bug-sq)` with no fallback, so chessgroundx has to measure a wrap that
 * is already at its final size — if this runs afterwards the boards move under
 * an already-memoized `bounds` and every click lands on the wrong square, which
 * is the bug this exists to prevent.
 */
export function publishSquareUnit(): void {
    const style = document.documentElement.style;
    const sq = squareUnit(availableHeight());
    style.setProperty(CSS_PROPERTY, `${sq}px`);

    // Portrait's two units. Published unconditionally rather than behind an
    // orientation check: they are inert wherever the portrait rules do not apply,
    // and a check would have to be kept in step with the media query by hand.
    const dpr = window.devicePixelRatio;
    style.setProperty(PORTRAIT_MAIN_PROPERTY, `${quantize(availableWidth(), FILES, dpr) / FILES}px`);
    style.setProperty(
        PORTRAIT_PARTNER_PROPERTY,
        `${quantize(availableHeight() * PARTNER_HEIGHT_FRACTION, FILES, dpr) / FILES}px`,
    );
}

let listening = false;

/**
 * Recompute on viewport resize. The inputs are the viewport height and the
 * device pixel ratio, and `resize` covers both — it also fires on browser zoom,
 * which changes devicePixelRatio.
 *
 * The handler runs before style and layout are recomputed, so the grid is
 * already final by the time layout happens; chessgroundx's own ResizeObserver is
 * delivered after layout and therefore measures the settled geometry. Nothing
 * further is needed here.
 */
export function trackSquareUnit(): void {
    publishSquareUnit();
    if (listening) return;
    listening = true;
    window.addEventListener('resize', publishSquareUnit, { passive: true });
}
