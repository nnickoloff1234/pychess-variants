/* oxlint-disable no-unused-expressions -- THE WHOLE FILE IS ONE EXPRESSION, BY DESIGN. It is read
   as text (`probe.js` -> `PROBE` in driver.py) and handed to Playwright's `page.evaluate()`, which
   takes an expression, not a module. Naming it or exporting it would put `const`/`export` in the
   text and `evaluate()` would reject it. `yarn lint` runs oxlint with --deny-warnings, so without
   this the whole build fails on a file that is correct. */

/* What the page decided, and whether it holds together.
 *
 * Returned beside every screenshot: a picture says what it looked like, this says WHY, and why is
 * the only half that can be changed. Everything here is read from what the page already publishes —
 * if something needed is not visible from here, that is a finding about the page, not a licence to
 * add a hook for the survey.
 *
 * `ctx` IS WHAT THE WALK ASKED FOR, not what the page reports: `{zoom: [a, b], minZoom}`. One check
 * needs it — "both boards at their minimum are the same size" is a claim about the request, and a
 * page at its floor looks exactly like a page that was asked for 39%. Everything else here is still
 * read from the page alone, and the checks that need no context run with `ctx` absent.
 */
ctx => {
    const app = document.querySelector('.round-app.bug, .analysis-app.bug');
    if (app === null) return { ok: false, reason: 'no bughouse app on the page' };

    const box = el => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const q = sel => app.querySelector(sel);
    const all = sel => [...app.querySelectorAll(sel)];
    const shown = el => el !== null && el.offsetParent !== null && el.getBoundingClientRect().width > 0;

    /* Custom properties compute to their TOKEN STREAM, not to a length: asking for
       `--bug-preset-btn` can return `calc(var(--x) * 0.55)`. A probe element whose width IS the
       property is what turns it into pixels. */
    const length = (el, prop) => {
        const d = document.createElement('div');
        d.style.cssText = 'position:absolute;visibility:hidden;height:0;width:var(' + prop + ')';
        el.appendChild(d);
        const w = d.getBoundingClientRect().width;
        d.remove();
        return +w.toFixed(2);
    };
    const raw = (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim();

    // THE PAGE'S OWN QUESTIONS, asked of the page. A copy of a threshold here would be a second
    // place for it to drift; these are the same media queries the stylesheet and squareUnit use.
    const mq = s => window.matchMedia(s).matches;
    const portrait = mq('(aspect-ratio <= 9/16)');
    const zooms = mq('(aspect-ratio > 9/16) and (height >= 600px)');
    const mode = portrait ? 'portrait' : zooms ? 'tall landscape' : 'short landscape';

    // ---- arrangement -------------------------------------------------------------------------
    const classes = [...app.classList];
    const home = (classes.find(c => c.startsWith('tools-')) || 'none').replace('tools-', '');
    const drops = classes.filter(c => c.startsWith('drop-'));
    const flags = classes.filter(c =>
        ['strip-in-zoneb', 'controls-labelled', 'game-over', 'partner-name-outside'].includes(c),
    );

    const cs = getComputedStyle(app);

    /* PROBED, NOT INFERRED, AND NOT ONLY THE APP'S OWN GRID. A named area's box is not its row's
       box and not its occupant's box — a throwaway element placed in the area is the only thing
       that answers for the area itself. IT MUST BE MADE TO STRETCH: a grid item inherits the
       container's alignment, and these containers align their real occupants deliberately, so a
       marker left to inherit reports its own content size instead of the cell's.

       EVERY GRID WITH NAMED AREAS IS SURVEYED, not just the app. Portrait publishes no zone A or B
       at app level — its areas are `zoneTools1..4` inside `.partner-and-tools` — so a
       survey that stopped at the app could not see the space those parts leave unused, which is
       most of what a reviewer notices there. Areas are keyed `container/area` below the app. */
    const gridContainers = [app, ...all('*')].filter(el => {
        const cs = getComputedStyle(el);
        return cs.display.includes('grid') && cs.gridTemplateAreas && cs.gridTemplateAreas !== 'none';
    });
    const label = el =>
        el === app ? '' : ((el.className.toString().trim().split(/\s+/)[0] || el.tagName.toLowerCase()) + '/');

    /* THE PAINTED EXTENT, not the element's own box. A part whose content is wider than it is
       paints outside it — `.chatpresets-set` is five fixed tracks and spills equally both ways when
       the button size does not fit its track — and that paint is what lands on a neighbour. The
       walk stops at any descendant that clips, since its own box is then the limit of what shows. */
    /* THE SURFACES A PART ACTUALLY PAINTS. Descent stops at anything that draws as one thing — a
       board, a button, a leaf — because that box is then the shape on the screen. */
    const surfaces = root => {
        const out = [];
        const walk = el => {
            for (const child of el.children) {
                const cs = getComputedStyle(child);
                if (cs.display === 'none' || cs.visibility === 'hidden' || child.tagName === 'CG-RESIZE') continue;
                const r = child.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) continue;
                /* A SURFACE IS ANYTHING THAT PUTS INK DOWN, not only a childless element. A button
                   with an icon inside it paints its own background across its whole box, and a
                   collision that lands on that background rather than on the icon is still one
                   thing drawn over another — counting only leaves missed exactly that. */
                const paints =
                    cs.backgroundImage !== 'none' ||
                    (cs.backgroundColor !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(cs.backgroundColor)) ||
                    parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0 ||
                    parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0;
                if (paints || child.children.length === 0 || child.tagName.startsWith('CG-')) {
                    out.push({ r, what: (child.className.toString() || child.tagName).slice(0, 24) });
                }
                if (!child.tagName.startsWith('CG-')) walk(child);
            }
        };
        walk(root);
        return out;
    };

    /* The worst pair of surfaces two parts have, or null when nothing they draw touches. */
    const collision = (elA, elB) => {
        let worst = null;
        for (const a of surfaces(elA)) {
            for (const b of surfaces(elB)) {
                const dx = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
                const dy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
                if (dx <= 1 || dy <= 1) continue;
                if (worst === null || dx * dy > worst.dx * worst.dy) {
                    worst = { dx: Math.round(dx), dy: Math.round(dy), a: a.what, b: b.what };
                }
            }
        }
        return worst;
    };

    const painted = root => {
        const b = root.getBoundingClientRect();
        let x1 = b.left, y1 = b.top, x2 = b.right, y2 = b.bottom;
        const walk = el => {
            for (const child of el.children) {
                const cs = getComputedStyle(child);
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
                /* A BOARD IS OPAQUE HERE. Everything chessground draws around it is deliberate and
                   outside its box: the resize grip hangs 22px half past the corner (329 findings of
                   nothing on the first run), and the rank coordinates sit 8px clear of the edge
                   (another 167 on the second). Its own rectangle is the board; what is inside it is
                   not this survey's business. */
                if (child.tagName === 'CG-RESIZE') continue;
                const opaque = child.tagName.startsWith('CG-');
                const r = child.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) continue;
                x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top);
                x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
                if (!opaque && cs.overflowX === 'visible' && cs.overflowY === 'visible') walk(child);
            }
        };
        walk(root);
        return { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) };
    };

    const areas = {};
    // The element beside its record: an occupant of a nested grid is a DESCENDANT of an occupant
    // of the outer one, and a parent 'overlapping' its own child is not a finding.
    const placed = [];
    for (const container of gridContainers) {
        const cs2 = getComputedStyle(container);
        const names = [
            ...new Set(cs2.gridTemplateAreas.replace(/"/g, ' ').split(/\s+/).filter(n => n && n !== '.')),
        ];
        for (const name of names) {
            const d = document.createElement('div');
            d.style.cssText =
                'grid-area:' + name +
                ';visibility:hidden;pointer-events:none;justify-self:stretch;align-self:stretch;' +
                'width:auto;height:auto;min-width:0;min-height:0;margin:0;padding:0;border:0;';
            container.appendChild(d);
            areas[label(container) + name] = { ...box(d), occupants: [] };
            d.remove();
        }
        /* THE GRID'S ITEMS ARE ITS OWN CHILDREN. A `display: contents` child generates no box and
           hands ITS children to this grid, so those are walked through — which is how a dissolved
           group's rows are items of the app. Anything deeper belongs to a part, not to this grid. */
        const items = [];
        const collect = el => {
            for (const child of el.children) {
                const cs3 = getComputedStyle(child);
                if (cs3.display === 'none' || cs3.position === 'absolute' || cs3.position === 'fixed') continue;
                if (cs3.display === 'contents') { collect(child); continue; }
                items.push([child, cs3]);
            }
        };
        collect(container);
        for (const [el, cs3] of items) {
            const area = label(container) + cs3.gridArea.split('/')[0].trim();
            if (areas[area] === undefined) continue;
            const rec = {
                what: (el.className.toString() || el.tagName).slice(0, 40),
                area,
                ...box(el),
                painted: painted(el),
            };
            areas[area].occupants.push(rec);
            placed.push({ rec, el });
        }
    }


    // ---- what the sizing logic published -------------------------------------------------------
    // Asked only when it is on screen: a hidden set answers 0 for every length, which reads in the
    // report as a zero-width button rather than as "no presets here".
    const setEl = q('.chatpresets-set');
    const set = shown(setEl) ? setEl : null;
    const chat = q('.bugroundchat');
    const published = {
        ownSquare: length(app, '--bug-own-sq') || null,
        squareA: length(app, '--bug-tall-sq-a') || null,
        squareB: length(app, '--bug-tall-sq-b') || null,
        /* THE ALLOWANCE IS WHAT 100% MEANS for that column, and the two are not the same number:
           the partner board's full zoom is capped by the width. Published so that the zoom a row
           ASKED for can be read against the zoom it was DRAWN at — `clampZoom()` raises anything
           below `minZoomPercent()` (four left-squares of stack), which on a tablet is about 80%,
           so a row headed 100/50 can be drawing 100/79 and no setting would make it smaller. */
        allowanceA: length(app, '--bug-tall-allow-a') || null,
        allowanceB: length(app, '--bug-tall-allow-b') || null,
        appHeight: raw(app, '--bug-app-h') || null,
        presetButton: set ? length(set, '--bug-preset-btn') : null,
        presetFloor: set ? length(set, '--bug-preset-btn-min') : null,
        presetCeiling: set ? length(set, '--bug-preset-btn-max') : null,
        presetGap: set ? length(set, '--bug-preset-gap') : null,
        presetGapFloor: set ? length(set, '--bug-preset-gap-min') : null,
        presetAlign: set ? raw(set, '--bug-preset-align') || 'center' : null,
        presetGapAfforded: null,
        chatMinLines: chat ? raw(chat, '--bug-chat-min-lines') : null,
        chatMsgAdvance: chat ? length(chat, '--bug-chat-msg-advance') : null,
    };

    // ---- which rules fired ---------------------------------------------------------------------
    const presetRows = all('.chatpresets-panel')
        .filter(p => p.offsetParent !== null)
        .flatMap(p => {
            const byRow = {};
            for (const b of p.querySelectorAll('button')) {
                const k = Math.round(b.getBoundingClientRect().y);
                (byRow[k] = byRow[k] || []).push(b);
            }
            return Object.values(byRow).map(r => r.length);
        });
    const standingTab = (() => {
        const stack = q('.bug-partner-stack');
        if (stack === null) return null;
        return stack.getAttribute('role') === 'tabpanel' ? 'attached' : 'detached';
    })();
    const fired = {
        toolsCascade: home,
        presetRowLengths: presetRows,
        presetArrangement: new Set(presetRows).size > 1 ? 'ragged' : 'uniform',
        presetSizeBoundBy:
            published.presetButton === null
                ? null
                : Math.abs(published.presetButton - (published.presetFloor ?? -1)) < 0.5
                  ? 'floor'
                  : Math.abs(published.presetButton - (published.presetCeiling ?? -1)) < 0.5
                    ? 'ceiling'
                    : 'height',
        partnerBoardTab: standingTab,
        boardsResizable: shown(q('cg-resize')),
    };

    // ---- the checks ----------------------------------------------------------------------------
    const failures = [];
    /* WORTH SEEING, NOT WORTH FAILING A ROW FOR. A warning is a measurement a reviewer may want and
       may equally decide to live with; it does not make a row bad, and it never hides one that is. */
    const warnings = [];
    const doc = document.documentElement;

    /* THE CONTENT'S SIZE, ASKED OF THE BODY, AGAINST THE LAYOUT VIEWPORT.
       `documentElement.scrollWidth/Height` is the SCROLLABLE AREA, and where the page does not fit
       its device a mobile browser zooms out to fit — after which the scrollable area is the
       zoomed-out visual viewport, not anything an element occupies. Measured on the 810x1080 tablet
       row: a real 149px of horizontal overflow, and a vertical 199px that no element accounted for,
       both of them the same fact reported twice (every such row had overflowX/width exactly equal
       to overflowY/height, which is a scale, not two defects). The same row with the emulation's
       mobile flag off: 149 horizontal, ZERO vertical. `body.scrollWidth/Height` gave the content's
       real size on both axes in every case. */
    const overflowX = Math.round(document.body.scrollWidth - doc.clientWidth);
    const overflowY = Math.round(document.body.scrollHeight - doc.clientHeight);
    if (overflowX > 1) failures.push(`page overflows horizontally by ${overflowX}px`);
    if (overflowY > 1) failures.push(`page overflows vertically by ${overflowY}px`);

    /* WHAT THE PAGE WAS GIVEN AND WHAT IT TOOK, so a row that overflows can be read without
       re-deriving it. `layout` is the viewport the stylesheet saw; `content` is what the page
       actually occupies; `visual` differs from `layout` only when the browser has zoomed out to
       fit a page that did not fit its device, which is a defect's consequence, not its cause. */
    const fit = {
        layout: [doc.clientWidth, doc.clientHeight],
        content: [document.body.scrollWidth, document.body.scrollHeight],
        visual: [window.innerWidth, window.innerHeight],
        zoomedOutTo: +(doc.clientWidth / window.innerWidth).toFixed(4),
    };

    const own = q('.bug-own-stack');
    const partner = q('.bug-partner-stack');
    if (shown(own) && shown(partner)) {
        const a = box(own);
        const b = box(partner);
        const overlaps = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
        if (overlaps) failures.push('the two board stacks overlap');
    }

    /* A HIT TEST, NOT A LOOK. An element painted over a control is invisible when it has no
       background of its own, and the control looks perfectly normal right up until it is clicked.
       Both of the covering defects this layout has shipped were exactly that. */
    const controls = [
        ...(shown(q('.bugroundchat input')) ? [['chat input', q('.bugroundchat input')]] : []),
        ...all('[role="tab"]').filter(shown).map(t => [`tab "${t.textContent.trim()}"`, t]),
        ...all('.bug-gameover button').filter(shown).map(b => [`button "${b.textContent.trim()}"`, b]),
        ...all('cg-resize').filter(shown).map((h, i) => [`resize handle ${i}`, h]),
    ];
    for (const [name, el] of controls) {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (hit !== el && !el.contains(hit)) {
            const by = hit === null ? 'nothing (outside the viewport)' : (hit.className.toString() || hit.tagName).slice(0, 40);
            failures.push(`${name} is covered by ${by}`);
        }
    }

    for (const [name, a] of Object.entries(areas)) {
        if (a.occupants.length === 0 && a.w > 8 && a.h > 8) {
            failures.push(`area ${name} is ${a.w}x${a.h} and empty`);
            continue;
        }
        if (!a.occupants.length || a.w <= 8 || a.h <= 8) continue;

        /* AN AREA ITS OCCUPANTS DO NOT FILL is the defect a reviewer sees as "there was room for
           this". An empty area is only its extreme case, and the two were the same finding all
           along: a 245x100 band holding a 245x40 row reads on screen as a gap, and a part that
           could have spread reads as a part that would not. Reported per axis, since which axis
           went unused is what says whether something could grow or something could move in. */
        const x1 = Math.min(...a.occupants.map(o => o.x));
        const y1 = Math.min(...a.occupants.map(o => o.y));
        const x2 = Math.max(...a.occupants.map(o => o.x + o.w));
        const y2 = Math.max(...a.occupants.map(o => o.y + o.h));
        const slackW = a.w - (x2 - x1);
        const slackH = a.h - (y2 - y1);
        if (slackW >= 40 && slackW >= a.w * 0.25) {
            failures.push(`area ${name} is ${a.w}px wide and its occupants use ${x2 - x1}px — ${Math.round(slackW)}px unused`);
        }
        if (slackH >= 40 && slackH >= a.h * 0.25) {
            /* THE PARTNER STACK'S OWN AREA IS THE ONE PLACE WHERE UNUSED HEIGHT IS THE DESIGN.
               Zone A is defined as the height the partner board leaves in its column, so the
               `stack` area is underfilled by exactly the band, and always — a failure there says
               the layout is wrong for being itself. What a reviewer wants to know is how much
               band there is and whether anything is in it, which is what the zone A areas say
               on their own. So it is a warning here, and a failure everywhere else.

               ONLY WHILE THE STACK IS ALONE IN ITS AREA. In the last resort the tools take that
               area too, and height going unused under a panel there is an ordinary finding. */
            const bandOnly =
                name === 'stack' &&
                a.occupants.every(o => (o.what || '').includes('bug-partner-stack'));
            (bandOnly ? warnings : failures).push(
                `area ${name} is ${a.h}px tall and its occupants use ${y2 - y1}px — ${Math.round(slackH)}px unused`,
            );
        }
    }

    /* CONTENT THAT PAINTS OUTSIDE THE PART THAT HOLDS IT. The part's own box sits in its track and
       reports nothing wrong; what is drawn inside can still be wider, and then it is over whatever
       is next to it. `.chatpresets-set` is five fixed tracks wide and centred, so a button size its
       track cannot hold spills equally BOTH ways — the left half onto the partner board.

       AGAINST THE PART'S OWN BOX, NOT ITS TRACK. A part being a few pixels taller than its track and
       spilling into the gutter touches nothing and was already documented here as noise; measuring
       against the track reported 167 of those. What is a defect is content escaping the box that was
       sized to hold it — and where that lands on a neighbour, the overlap check says so as well. */
    for (const [name, a] of Object.entries(areas)) {
        for (const o of a.occupants) {
            const out = Math.max(
                o.x - o.painted.x, o.y - o.painted.y,
                (o.painted.x + o.painted.w) - (o.x + o.w),
                (o.painted.y + o.painted.h) - (o.y + o.h),
            );
            if (out > 2) {
                failures.push(
                    `${o.what} in ${name} paints ${Math.round(out)}px outside itself ` +
                    `(box ${o.w}x${o.h}, painted ${o.painted.w}x${o.painted.h})`,
                );
            }
        }
    }

    /* TWO OCCUPANTS OVERLAPPING IS THE DEFECT, not an occupant exceeding its own track.
       A part is routinely a few pixels taller than the track it sits in and spills into the gutter,
       which touches nothing — measured 757px of stack in a 752px row, five pixels, on a page with
       no overflow at all. Flagging that buries the real thing in noise. What has actually gone
       wrong here is one element drawn ON another: a board over its neighbour, a panel over the
       end-of-game controls, a preset row over the partner board.

       COMPARED BY WHAT THEY PAINT. Comparing the boxes missed exactly the case a reviewer pointed
       at — the presets' panel sat neatly in its track while the buttons inside it were drawn 31px
       over the board beside it — because the defect was never in the box. */
    for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
            const p = placed[i].rec.painted;
            const s2 = placed[j].rec.painted;
            if (placed[i].rec.area === placed[j].rec.area) continue; // sharing an area is deliberate
            // A nested grid's areas live inside one of the outer grid's occupants, so every pair
            // of an ancestor and its descendant overlaps by construction. 102 of those on the run
            // that added nested grids, all of them `.partner-and-tools` over its own children.
            if (placed[i].el.contains(placed[j].el) || placed[j].el.contains(placed[i].el)) continue;
            const gap = 1; // a shared edge is not an overlap
            const over =
                p.x + p.w - gap > s2.x && s2.x + s2.w - gap > p.x &&
                p.y + p.h - gap > s2.y && s2.y + s2.h - gap > p.y;
            if (!over) continue;

            /* BOXES TOUCHING IS NOT A COLLISION; WHAT IS DRAWN DECIDES. A part is routinely a few
               pixels taller than its track and reaches into the gutter below it, where nothing is
               painted — the seat name sits in that band and the buttons start under it. A size
               threshold cannot separate those from the real thing, because a real collision here is
               small too. So the boxes only nominate a pair, and the surfaces inside them settle it:
               two LEAVES that share pixels are one drawn over the other, whatever their parents do. */
            const hit = collision(placed[i].el, placed[j].el);
            if (hit === null) continue;
            // BY HOW MUCH, because triage needs it: a five-pixel spill into a gutter and a board
            // drawn across its neighbour are the same sentence without a number.
            failures.push(
                `${placed[i].rec.what} (${placed[i].rec.area}) overlaps ` +
                `${placed[j].rec.what} (${placed[j].rec.area}) by ${hit.dx}x${hit.dy}px ` +
                `— ${hit.a} over ${hit.b}`,
            );
        }
    }

    /* SHORT LANDSCAPE IS SUPPOSED TO REACH BOTH EDGES. `#main-wrap.bug` replaces the site's five
       tracks with one `minmax(auto, auto)` column and leaves `place-content: center` standing, so
       whatever width no track claims is centred as two equal margins instead of going to the tools.
       Measured across the phones in landscape: 21px unused at 844, 28 at 852, 34 at 800, 44 at 915.
       Only in this mode — the boards are square-capped in tall landscape, where the leftover is the
       cap doing its job rather than a track failing to ask. */
    if (mode === 'short landscape') {
        const spans = Object.values(areas).filter(a => a.w > 0 && a.h > 0);
        if (spans.length) {
            const left = Math.min(...spans.map(a => a.x));
            const right = Math.max(...spans.map(a => a.x + a.w));
            const unused = Math.round(doc.clientWidth - (right - left));
            if (unused >= 12) {
                failures.push(
                    `short landscape leaves ${unused}px of the width unused — ` +
                    `the app spans ${Math.round(right - left)} of ${doc.clientWidth}px`,
                );
            }
        }
    }

    /* NO CHECK FOR "THE TOOLS BAR WRAPPED WITH ROOM TO SPARE", and this is the reasoning, so that
       it is not written again. It was, and it fired on 58 rows with nothing visibly wrong in them.

       The bar is `flex-flow: row wrap` and its tab strip is `flex: 1 1 120px` — it GROWS TO FILL
       whatever line it is on. So the strip always measures the full width of the bar, anything
       beside it wraps by construction, and the arithmetic said "the first line had exactly as much
       spare as the wrapped item needs" every time: an exact fit, which wraps once a gap is added.
       That is normal flex behaviour, not a defect.

       Nor can the intended question be asked of the geometry. "Could these two have shared a line"
       needs each child's intrinsic need, and a child that grows to fill has none to report —
       measured, the strip's min-content, max-content and drawn width are all the same number. What
       Nikolay actually described is that the draw and resign controls are drawn LARGER than the tab
       items and would fit beside them if they followed the same size. That is a rule about how those
       controls are sized, to be decided and then asserted, not a defect a measurement can find. */

    /* HOW CLOSE ANYTHING COMES TO A BOARD — A WARNING, NOT A FAILURE. An overlap is the extreme
       case of a clearance and the interesting ones stop short of it: measured at 1536x739 with both
       boards at minimum zoom, the partner's seat name hung 1.7px below the stack it belongs to and
       the first preset button began 3.3px under that. Nothing touched; it reads as touching.

       AT A LOWER PRIORITY BECAUSE MOST OF IT IS BY DESIGN: of 141 findings on a full run, 108 were a
       clearance of exactly 0.0px — a panel's edge flush with a board's pocket, which is one grid
       track ending where the next begins. A reviewer can read those and decide; a row is not broken
       for having them. Asked of the boards only: two tool parts stacked close are deliberate. */
    for (const stack of placed) {
        if (!/bug-(own|partner)-stack/.test(stack.rec.what)) continue;
        for (const other of placed) {
            if (other === stack || other.rec.area === stack.rec.area) continue;
            if (stack.el.contains(other.el) || other.el.contains(stack.el)) continue;
            let nearest = null;
            for (const a of surfaces(stack.el)) {
                for (const b of surfaces(other.el)) {
                    const dx = Math.max(a.r.left - b.r.right, b.r.left - a.r.right);
                    const dy = Math.max(a.r.top - b.r.bottom, b.r.top - a.r.bottom);
                    // Only a pair sharing one axis is a neighbour; a diagonal one is not crowded.
                    let gap = null;
                    if (dx < 0 && dy >= 0) gap = dy;
                    else if (dy < 0 && dx >= 0) gap = dx;
                    if (gap === null) continue;
                    if (nearest === null || gap < nearest.gap) nearest = { gap, a: a.what, b: b.what };
                }
            }
            if (nearest !== null && nearest.gap < 8) {
                warnings.push(
                    nearest.gap < 0.05
                        ? `${other.rec.what} (${other.rec.area}) sits flush against ${stack.rec.what}` +
                          ` — ${nearest.b} and ${nearest.a}`
                        : `${other.rec.what} (${other.rec.area}) comes within ${nearest.gap.toFixed(1)}px ` +
                          `of ${stack.rec.what} — ${nearest.b} and ${nearest.a}`,
                );
            }
        }
    }

    /* A ROW OF BUTTONS THAT WILL NOT SPREAD. `publishPresetGap()` solves the gap so that ten
       buttons fill the row exactly; a fraction of rounding then makes ten NOT fit, the flex wraps
       to five and five, and each row keeps the ten-across gap while occupying half its box —
       centred, which is what it looks like on screen. Measured both ways: 755px of row filled at a
       95.75px gap, against 290px of row in a 584px box at 3.56px. The row's own width against the
       box it sits in is the reading that separates them. */
    /* WHAT EVERY PRESET ROW AFFORDS, beside what the page published. One gap serves the whole page
       and it is the smallest any laid-out row can pay for, so a row spaced far below what it could
       afford means either a narrower row somewhere is binding it — which this list would show — or
       the value on the page is not the one these rows imply, and was left by an arrangement that is
       over. The two are indistinguishable from a screenshot and obvious from the numbers. */
    const presetRowBoxes = [];
    for (const flex of all('.chatpresets')) {
        if (!shown(flex)) continue;
        const inner = flex.clientWidth - parseFloat(getComputedStyle(flex).paddingLeft) -
                      parseFloat(getComputedStyle(flex).paddingRight);
        const sets = [...flex.querySelectorAll('.chatpresets-set')].filter(shown);
        if (!sets.length || !(inner > 0)) continue;
        const byRow = {};
        for (const set of sets) {
            const r = set.getBoundingClientRect();
            const key = Math.round(r.y);
            byRow[key] = (byRow[key] || 0) + r.width;
        }
        const widest = Math.max(...Object.values(byRow));
        const slack = inner - widest;
        const perRow = Math.max(...Object.values(byRow).map(() => 0), sets.length > 1 &&
            Math.abs(sets[0].getBoundingClientRect().y - sets[1].getBoundingClientRect().y) < 1 ? 10 : 5);
        const button = length(app, '--bug-preset-btn');
        presetRowBoxes.push({
            inner: Math.round(inner), widest: Math.round(widest), perRow,
            affords: +(((inner - 1) - perRow * button) / (perRow - 1)).toFixed(2),
        });
        if (slack >= 40 && slack >= inner * 0.25) {
            failures.push(
                `preset row is ${Math.round(widest)}px in a ${Math.round(inner)}px box — ` +
                `${Math.round(slack)}px unused, so the buttons sit compacted`,
            );
        } else if (slack < -2) {
            failures.push(
                `preset row is ${Math.round(widest)}px and does not fit its ${Math.round(inner)}px box ` +
                `— ${Math.round(-slack)}px wider, spilling both sides`,
            );
        }
    }

    /* THE PUBLISHED GAP AGAINST THE SMALLEST ANY ROW AFFORDS — the page's own rule, checked. */
    if (presetRowBoxes.length && published.presetGap !== null) {
        const afforded = Math.min(...presetRowBoxes.map(r => r.affords));
        published.presetGapAfforded = +afforded.toFixed(2);
        if (afforded - published.presetGap > 4) {
            failures.push(
                `preset gap is ${published.presetGap}px but every row affords ` +
                `${afforded.toFixed(1)}px — rows: ` +
                presetRowBoxes.map(r => `${r.perRow}x in ${r.inner}px`).join(', '),
            );
        }
    }

    /* THE TWO STACKS AT THE SAME BOARD SIZE SHOULD BE DRAWN THE SAME — Nikolay, 2026-09-19, on
       `T1-C4-minxmin`: "if both are at minimum they should both have same size, which here seems to
       be the case and is good, but also they should have the same state of the username".

       WHAT THE SURVEY COULD NOT SEE. Every check until now asked about an area, a part, or a pair
       of surfaces. A stack that is 45px taller than the other while holding the same board breaks
       none of them: nothing overlaps, nothing overflows, and the height it takes is the height its
       area gives it. Measured at 768x1024 with both boards at minimum zoom — 188x188 each — the own
       stack came to 296.2 and the partner's to 251, because the own seat strips are 46.1px with the
       username on a line of its own and the partner's are 23.5px with it squeezed beside the pocket.
       Same board, different furniture, and the survey called the row clean.

       THE NAME'S STATE IS READ FROM ITS WIDTH, not from a class: `own-name-outside` is set by
       `seatNamePlacement.ts`, which runs on the round page only, while the stylesheet decides the
       same thing a second way through `--bug-name-outside` per stack. A name on its own line is as
       wide as the strip it is in; squeezed into the pocket row it gets what the pocket and the clock
       leave, which is a fraction of it. Measuring the drawn result asks neither mechanism to be
       right about the other.

       ONLY WHERE THE BOARDS MATCH. Different board sizes are expected to carry different furniture
       — the strips scale with the square, and a board too small to afford the extra line is the
       rule working — so this asks its question only when the two boards are the same size. */
    const seatFurniture = side => {
        const strips = all(`.${side}-seat`).filter(shown);
        const board = q(`.${side}-board cg-board`);
        const state = strip => {
            const name = strip.querySelector('round-player0, round-player1');
            if (!name) return null;
            const w = name.getBoundingClientRect().width;
            const stripW = strip.getBoundingClientRect().width;
            return stripW > 0 && w / stripW > 0.9 ? 'on its own line' : 'inline';
        };
        return {
            board: board ? +board.getBoundingClientRect().height.toFixed(1) : 0,
            strips: +strips.reduce((t, s) => t + s.getBoundingClientRect().height, 0).toFixed(1),
            name: [...new Set(strips.map(state).filter(x => x !== null))].join(' + ') || 'none',
        };
    };
    const seats = { own: seatFurniture('own'), partner: seatFurniture('partner') };
    if (seats.own.board > 0 && seats.partner.board > 0
        && Math.abs(seats.own.board - seats.partner.board) <= 1
        && (seats.own.name !== seats.partner.name || Math.abs(seats.own.strips - seats.partner.strips) > 2)) {
        failures.push(
            `the two stacks are drawn differently at the same board size ` +
            `(${Math.round(seats.own.board)}px): own strips ${seats.own.strips}px with the username ` +
            `${seats.own.name}, partner strips ${seats.partner.strips}px with it ${seats.partner.name}`,
        );
    }

    /* A RESOURCE THE PAGE ASKED FOR AND DID NOT GET.
       ------------------------------------------------------------------------------------
       Added 2026-09-19, after the stylesheet split silently broke every preset icon. A `url()`
       in CSS resolves against the STYLESHEET, not the page: `url('images/bugroundchat/P.svg')`
       meant `/static/images/...` from `/static/bughouse.css` and `/static/two-boards/components/
       images/...` from the file it moved to. 37 icons, all 404, and NOTHING here noticed —
       a missing background image paints nothing, moves nothing, and overlaps nothing. It was
       found by eye on the live harness, which is exactly what a survey is meant to make
       unnecessary.

       `responseStatus` on a resource entry is the whole check. It covers every asset the page
       fetched — images, fonts, stylesheets, the wasm — so the next thing that quietly fails to
       load is a failing row rather than a picture nobody drew. */
    const failedResources = performance
        .getEntriesByType('resource')
        .filter(r => r.responseStatus >= 400)
        .map(r => `${r.name.split('/').slice(-2).join('/')} ${r.responseStatus}`);
    if (failedResources.length) {
        const unique = [...new Set(failedResources)];
        failures.push(
            `${unique.length} resource(s) the page asked for failed: ${unique.slice(0, 4).join(', ')}` +
            (unique.length > 4 ? `, and ${unique.length - 4} more` : ''),
        );
    }

    /* PORTRAIT: THE BAND BETWEEN THE BOARDS, AND WHAT SHOULD BE IN IT.
       ------------------------------------------------------------------------------------
       Nikolay, 2026-09-19, and it is the largest group of unaccepted rows in the survey. Portrait
       stacks the partner board over the viewer's own, with the tools in a narrow track beside the
       partner's; the partner board is the shorter of the two, so it leaves a BAND across the page
       between the boards — 107px at 390x844, 147px on the analysis page — and everything that
       could use it stays queued in the 221px track instead, ellipsised.

       THE QUESTION IS ASKED OF THE BAND, NOT OF THE PART: is there room between the boards for
       this part, and is the part somewhere else? A part is IN the band when its middle is between
       the two stacks and it spans the page; anything else is beside the partner board.

       THE PRESET ROWS ARE ASKED TWICE, because their arrangement is the answer: ten buttons across
       the page is one row where the track has four rows of five, and two such rows is the whole
       block. Ten across is possible when the page is wide enough for ten buttons at the size the
       page itself will not go below — `--bug-preset-btn-min`, or WCAG's 24px where the page's own
       floor is under it, since a row that fits only by drawing untappable buttons does not fit. */
    const portraitBand = (() => {
        if (mode !== 'portrait') return null;
        const own = q('.bug-own-stack');
        const partner = q('.bug-partner-stack');
        if (!shown(own) || !shown(partner)) return null;
        const o = own.getBoundingClientRect();
        const pr = partner.getBoundingClientRect();
        const width = app.getBoundingClientRect().width;
        const band = { top: pr.bottom, bottom: o.top, width, height: o.top - pr.bottom };
        if (band.height <= 0) return null;
        const middleIn = el => {
            const r = el.getBoundingClientRect();
            return (r.top + r.bottom) / 2 > band.top && (r.top + r.bottom) / 2 < band.bottom;
        };
        const spansPage = el => el.getBoundingClientRect().width >= width - 4;
        band.holds = el => middleIn(el) && spansPage(el);
        band.free = band.height;
        return band;
    })();

    if (portraitBand) {
        const strip = q('.bug-round-tools-bar') || q('[role="tablist"]');
        const parts = [
            ['the tab strip is', strip],
            ['the move-list controls are', q('.btn-controls') || q('.analysis-controls-panel')],
            ['the engine box is', q('.analysis-engine-panel')],
        ].filter(([, el]) => shown(el));

        // What the band already carries comes off what is left to offer.
        for (const [, el] of parts) {
            if (portraitBand.holds(el)) portraitBand.free -= el.getBoundingClientRect().height;
        }

        for (const [name, el] of parts) {
            if (portraitBand.holds(el)) continue;
            const needs = el.getBoundingClientRect().height;
            if (needs <= portraitBand.free) {
                failures.push(
                    `portrait: ${name} ${Math.round(el.getBoundingClientRect().width)}px wide beside ` +
                    `the partner board while the band between the boards has ` +
                    `${Math.round(portraitBand.free)}px free and it needs ${Math.round(needs)}px — ` +
                    `it should take the full ${Math.round(portraitBand.width)}px there`,
                );
            }
        }

        /* THE PRESET ROWS, AND THE ARRANGEMENT THEY SHOULD REACH. */
        const presetParts = ['.chatpresets-panel-1', '.chatpresets-panel-2'].map(q).filter(shown);
        if (presetParts.length) {
            const gap = published.presetGap === null ? 3 : published.presetGap;
            const floor = Math.max(24, published.presetFloor === null ? 24 : published.presetFloor);
            const tenAcross = (portraitBand.width - 9 * gap) / 10;
            const stripH = shown(strip) ? strip.getBoundingClientRect().height : 0;
            const tens = (fired.presetRowLengths || []).filter(n => n === 10).length;
            /* THE STRONGEST ARRANGEMENT THE BAND CAN HOLD, not the first one tested. Both rows
               of presets fitting implies one does, so reporting the one-row case where the band
               has room for the whole block would understate what is being left unused. */
            if (tenAcross >= floor) {
                const rowH = tenAcross;
                const drawn = (fired.presetRowLengths || []).join('+') || 'unplaced';
                if (tens < 2 && stripH + 2 * rowH <= portraitBand.free) {
                    failures.push(
                        `portrait: the band between the boards has ${Math.round(portraitBand.free)}px ` +
                        `free — room for the tab strip (${Math.round(stripH)}px) and TWO rows of ten ` +
                        `presets at ${tenAcross.toFixed(1)}px (${Math.round(2 * rowH)}px, floor ` +
                        `${floor.toFixed(1)}) — and the buttons are drawn ${drawn} beside the board`,
                    );
                } else if (tens < 1 && rowH <= portraitBand.free) {
                    failures.push(
                        `portrait: the band between the boards has ${Math.round(portraitBand.free)}px ` +
                        `free and the page fits TEN presets across at ${tenAcross.toFixed(1)}px ` +
                        `(floor ${floor.toFixed(1)}), which needs ${Math.round(rowH)}px — the buttons ` +
                        `are drawn ${drawn} beside the board`,
                    );
                }
            }
        }
    }

    /* BOTH BOARDS AT THEIR MINIMUM ARE THE SAME SIZE — Nikolay, 2026-09-19: "both boards at
       minimum zoom must have exact same size, the minimum zoom might be different in terms of
       percents, but those percents are different because we have different caps for max zoom".

       IT IS THE FLOOR'S OWN DEFINITION, so this is the rule already written down being checked
       rather than a new one. `MIN_STACK_IN_LEFT_SQUARES` in squareUnit.ts is four squares OF THE
       LEFT BOARD — a size, deliberately not a percentage, because "no less than 50%" lets one
       board stop at half of a big square and the other at half of an already small one. Each
       column converts that one size back into its own percentage, and the comment there says what
       is expected of the result: "The two sliders therefore stop at different numbers AND AT THE
       SAME BOARD SIZE, which is the whole point."

       ASKED OF THE REQUEST, because the drawn page cannot tell a board at its floor from a board
       at any other zoom. Only where the walk asked BOTH columns for their minimum.

       A device pixel of tolerance: both squares are quantised down to whole device pixels
       independently, so a difference smaller than that is not a difference in anything drawn. */
    const atMinimum = ctx && ctx.zoom && ctx.zoom[0] === ctx.minZoom && ctx.zoom[1] === ctx.minZoom;
    if (atMinimum) {
        const ownBoard = q('.own-board cg-board');
        const partnerBoard = q('.partner-board cg-board');
        if (shown(ownBoard) && shown(partnerBoard)) {
            const ownSq = ownBoard.getBoundingClientRect().height / 8;
            const partnerSq = partnerBoard.getBoundingClientRect().height / 8;
            if (Math.abs(ownSq - partnerSq) > 1 / (window.devicePixelRatio || 1)) {
                failures.push(
                    `both boards were zoomed to their minimum and are NOT the same size — own square ` +
                    `${ownSq.toFixed(1)}px against the partner's ${partnerSq.toFixed(1)}px ` +
                    `(${Math.round(ownSq * 8)}px of board against ${Math.round(partnerSq * 8)}px)`,
                );
            }
        }
    }

    /* EVERY TAP TARGET AGAINST WCAG 2.2'S 24x24 CSS PIXELS (2.5.8, Target Size (Minimum)).
       ------------------------------------------------------------------------------------
       The figure is already this stylesheet's reference — `--bug-preset-btn-min` exists to clear
       it, and its comment cites the 13.23px the buttons measured before it did. A page that draws
       a 9.8px button is failing a published standard, which is a firmer thing to report than "that
       looks small", and it is the check that finds a starved column without anyone inventing a
       minimum: the page publishes its own floor, then goes under it, and the target size says by
       how much it matters.

       WITHOUT THE STANDARD'S EXCEPTIONS, deliberately, because they need judgement this cannot
       make: a target is exempt where spacing leaves a 24px circle around it, where it is inline in
       a sentence, or where its size is essential. So this counts what is under the line and names
       the worst of them, and a reviewer decides. */
    const tapTargets = all('button, [role="tab"], a[href], input:not([type="hidden"]), select')
        .filter(shown)
        .map(el => {
            const r = el.getBoundingClientRect();
            const name = (el.getAttribute('title') || el.textContent.trim() ||
                          el.className.toString() || el.tagName).slice(0, 24);
            return { what: name, w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
        });
    const undersized = tapTargets
        .filter(t => t.w < 24 || t.h < 24)
        .sort((x, y) => x.w * x.h - y.w * y.h);
    const describe = list => list.slice(0, 3).map(t => `${t.what} ${t.w}x${t.h}`).join(', ');
    /* TWO TIERS, AND THE LINE BETWEEN THEM IS WHICH EXCEPTIONS COULD APPLY.
       Measured first as one failure, which turned every row in the survey red: 264 of 264, and
       1159 of the 1163 findings were a username link or a slider track — short in ONE dimension
       and wide in the other, which is exactly the shape the standard's inline-and-spacing
       exceptions are written for. A check that fires everywhere says nothing.

       Under the minimum in BOTH dimensions is the other thing entirely: small every way, so no
       exception reaches it, and it is where the real ones are — preset buttons at 9.8x9.8 in a
       61px tools column, a multipv slider drawn 2px wide. Four rows, not 264. */
    const tiny = undersized.filter(t => t.w < 24 && t.h < 24);
    if (tiny.length) {
        failures.push(
            `${tiny.length} tap target(s) under WCAG's 24x24px minimum in BOTH dimensions — ` +
            `smallest: ${describe(tiny)}`,
        );
    }
    const narrow = undersized.filter(t => !(t.w < 24 && t.h < 24));
    if (narrow.length) {
        warnings.push(
            `${narrow.length} of ${tapTargets.length} tap targets are under WCAG's 24px minimum ` +
            `on one axis — smallest: ${describe(narrow)}`,
        );
    }

    return {
        ok: true,
        warnings,
        presetRowBoxes,
        seats,
        tapTargets: { total: tapTargets.length, undersized },
        // THE LAYOUT VIEWPORT, which is the one the stylesheet answered. `innerWidth` is the
        // visual viewport and reads LARGER than the device wherever the browser has zoomed out to
        // fit an overflowing page — a 810px tablet reported itself 960 wide. `fit.visual` keeps it.
        viewport: { w: doc.clientWidth, h: doc.clientHeight, dpr: window.devicePixelRatio },
        fit,
        mode,
        zoomAvailable: zooms,
        page: app.classList.contains('analysis-app') ? 'analysis' : 'round',
        zoomDrawn: [
            published.allowanceA ? Math.round((published.squareA / published.allowanceA) * 100) : null,
            published.allowanceB ? Math.round((published.squareB / published.allowanceB) * 100) : null,
        ],
        home,
        drops,
        flags,
        template: {
            areas: cs.gridTemplateAreas,
            rows: cs.gridTemplateRows,
            columns: cs.gridTemplateColumns,
        },
        areas,
        published,
        fired,
        selectedTab: (all('[role="tab"]').find(t => t.getAttribute('aria-selected') === 'true') || {}).textContent,
        failures,
    };
}
