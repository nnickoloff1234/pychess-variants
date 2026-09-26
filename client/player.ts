import { h, VNode } from 'snabbdom';

import { aiLevel } from './result';
import { _ } from './i18n';
import { displayUsername, userLink } from './user';

// A player bar. `id` identifies the bar's presence icon, and by default also names
// its root element. The bughouse round seat views override `root`: their bars sit in
// a page-layout slot whose element carries classes and an id of its own, and whose
// tag must not vary per board — so there the root selector and the icon id diverge.
export function player(
    id: string,
    title: string,
    name: string,
    rating: string,
    level: number,
    online = false,
    root = 'round-' + id,
    patron = false,
    /* WHETHER THERE IS ANYONE FOR THE DOT TO BE ABOUT.
       ------------------------------------------------------------------------------------
       The icon is OMITTED, not hidden. A page with no game — the analysis board opened from
       the Tools menu — has no players, so it renders no usernames; it was still drawing four
       presence dots, which is a claim about nobody rather than a false claim about someone.

       A parameter rather than a CSS rule, deliberately: `display: none` leaves an element in
       the DOM carrying `icon-offline`, a class that is still an assertion, and hides the
       symptom where the cause is an argument. This cannot be defeated by a later cascade
       change either. */
    presence = true,
): VNode {
    const displayName = displayUsername(name);
    return h(root, [
        h('div.player-data', [
            presence ? h('i-side#' + id + '.icon', {
                class: {
                    online,
                    offline: !online,
                    'icon-online': online && !patron,
                    'icon-offline': !online && !patron,
                    'icon-patron-wing': patron,
                },
                attrs: patron ? { title: _('PyChess Patron') } : {},
            }) : null,
            h('player', [
                userLink(name, [
                    title !== '' ? h('player-title', title + ' ') : '',
                    displayName + aiLevel(name, level),
                ]),
                h('rating', title !== 'BOT' ? rating : ''),
            ]),
        ]),
    ]);
}
