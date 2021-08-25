import { h } from "snabbdom";
import { VNode } from 'snabbdom/vnode';

import { _ } from './i18n';
import RoundController from './roundCtrl';
import {uci2cg, VARIANTS} from './chess';
import { timeago, renderTimeago } from './datetime';
import { aiLevel, gameType, renderRdiff } from './profile';
import { timeControlStr } from "./view";
import {Chessground} from "chessgroundx";

function runGround(vnode: VNode, model) {
    const el = vnode.elm as HTMLElement;
    const ctrl = new RoundController(el, model);
    const cg = ctrl.chessground;
    window["cg"] = cg;
}

function getFen(bugGameId, cg){
        const xmlhttp = new XMLHttpRequest();
    const url = "/api/games";
    xmlhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            // const oldVNode = document.getElementById('games');
            // if (oldVNode instanceof Element) {
            //     patch(oldVNode as HTMLElement, h('grid-container#games', response.map(game => gameView(games, game, game.fen, game.lastMove))));

                const response = JSON.parse(this.responseText);
                console.log("responseText", this.responseText);
                for (let x in response) {
                    console.log(x, response[x], bugGameId);
                    if (response[x].gameId == bugGameId) {
                        console.log("loading game", response[x].gameId, response[x].fen, response[x].lastMove);
                        cg.set({
                            fen: response[x].fen,
                            lastMove: response[x].lastMove,
                        });

                    }
                }
            // }
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();

}

function gameView(bugGameId/*game,*/ /*fen, lastMove*/) {
    const variant = VARIANTS["crazyhouse"/*game.variant*/];
    return h(`minigame#bugboard.${variant.board}.${variant.piece}`,
        h('div', [
        /*h('div.row', [
            h('div.variant-info', [
                h('div.icon', { props: { title: variant.displayName(game.chess960) }, attrs: { "data-icon": variant.icon(game.chess960) } }),
                h('div.tc', timeControlStr(game.base, game.inc, game.byoyomi)),
            ]),
            h('div.name', game.b),
        ]),*/
        h(`div.cg-wrap.${variant.cg}`, {
            hook: {
                insert: vnode => {
                    const cg = Chessground(vnode.elm as HTMLElement, {
                        // fen: fen,
                        // lastMove: lastMove,
                        geometry: variant.geometry,
                        coordinates: false,
                        viewOnly: true
                    });
                    console.log(cg);

                    // setTimeout( function(){getFen(bugGameId,cg)}, 3000);
                    getFen(bugGameId,cg);

                    const evtSource = new EventSource("/api/ongoing");
                    evtSource.onmessage = function(event) {
                        const message = JSON.parse(event.data);
                        console.log("ongoing", message);
                        if (message.gameId === bugGameId) {
                            const parts = message.fen.split(" ");
                            let lastMove = message.lastMove;
                            if (lastMove !== null) {
                                lastMove = uci2cg(lastMove);
                                lastMove = [lastMove.slice(0,2), lastMove.slice(2,4)];
                                if (lastMove[0][1] === '@')
                                    lastMove = [lastMove[1]];
                            }

                            cg.set({
                                fen: parts[0],
                                lastMove: lastMove,
                            });
                        }
                    }
                }
            }
        }),
    ]));
}

export function roundViewBug(model): VNode[] {
    console.log("roundViewBug model=", model);
    const variant = VARIANTS[model.variant];
    const chess960 = model.chess960 === 'True';
    const dataIcon = variant.icon(chess960);
    const fc = variant.firstColor;
    const sc = variant.secondColor;
    const bugGameId = model.bug_gameid;

    renderTimeago();

    return [h('div.round-app', [
            h('selection#mainboard.' + variant.board + '.' + variant.piece, [
                h('div.cg-wrap.' + variant.cg, {
                    hook: {
                        insert: (vnode) => runGround(vnode, model)
                    },
                }),
            ]),
            gameView(bugGameId),
            h('div.pocket-top', [
                h('div.' + variant.piece + '.' + model["variant"], [
                    h('div.cg-wrap.pocket', [
                        h('div#pocket0'),
                    ]),
                ]),
            ]),
            h('div.info-wrap0', [
                h('div.clock-wrap', [
                    h('div#clock0'),
                    h('div#more-time'),
                ]),
                h('div#misc-info0'),
            ]),
            h('div#expiration-top'),
            h('round-player0#rplayer0'),
            h('div#move-controls'),
            h('div.movelist-block', [
                h('div#movelist'),
            ]),
            h('div#game-controls'),
            h('round-player1#rplayer1'),
            h('div#expiration-bottom'),
            h('div.info-wrap1', [
                h('div#clock1'),
                h('div#misc-info1'),
            ]),
            h('div.pocket-bot', [
                h('div.' + variant.piece + '.' + model["variant"], [
                    h('div.cg-wrap.pocket', [
                        h('div#pocket1'),
                    ]),
                ]),
            ]),
        ]),
        h('aside.sidebar-first', [
            h('div.game-info', [
                h('div.info0.icon', { attrs: { "data-icon": dataIcon } }, [
                    h('div.info2', [
                        h('div.tc', [
                            timeControlStr(model["base"], model["inc"], model["byo"]) + " • " + gameType(model["rated"]) + " • ",
                            h('a.user-link', {
                                attrs: {
                                    target: '_blank',
                                    href: '/variants/' + model["variant"] + (chess960 ? '960': ''),
                                }
                            },
                                variant.displayName(chess960)),
                        ]),
                        Number(model["status"]) >= 0 ? h('info-date', { attrs: { timestamp: model["date"] } }, timeago(model["date"])) : _("Playing right now"),
                    ]),
                ]),
                h('div.player-data', [
                    h('i-side.icon', {
                        class: {
                            "icon-white": fc === "White",
                            "icon-black": fc === "Black",
                            "icon-red":   fc === "Red",
                            "icon-blue":  fc === "Blue",
                            "icon-gold":  fc === "Gold",
                            "icon-pink":  fc === "Pink",
                        }
                    }),
                    h('player', playerInfo(model, 'w', null)),
                ]),
                h('div.player-data', [
                    h('i-side.icon', {
                        class: {
                            "icon-white": sc === "White",
                            "icon-black": sc === "Black",
                            "icon-red":   sc === "Red",
                            "icon-blue":  sc === "Blue",
                            "icon-gold":  sc === "Gold",
                            "icon-pink":  sc === "Pink",
                        }
                    }),
                    h('player', playerInfo(model, 'b', null)),
                ]),
            ]),
            h('div#roundchat'),
        ]),
        h('under-left#spectators'),
        h('under-board', [
            h('div#janggi-setup-buttons'),
            h('div#ctable-container'),
        ]),
    ];

}

