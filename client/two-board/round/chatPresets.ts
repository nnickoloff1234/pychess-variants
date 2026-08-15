import { h, VNode } from 'snabbdom';
import * as cg from 'chessgroundx/types';

import { _ } from '@/i18n';
import { Variant } from '../../variants';

// The bughouse chat presets: the grid of "need a knight", "don't trade", "my bad"
// buttons a player uses to tell their partner something without typing it.
//
// This used to be rendered from inside `client/chat.ts`, the chat view shared by
// every page, which imported this module and branched on whether the controller
// was a bughouse round controller. A shared view reaching into one page's module
// to decide what to draw. Nothing about these buttons belongs to chat except that
// clicking one sends a message.
//
// A widget in the house shape — one composed view, built once — so the page can
// put it wherever a layout wants it, rather than wherever the chat view's own
// flex box happens to put it.
//
// TWO-STEP INITIALISATION, and it is a real ordering constraint rather than an
// awkwardness to design around. Everything these buttons LOOK like comes from the
// variant: the pocket roles decide which pieces get a "need" and a "don't give"
// pair, and the tells are fixed. So they are built in the constructor. But
// clicking one has to send, and only the round controller can send — and the
// controller is constructed in the round app's `insert` hook, which runs after
// the view it is being inserted into has been built. The widget therefore cannot
// have a sender when it renders, and is given one afterwards by `wire()`.
//
// Between the page's patch and that call, a click does nothing at all. That gap
// is a few milliseconds inside the same task in which the page becomes visible,
// so queueing a click for later delivery would be machinery for a case that
// cannot occur — but discarding is a decision, not an oversight.
export class ChatPresetsView {
    private readonly vnode: VNode;

    // set by wire(); until then a click is discarded
    private send: ((message: string) => void) | undefined;

    constructor(variant: Variant) {
        const roles: cg.Role[] = [...variant.pocket!.roles.white];

        const need = roles.map(role => this.button(role.charAt(0), _('Need %1', variant.pocket!.pieceNames![role])));
        const dontGive = roles.map(role =>
            this.button('no' + role.charAt(0), _("Don't give %1", variant.pocket!.pieceNames![role])),
        );
        const tells = [
            this.button('sit', _('Sit/stall')),
            this.button('go', _('Go/hurry')),
            this.button('trade', _('Trades are good')),
            this.button('notrade', _("Don't trade")),
            this.button('mate', _('I have checkmate')),
            this.button('ok', _('OK')),
            this.button('no', _('No')),
            this.button('mb', _('My bad')),
            this.button('nvm', _('Nevermind')),
            this.button('nice', _('Nice')),
        ];

        // --rolesCount drives the grid's column count in the stylesheet
        this.vnode = h('div#chatpresets', { style: { '--rolesCount': String(roles.length) } }, [
            ...need,
            ...dontGive,
            ...tells,
        ]);
    }

    // The message a preset sends is its own name with the `!bug!` marker, which is
    // how the receiving side recognises a preset rather than typed text.
    private button(name: string, title: string): VNode {
        return h(
            `button.bugchat.${name}`,
            { on: { click: () => this.send?.(`!bug!${name}`) }, props: { title } },
            [],
        );
    }

    view(): VNode {
        return this.vnode;
    }

    // Step two. The function handed in MUST be the one chat itself uses, so that a
    // preset is reported and delivered exactly as typing the same text would be —
    // assembling the message envelope here would be a second definition of what a
    // chat message is, and `selfReport` is easy to forget.
    wire(send: (message: string) => void): void {
        this.send = send;
    }
}
