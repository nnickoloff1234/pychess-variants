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
 */
() => {
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
    const areaNames = [
        ...new Set(cs.gridTemplateAreas.replace(/"/g, ' ').split(/\s+/).filter(n => n && n !== '.')),
    ];

    /* PROBED, NOT INFERRED. A named area's box is not its row's box and not its occupant's box —
       a throwaway element placed in the area is the only thing that answers for the area itself.
       IT MUST BE MADE TO STRETCH. A grid item inherits the container's alignment, and these
       containers align their real occupants deliberately — `align-self: start` on a stack, centring
       elsewhere — so a marker left to inherit reports its own content size instead of the cell's.
       Measured before this was forced: a `zoneA2` of 240px reported as 120, which then made every
       occupant look as though it overflowed its area. */
    const areas = {};
    for (const name of areaNames) {
        const d = document.createElement('div');
        d.style.cssText =
            'grid-area:' + name +
            ';visibility:hidden;pointer-events:none;justify-self:stretch;align-self:stretch;' +
            'width:auto;height:auto;min-width:0;min-height:0;margin:0;padding:0;border:0;';
        app.appendChild(d);
        areas[name] = { ...box(d), occupants: [] };
        d.remove();
    }
    /* Only the OUTERMOST element claiming each area. A grid-area declaration on a descendant is
       inert — its parent is not a grid — but it still reads back from `getComputedStyle`, and
       counting it would compare a child against its own parent. */
    const claimants = all('*').filter(el => {
        const a = getComputedStyle(el).gridArea.split('/')[0].trim();
        return a && a !== 'auto' && areas[a] !== undefined && el.offsetParent !== null;
    });
    const outermost = claimants.filter(el => !claimants.some(other => other !== el && other.contains(el)));
    for (const el of outermost) {
        const a = getComputedStyle(el).gridArea.split('/')[0].trim();
        areas[a].occupants.push({
            what: (el.className.toString() || el.tagName).slice(0, 40),
            area: a,
            ...box(el),
        });
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
        appHeight: raw(app, '--bug-app-h') || null,
        presetButton: set ? length(set, '--bug-preset-btn') : null,
        presetFloor: set ? length(set, '--bug-preset-btn-min') : null,
        presetCeiling: set ? length(set, '--bug-preset-btn-max') : null,
        presetGap: set ? length(set, '--bug-preset-gap') : null,
        presetGapFloor: set ? length(set, '--bug-preset-gap-min') : null,
        presetAlign: set ? raw(set, '--bug-preset-align') || 'center' : null,
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
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const overflowY = doc.scrollHeight - doc.clientHeight;
    if (overflowX > 1) failures.push(`page overflows horizontally by ${overflowX}px`);
    if (overflowY > 1) failures.push(`page overflows vertically by ${overflowY}px`);

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
        }
    }

    /* TWO OCCUPANTS OVERLAPPING IS THE DEFECT, not an occupant exceeding its own track.
       A part is routinely a few pixels taller than the track it sits in and spills into the gutter,
       which touches nothing — measured 757px of stack in a 752px row, five pixels, on a page with
       no overflow at all. Flagging that buries the real thing in noise. What has actually gone
       wrong here, twice, is one element drawn ON another: a board over its neighbour, a panel over
       the end-of-game controls. So the areas' occupants are compared with each other. */
    const placed = Object.values(areas).flatMap(a => a.occupants);
    for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
            const p = placed[i];
            const s2 = placed[j];
            if (p.area === s2.area) continue; // sharing an area is deliberate — see the last resort
            const gap = 1; // a shared edge is not an overlap
            const over =
                p.x + p.w - gap > s2.x && s2.x + s2.w - gap > p.x &&
                p.y + p.h - gap > s2.y && s2.y + s2.h - gap > p.y;
            if (!over) continue;
            // BY HOW MUCH, because triage needs it: a five-pixel spill into a gutter and a board
            // drawn across its neighbour are the same sentence without a number.
            const dx = Math.round(Math.min(p.x + p.w, s2.x + s2.w) - Math.max(p.x, s2.x));
            const dy = Math.round(Math.min(p.y + p.h, s2.y + s2.h) - Math.max(p.y, s2.y));
            failures.push(
                `${p.what} (${p.area}) overlaps ${s2.what} (${s2.area}) by ${dx}x${dy}px`,
            );
        }
    }

    return {
        ok: true,
        viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
        mode,
        zoomAvailable: zooms,
        page: app.classList.contains('analysis-app') ? 'analysis' : 'round',
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