export function roundView(model): VNode[] {
    console.log("roundView model=", model);
    const variant = VARIANTS[model.variant];
    const chess960 = model.chess960 === 'True';
    const dataIcon = variant.icon(chess960);
    const fc = variant.firstColor;
    const sc = variant.secondColor;

    renderTimeago();

    return [h('aside.sidebar-first', [
            h('div.game-info', [
                h('div.info0.icon', { attrs: { "data-icon": dataIcon } }, [
                    h('div.info2', [
                        h('div.tc', [
                            timeControlStr(model["base"], model["inc"], model["byo"]) + " • " + gameType(model["rated"]) + " • ",
                            h('a.user-link', {
                                attrs: {
                                    target: '_blank',
                                    href: '/variants/' + model["variant"] + (chess960 ? '960': ''),
                                }
                            },
                                variant.displayName(chess960)),
                        ]),
                        Number(model["status"]) >= 0 ? h('info-date', { attrs: { timestamp: model["date"] } }, timeago(model["date"])) : _("Playing right now"),
                    ]),
                ]),
                h('div.player-data', [
                    h('i-side.icon', {
                        class: {
                            "icon-white": fc === "White",
                            "icon-black": fc === "Black",
                            "icon-red":   fc === "Red",
                            "icon-blue":  fc === "Blue",
                            "icon-gold":  fc === "Gold",
                            "icon-pink":  fc === "Pink",
                        }
                    }),
                    h('player', playerInfo(model, 'w', null)),
                ]),
                h('div.player-data', [
                    h('i-side.icon', {
                        class: {
                            "icon-white": sc === "White",
                            "icon-black": sc === "Black",
                            "icon-red":   sc === "Red",
                            "icon-blue":  sc === "Blue",
                            "icon-gold":  sc === "Gold",
                            "icon-pink":  sc === "Pink",
                        }
                    }),
                    h('player', playerInfo(model, 'b', null)),
                ]),
            ]),
            h('div#roundchat'),
        ]),
        h('div.round-app', [
            h('selection#mainboard.' + variant.board + '.' + variant.piece, [
                h('div.cg-wrap.' + variant.cg, {
                    hook: {
                        insert: (vnode) => runGround(vnode, model)
                    },
                }),
            ]),
            h('div.pocket-top', [
                h('div.' + variant.piece + '.' + model["variant"], [
                    h('div.cg-wrap.pocket', [
                        h('div#pocket0'),
                    ]),
                ]),
            ]),
            h('div.info-wrap0', [
                h('div.clock-wrap', [
                    h('div#clock0'),
                    h('div#more-time'),
                ]),
                h('div#misc-info0'),
            ]),
            h('div#expiration-top'),
            h('round-player0#rplayer0'),
            h('div#move-controls'),
            h('div.movelist-block', [
                h('div#movelist'),
            ]),
            h('div#game-controls'),
            h('round-player1#rplayer1'),
            h('div#expiration-bottom'),
            h('div.info-wrap1', [
                h('div#clock1'),
                h('div#misc-info1'),
            ]),
            h('div.pocket-bot', [
                h('div.' + variant.piece + '.' + model["variant"], [
                    h('div.cg-wrap.pocket', [
                        h('div#pocket1'),
                    ]),
                ]),
            ]),
        ]),
        h('under-left#spectators'),
        h('under-board', [
            h('div#janggi-setup-buttons'),
            h('div#ctable-container'),
        ]),
    ];
}

function playerInfo(model, color: string, rdiff: number | null) {
    const username = model[color + "player"];
    const title = model[color + "title"];
    const level = model.level;
    const rating = model[color + "rating"];

    return h('a.user-link', { attrs: { href: '/@/' + username } }, [
        h('player-title', " " + title + " "),
        username + aiLevel(title, level) + (title !== 'BOT' ? (" (" + rating + ") ") : ''),
        rdiff === null ? h('rdiff#' + color + 'rdiff') : renderRdiff(rdiff),
    ]);
}
