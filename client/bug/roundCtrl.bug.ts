import { h, VNode } from 'snabbdom';
import * as cg from 'chessgroundx/types';

import { _ } from '../i18n';
import { patch } from '../document';
import { Clock } from '../clock';
import { ChatController, chatMessage, chatView } from '../chat';
import { createMovelistButtons, updateMovelist } from './movelist.bug';
import {
    Clocks,
    MsgBoard,
    MsgChat,
    MsgFullChat,
    MsgGameEnd,
    MsgMove,
    MsgMovesAfterReconnect,
    MsgNewGame,
    MsgUserConnected,
    Step
} from "../messages";
import {
    MsgUserDisconnected,
    MsgUserPresent,
    MsgDrawOffer,
    MsgDrawRejected,
    MsgRematchOffer,
    MsgRematchRejected,
    MsgUpdateTV,
    MsgGameStart, MsgViewRematch
} from '../roundType';
import { JSONObject, PyChessModel } from "../types";
import { GameControllerBughouse } from "./gameCtrl.bug";
import { BLACK, getTurnColor, uci2LastMove, WHITE } from "../chess";
import { sound } from "../sound";
import { player } from "../player";
import { WebsocketHeartbeatJs } from '../socket/socket';
import { notify } from "../notification";
import { VARIANTS } from "../variants";
import { createWebsocket } from "@/socket/webSocketUtils";
import AnalysisControllerBughouse from "@/bug/analysisCtrl.bug";
import {boardSettings} from "@/boardSettings";
import {ChessgroundController} from "@/cgCtrl";

export class RoundControllerBughouse implements ChatController {
    sock: WebsocketHeartbeatJs;

    b1: GameControllerBughouse;
    b2: GameControllerBughouse;

    username: string;
    gameId: string;
    readonly anon: boolean;

    steps: Step[];
    ply: number;
    plyVari: number;

    moveControls: VNode;
    status: number;
    result: string;

    autoPromote: boolean;

    clocks: [Clock, Clock];
    clocksB: [Clock, Clock];
    clocktimes: Clocks;
    clocktimesB: Clocks;
    // expirations: [VNode | HTMLElement, VNode | HTMLElement];
    expiStart: number;
    firstmovetime: number;
    profileid: string;
    level: number;
    clockOn: boolean;
    vmaterial0: VNode | HTMLElement;
    vmaterial1: VNode | HTMLElement;
    vmiscInfoW: VNode;
    vmiscInfoB: VNode;

    vdialog: VNode;
    berserkable: boolean;
    settings: boolean;
    tv: boolean;
    animation: boolean;
    showDests: boolean;
    blindfold: boolean;
    handicap: boolean = false;
    setupFen: string;
    prevPieces: cg.Pieces;
    focus: boolean;
    finishedGame: boolean;
    msgMovesAfterReconnect: MsgMovesAfterReconnect; // Always store the last "move" message that was passed for sending via websocket.
                          // In case of bad connection, we are never sure if it was sent (thus the name)
                          // until a "board" message from server is received from server that confirms it.
                          // So if at any moment connection drops, after reconnect we always resend it.
                          // If server received and processed it the first time, it will just ignore it

    base: number;
    inc: number;
    vmovelist: VNode | HTMLElement;

    spectator: boolean;

    gameControls: VNode; // todo: usually inherited from gameCtrl - think about some reusable solution (DRY)
    readonly home: string;

    vplayerA0: VNode;
    vplayerA1: VNode;

    vplayerB0: VNode;
    vplayerB1: VNode;

    colors: cg.Color[];
    colorsB: cg.Color[];

    players: string[];
    playersB: string[];

    wplayer: string;
    bplayer: string;

    wtitle: string;
    btitle: string;
    wrating: string;
    brating: string;

    wplayerB: string;
    bplayerB: string;

    wtitleB: string;
    btitleB: string;
    wratingB: string;
    bratingB: string;

    myColor: Map<'a'|'b', cg.Color|undefined> = new Map<'a'|'b', cg.Color|undefined>([['a', undefined],['b', undefined]]);
    partnerColor: Map<'a'|'b', cg.Color|undefined> = new Map<'a'|'b', cg.Color|undefined>([['a', undefined],['b', undefined]]);

    constructor(el1: HTMLElement,el1Pocket1: HTMLElement,el1Pocket2: HTMLElement,el2: HTMLElement,el2Pocket1: HTMLElement,el2Pocket2: HTMLElement, model: PyChessModel) {

        this.home = model.home;

        this.base = Number(model["base"]);
        this.inc = Number(model["inc"]);
        this.status = Number(model["status"]);

        this.gameId = model["gameId"] as string;
        this.username = model["username"];
        this.anon = model.anon === 'True';

        this.focus = !document.hidden;
        document.addEventListener("visibilitychange", () => {this.focus = !document.hidden});
        window.addEventListener('blur', () => {this.focus = false});
        window.addEventListener('focus', () => {this.focus = true});
//
        const onOpen = () => {
            try {
                console.log("resending unsent move messages ", this.msgMovesAfterReconnect);
                if (this.msgMovesAfterReconnect) {
                    this.doSend(this.msgMovesAfterReconnect);
                }
            } catch (e) {
                console.log("could not even REsend unsent messages ", this.msgMovesAfterReconnect)
            }
            this.clocks[0].connecting = false;
            this.clocks[1].connecting = false;
            this.clocksB[0].connecting = false;
            this.clocksB[1].connecting = false;
        };

        const onReconnect = () => {
            const container = document.getElementById('player1a') as HTMLElement;
            patch(container, h('i-side.online#player1a', {class: {"icon": true, "icon-online": false, "icon-offline": true}}));
        };

        const onClose = () => {
            this.clocks[0].connecting = true;
            this.clocks[1].connecting = true;
            this.clocksB[0].connecting = true;
            this.clocksB[1].connecting = true;
        };

        this.sock = createWebsocket('wsr/' + this.gameId, onOpen, onReconnect, onClose, (e: MessageEvent) => this.onMessage(e));

//
        this.finishedGame = this.status >= 0;
        this.tv = model["tv"];
        this.profileid = model["profileid"];
        this.level = model["level"];

        this.settings = true;
        this.blindfold = localStorage.blindfold === undefined ? false : localStorage.blindfold === "true";
        this.autoPromote = localStorage.autoPromote === undefined ? false : localStorage.autoPromote === "true";

        this.clockOn = true;//(Number(parts[parts.length - 1]) >= 2);

        this.steps = [];
        this.ply = isNaN(model["ply"]) ? 0 : model["ply"];

        // initialize users
        this.wplayer = model["wplayer"];
        this.bplayer = model["bplayer"];

        this.wtitle = model["wtitle"];
        this.btitle = model["btitle"];
        this.wrating = model["wrating"];
        this.brating = model["brating"];

        this.wplayerB = model.wplayerB;
        this.bplayerB = model.bplayerB;

        this.wtitleB = model.wtitleB;
        this.btitleB = model.btitleB;
        this.wratingB = model.wratingB;
        this.bratingB = model.bratingB;
//
        if (this.wplayer === this.username) this.myColor.set('a', 'white');
        if (this.bplayer === this.username) this.myColor.set('a', 'black');
        if (this.wplayerB === this.username) this.myColor.set('b', 'white');
        if (this.bplayerB === this.username) this.myColor.set('b', 'black');
//
        if (this.wplayer === this.username) this.partnerColor.set('b', 'black');
        if (this.bplayer === this.username) this.partnerColor.set('b', 'white');
        if (this.wplayerB === this.username) this.partnerColor.set('a', 'black');
        if (this.bplayerB === this.username) this.partnerColor.set('a', 'white');
//
        this.spectator = this.username !== this.wplayer && this.username !== this.bplayer && this.username !== this.wplayerB && this.username !== this.bplayerB;
// this represents only the initial positioning of players on the screen. Flip/switch will not change those values
// but only work on html elements, so these remain constant as initialized here throughout the whole game:
        if (this.spectator) {
// board A - 0 means top, 1 means bottom
            this.colors = [ 'black', 'white' ];
// board B - 0 means top, 1 means bottom
            this.colorsB = [ 'white', 'black' ];
        } else {
// board A - 0 means top, 1 means bottom
            this.colors = [
                this.myColor.get('a') === 'black' || this.partnerColor.get('a') === 'black' ? 'white' : 'black',
                this.myColor.get('a') === 'white' || this.partnerColor.get('a') === 'white' ? 'white' : 'black'
            ];
// board B - 0 means top, 1 means bottom
            this.colorsB = [
                this.myColor.get('b') === 'black' || this.partnerColor.get('b') === 'black' ? 'white' : 'black',
                this.myColor.get('b') === 'white' || this.partnerColor.get('b') === 'white' ? 'white' : 'black'
            ];
        }
//
// board A - 0 means top, 1 means bottom
        this.players = [
            this.colors[0] === 'white' ? this.wplayer : this.bplayer,
            this.colors[1] === 'white' ? this.wplayer : this.bplayer
        ];
// board B - 0 means top, 1 means bottom
        this.playersB = [
            this.colorsB[0] === 'white' ? this.wplayerB : this.bplayerB,
            this.colorsB[1] === 'white' ? this.wplayerB : this.bplayerB
        ];
//

        const ratings = new Map<string, string>([[this.wplayer, this.wrating], [this.bplayer, this.brating], [this.wplayerB, this.wratingB], [this.bplayerB, this.bratingB]]);
        const titles = new Map<string, string>([[this.wplayer, this.wtitle], [this.bplayer, this.btitle], [this.wplayerB, this.wtitleB], [this.bplayerB, this.btitleB]]);
        const player0a = document.getElementById('rplayer0a') as HTMLElement;
        const player1a = document.getElementById('rplayer1a') as HTMLElement;
        this.vplayerA0 = patch(player0a, player('player0a', titles.get(this.players[0])!, this.players[0], ratings.get(this.players[0])!, this.level));
        this.vplayerA1 = patch(player1a, player('player1a', titles.get(this.players[1])!, this.players[1], ratings.get(this.players[1])!, this.level));

        const player0b = document.getElementById('rplayer0b') as HTMLElement;
        const player1b = document.getElementById('rplayer1b') as HTMLElement;
        this.vplayerB0 = patch(player0b, player('player0b', titles.get(this.playersB[0])!, this.playersB[0], ratings.get(this.playersB[0])!, this.level));
        this.vplayerB1 = patch(player1b, player('player1b', titles.get(this.playersB[1])!, this.playersB[1], ratings.get(this.playersB[1])!, this.level));

        this.clocktimes = [ this.base * 1000 * 60, this.base * 1000 * 60 ]
        this.clocktimesB = [ this.base * 1000 * 60, this.base * 1000 * 60 ]

        // initialize clocks
        // this.clocktimes = {};
        const c0a = new Clock(this.base, this.inc, 0, document.getElementById('clock0a') as HTMLElement, 'clock0a', false);
        const c1a = new Clock(this.base, this.inc, 0, document.getElementById('clock1a') as HTMLElement, 'clock1a', false);
        const c0b = new Clock(this.base, this.inc, 0, document.getElementById('clock0b') as HTMLElement, 'clock0b', false);
        const c1b = new Clock(this.base, this.inc, 0, document.getElementById('clock1b') as HTMLElement, 'clock1b', false);
        this.clocks = [c0a, c1a];
        this.clocksB = [c0b, c1b];

        this.clocks[0].onTick(this.clocks[0].renderTime);
        this.clocks[1].onTick(this.clocks[1].renderTime);

        this.clocksB[0].onTick(this.clocksB[0].renderTime);
        this.clocksB[1].onTick(this.clocksB[1].renderTime);

        const flagCallbackA = () => {
            if ( this.myColor.get('a') === this.b1.turnColor ) {
                this.b1.chessground.stop();
                this.b2.chessground.stop();
                // console.log("Flag");
                this.doSend({ type: "flag", gameId: this.gameId });
            }
        }
        const flagCallbackB = () => {
            if ( this.myColor.get('b') === this.b2.turnColor ) {
                this.b1.chessground.stop();
                this.b2.chessground.stop();
                // console.log("Flag");
                this.doSend({ type: "flag", gameId: this.gameId });
            }
        }

        if (!this.spectator) {
            this.clocks[0].onFlag(flagCallbackA);
            this.clocks[1].onFlag(flagCallbackA);
            this.clocksB[0].onFlag(flagCallbackB);
            this.clocksB[1].onFlag(flagCallbackB);
        }

        const container = document.getElementById('game-controls') as HTMLElement;
        if (!this.spectator) {
            let buttons = [];
            buttons.push(h('button#count', _('Count')));
            buttons.push(h('button#draw', { on: { click: () => this.draw() }, props: {title: _("Draw")} }, [h('i', '½')]));
            buttons.push(h('button#resign', { on: { click: () => this.resign() }, props: {title: _("Resign")} }, [h('i', {class: {"icon": true, "icon-flag-o": true} } ), ]));

            this.gameControls = patch(container, h('div.btn-controls', buttons));

            patch(document.getElementById('count') as HTMLElement, h('div'));

        } else {
            this.gameControls = patch(container, h('div.btn-controls'));
        }

        //////////////

        this.b1 = new GameControllerBughouse(el1, el1Pocket1, el1Pocket2, 'a', model);
        this.b2 = new GameControllerBughouse(el2, el2Pocket1, el2Pocket2, 'b', model);
        this.b1.partnerCC = this.b2;
        this.b2.partnerCC = this.b1;
        this.b1.parent = this;
        this.b2.parent = this;

        ///////
        // todo: redundant setting turnColor here. It will be overwritten a moment later in onMsgBoard which is
        //       important and more correct in case of custom fen with black to move
        this.b1.chessground.set({
            orientation: this.myColor.get('a') === 'white' || this.partnerColor.get('a') === 'white' || this.spectator? 'white': 'black',
            turnColor: 'white',
            movable: {
                free: false,
                color: this.myColor.get('a') === 'white'? 'white': this.myColor.get('a') === 'black'? 'black': undefined
            },
            autoCastle: true,
        });
        this.b2.chessground.set({
            orientation: this.myColor.get('b') === 'white' || this.partnerColor.get('b') === 'white'? 'white': 'black',
            turnColor: 'white',
            movable: {
                free: false,
                color: this.myColor.get('b') === 'white'? 'white': this.myColor.get('b') === 'black'? 'black': undefined
            },
            autoCastle: true,
        });

        ////////////
        createMovelistButtons(this);
        this.vmovelist = document.getElementById('movelist') as HTMLElement;

        this.vdialog = patch(document.getElementById('offer-dialog')!, h('div#offer-dialog', ""));

        patch(document.getElementById('bugroundchat') as HTMLElement, chatView(this, "bugroundchat"));


        /////////////////
        // const amISimuling = this.mycolor.get('a') !== undefined && this.mycolor.get('b') !== undefined;
        // const distinctOpps = new Set([this.wplayer, this.bplayer, this.wplayerB, this.bplayerB].filter((e) => e !== this.username));
        // const isOppSimuling = distinctOpps.size === 1;
        if (this.myColor.get('a') === undefined && !this.spectator) {
            // I am not playing on board A at all. Switch:
            this.switchBoards();
        }

        this.msgMovesAfterReconnect = {
            type: "reconnect",
            gameId: this.gameId,
            movesQueued: [],
        }

        Promise.all([this.b1.ffishPromise, this.b2.ffishPromise]).then(() => {
            // todo: This call or the initial board message on /wrs ws connect is redundant. However the ws message
            //       is important in case of ws reconnect so we cannot just remove it.
            //       Currently updateBothBoardsAndClocksInitial is always being called twice
            //       first here, then a moment later when the first board message is received on connect to /wsr
            //       Above happens both first when game starts and when doing refresh without any moves have been made.
            //       In case of refresh when moves have been made, then "updateBothBoardsAndClocksOnFullBoardMsg"
            //       is called twice, again first time from here redundantly.
            this.onMsgBoard(model["board"] as MsgBoard);
        });

        // todo: boardsettings code is called also in cgCrtl constructor twice already as part of initializing b1 and b2
        //       think how to avoid this
        initBoardSettings(this.b1, this.b2, model.assetURL);
    }


    flipBoards = (): void => {
        let infoWrap0 = document.getElementsByClassName('info-wrap0')[0] as HTMLElement;
        let infoWrap0bug = document.getElementsByClassName('info-wrap0 bug')[0] as HTMLElement;
        let infoWrap1 = document.getElementsByClassName('info-wrap1')[0] as HTMLElement;
        let infoWrap1bug = document.getElementsByClassName('info-wrap1 bug')[0] as HTMLElement;

        let a = infoWrap0!.style.gridArea || "clock-top";
        infoWrap0!.style.gridArea = infoWrap1!.style.gridArea || "clock-bot";
        infoWrap1!.style.gridArea = a;
        a = infoWrap0bug!.style.gridArea || "clockB-top";
        infoWrap0bug!.style.gridArea = infoWrap1bug!.style.gridArea || "clockB-bot";
        infoWrap1bug!.style.gridArea = a;

        this.b1.toggleOrientation();
        this.b2.toggleOrientation();
    }

    switchBoards = (): void => {
        switchBoards(this);

        let infoWrap0 = document.getElementsByClassName('info-wrap0')[0] as HTMLElement;
        let infoWrap0bug = document.getElementsByClassName('info-wrap0 bug')[0] as HTMLElement;
        let infoWrap1 = document.getElementsByClassName('info-wrap1')[0] as HTMLElement;
        let infoWrap1bug = document.getElementsByClassName('info-wrap1 bug')[0] as HTMLElement;

        let a = infoWrap0!.style.gridArea || "clock-top";
        infoWrap0!.style.gridArea = infoWrap0bug!.style.gridArea || "clockB-top";
        infoWrap0bug!.style.gridArea = a;
        a = infoWrap1!.style.gridArea || "clock-bot";
        infoWrap1!.style.gridArea = infoWrap1bug!.style.gridArea || "clockB-bot";
        infoWrap1bug!.style.gridArea = a;
    }

    getClock = (boardName: string, color: cg.Color) => {
        const colors = boardName === 'a'? this.colors: this.colorsB;
        const clocks = boardName === 'a'? this.clocks: this.clocksB;
        const bclock = colors[0] === "black"? 0: 1;
        const wclock = 1 - bclock

        return clocks[color === "black"? bclock: wclock];
    }

    sendMove = (b: GameControllerBughouse, move: string) => {
        console.log(b, move);
        this.clearDialog();

        //moveColor is "my color" on that board
        const moveColor = this.myColor.get(b.boardName) === "black"? "black" : "white";

        const oppclock = b.chessground.state.orientation === moveColor? 0: 1; // only makes sense when board is flipped which not supported in gameplay yet and itself only makes sense in spectators mode todo: also switching boards to be implemented
        const myclock = 1 - oppclock;

        const clocksInQuestion = (b.boardName === 'a'? this.clocks: this.clocksB);
        const clocktimesInQuestion = (b.boardName === 'a'? this.clocktimes: this.clocktimesB);

        // const movetime = (clocksInQuestion[myclock].running) ? Date.now() - clocksInQuestion[myclock].startTime : 0;
        // pause() will ALWAYS add increment, even on first move, because (for now) we dont have aborting timeout
        clocksInQuestion[myclock].pause(true);
        // console.log("sendMove(orig, dest, prom)", orig, dest, promo);

        // console.log("sendMove(move)", move);


        const increment = (this.inc > 0 /*&& this.ply >= 2*/) ? this.inc * 1000 : 0;
        const bclocktime = (moveColor === "black" && b.preaction) ? this.clocktimes[BLACK] + increment: this.getClock("a", "black").duration;
        const wclocktime = (moveColor === "white" && b.preaction) ? this.clocktimes[WHITE] + increment: this.getClock("a", "white").duration;
        const bclocktimeB = (moveColor === "black" && b.preaction) ? this.clocktimesB[BLACK] + increment: this.getClock("b", "black").duration;
        const wclocktimeB = (moveColor === "white" && b.preaction) ? this.clocktimesB[WHITE] + increment: this.getClock("b", "white").duration;

        // const movetime = b.boardName === "a"? (b.preaction) ? 0 : movetime: -1;
        // const movetimeB = b.boardName === "b"? (b.preaction) ? 0 : movetime: -1;

        const msgClocks = [ wclocktime, bclocktime ];
        const msgClocksB = [ wclocktimeB, bclocktimeB  ];

        const moveMsg = { type: "move",
                          gameId: this.gameId,
                          move: move,
                          clocks: msgClocks,
                          clocksB: msgClocksB,
                          ply: this.ply + 1,
                          board: b.boardName,
        } as MsgMove;

        this.updateLastMovesRecorded(moveMsg);

        this.doSend(moveMsg as JSONObject);

        if (b.preaction) {
            clocksInQuestion[myclock].setTime(clocktimesInQuestion[moveColor === 'white'? WHITE: BLACK] + increment);
        }
        if (this.clockOn) clocksInQuestion[oppclock].start();
    }

    private updateLastMovesRecorded = (moveMsg: MsgMove) => {
        // todo: overly complicated logic just for the sake of preserving the order of the last 2 moves for each
        //       board in case of simul mode so when re-sent after disconnect they get processed in the same order.
        //       probably can be written more elegantly and not sure whats the value in preserving the order except
        //       maybe to be consistent with recorded time of the move.
        // todo:niki: But more importantly, the fact we made 2 moves on same board should mean we don't need to re-send
        //       the move from the other board, thus no need to preserve that move, thus no need to preserve the order,
        //       but might as well just clean the list and only keep the new move. Keeping both moves for both board is
        //       needed only if they were made one after the other, because only then we are not sure if they were
        //       received.
        // todo:niki: What's more, even then we can be sure if one of them was received as long as we received
        //       confirmation that it was made so on such even we can remove it from this list. This however will not
        //       remove the need for server-side check for double processing, because a move can still have been received
        //       and processed on the server, but connection got broken after that and we never received confirmation
        if (this.msgMovesAfterReconnect.movesQueued.length == 2) {
            // only relevant for simul mode
            if (this.msgMovesAfterReconnect.movesQueued[0].board === moveMsg.board) {
                // new move is on a board, different than the previous move.
                // Previous moves to 0 to be processed first in case of resent, the new one to 1, to be processed second
                this.msgMovesAfterReconnect.movesQueued[0] = this.msgMovesAfterReconnect.movesQueued[1];
                this.msgMovesAfterReconnect.movesQueued[1] = moveMsg;
            } else {
                // new move is on the same board as the previous move.
                // Still we want to process the older move from the other board first (tbh we really dont need to process
                // it at all in this particular case probably), so board order remains the same and just this board's move gets replaced
                this.msgMovesAfterReconnect.movesQueued[1] = moveMsg;
            }
        } else if (this.msgMovesAfterReconnect.movesQueued.length == 1) {
            if (this.msgMovesAfterReconnect.movesQueued[0].board === moveMsg.board) {
                // in non-simul mode, this is the only case that is relevant after the first move
                // length always stays 1 after that and board is always the same
                // in simul mode, this case is only entered after 1st move and until a move is made on the other board
                // than the one the first move was made on. From then on length is always 2
                this.msgMovesAfterReconnect.movesQueued[0] = moveMsg;
            } else {
                // this case only ever entered once, when in simul mode, the first time the player moves on a
                // different board than the one on which their first move was made. From then on length is always 2
                this.msgMovesAfterReconnect.movesQueued[1] = moveMsg;
            }
        } else { //length == 0
            // this case only ever entered once, when first move was made.
            this.msgMovesAfterReconnect.movesQueued[0] = moveMsg;
        }
    }

    private draw = () => {
        // console.log("Draw");
        if (confirm(_('Are you sure you want to draw?'))) {
            this.doSend({ type: "draw", gameId: this.gameId });
            this.setDialog(_("Draw offer sent"));
        }
    }
    //
    private rejectDrawOffer = () => {
        this.doSend({ type: "reject_draw", gameId: this.gameId });
        this.clearDialog();
    }
    //
    private renderDrawOffer = () => {
        this.vdialog = patch(this.vdialog, h('div#offer-dialog', [
            h('div', { class: { reject: true }, on: { click: () => this.rejectDrawOffer() } }, h('i.icon.icon-abort.reject')),
            h('div.text', _("Your opponent offers a draw")),
            h('div', { class: { accept: true }, on: { click: () => this.draw() } }, h('i.icon.icon-check')),
        ]));
    }
    //
    private setDialog = (message: string) => {
        this.vdialog = patch(this.vdialog, h('div#offer-dialog', [
            h('div', { class: { reject: false } }),
            h('div.text', message),
            h('div', { class: { accept: false } }),
        ]));
    }
    //
    private clearDialog = () => {
        this.vdialog = patch(this.vdialog, h('div#offer-dialog', []));
    }

    //
    private resign = () => {
        // console.log("Resign");
        if (confirm(_('Are you sure you want to resign?'))) {
            this.doSend({ type: "resign", gameId: this.gameId });
        }
    }

    private notifyMsg = (msg: string) => {
        if (this.status >= 0) return;

        const opp_name = this.username === this.wplayer ? this.bplayer : this.wplayer;
        const logoUrl = `${this.home}/static/favicon/android-icon-192x192.png`;
        notify('pychess.org', {body: `${opp_name}\n${msg}`, icon: logoUrl});
    }

    private onMsgGameStart = (msg: MsgGameStart) => {
        // console.log("got gameStart msg:", msg);
        if (msg.gameId !== this.gameId) return;
        if (!this.spectator) {
            sound.genericNotify();
            if (!this.focus) this.notifyMsg('joined the game.');
        }
    }
    //
    private onMsgNewGame = (msg: MsgNewGame) => {
        window.location.assign(this.home + '/' + msg["gameId"]);
    }

    private onMsgViewRematch = (msg: MsgViewRematch) => {
        const btns_after = document.querySelector('.btn-controls.after') as HTMLElement;
        let rematch_button = h('button.newopp', { on: { click: () => window.location.assign(this.home + '/' + msg["gameId"]) } }, _("VIEW REMATCH"));
        let rematch_button_location = btns_after!.insertBefore(document.createElement('div'), btns_after!.firstChild);
        patch(rematch_button_location, rematch_button);
    }
    //
    private rematch = () => {
        this.doSend({ type: "rematch", gameId: this.gameId, handicap: this.handicap });
        this.setDialog(_("Rematch offer sent"));
    }
    //
    private rejectRematchOffer = () => {
        this.doSend({ type: "reject_rematch", gameId: this.gameId });
        this.clearDialog();
    }
    //
    private renderRematchOffer = () => {
        this.vdialog = patch(this.vdialog, h('div#offer-dialog', [
            h('div', { class: { reject: true }, on: { click: () => this.rejectRematchOffer() } }, h('i.icon.icon-abort.reject')),
            h('div.text', _("Your opponent offers a rematch")),
            h('div', { class: { accept: true }, on: { click: () => this.rematch() } }, h('i.icon.icon-check')),
        ]));
    }
    //
    private newOpponent = (home: string) => {
        this.doSend({"type": "leave", "gameId": this.gameId});
        window.location.assign(home);
    }
    //
    private analysis = (home: string) => {
        window.location.assign(home + '/' + this.gameId + '?ply=' + this.ply.toString());
    }

    private gameOver = () => {
        this.gameControls = patch(this.gameControls, h('div'));
        let buttons: VNode[] = [];
        if (!this.spectator) {
            buttons.push(h('button.rematch', { on: { click: () => this.rematch() } }, _("REMATCH")));
            buttons.push(h('button.newopp', { on: { click: () => this.newOpponent(this.home) } }, _("NEW OPPONENT")));
        }
        buttons.push(h('button.analysis', { on: { click: () => this.analysis(this.home) } }, _("ANALYSIS BOARD")));
        patch(this.gameControls, h('div.btn-controls.after', buttons));
    }

    private whichTeamAmI = () : '1' | '2' => {
        return this.myColor.get('a') === 'white' || this.myColor.get('b') === 'black'? '1' : '2';
    }

    private checkStatus = (msg: MsgBoard | MsgGameEnd) => {
        console.log(msg);
        if (msg.gameId !== this.gameId) return;
        if (msg.status >= 0) {
            this.status = msg.status;
            this.result = msg.result;
            this.clocks[0].pause(false);
            this.clocks[1].pause(false);
            this.clocksB[0].pause(false);
            this.clocksB[1].pause(false);
            // this.dests = new Map();

            if (this.result !== "*" && !this.spectator && !this.finishedGame) {
                sound.gameEndSoundBughouse(msg.result, this.whichTeamAmI());
            }
            this.gameOver()


            // clean up gating/promotion widget left over the ground while game ended by time out
            const container = document.getElementById('extension_choice') as HTMLElement;
            if (container instanceof Element) patch(container, h('extension'));

            if (this.tv) {
                setInterval(() => {this.doSend({ type: "updateTV", gameId: this.gameId, profileId: this.profileid });}, 2000);
            }

            this.clearDialog();
        }
    }

    private onMsgUpdateTV = (msg: MsgUpdateTV) => {
        console.log(msg); // todo: tv for bug not supported
    }

    private updateSteps = (full: boolean, steps: Step[], ply: number, latestPly: boolean) => {
        if (full) { // all steps in one message
            this.steps = [];
            const container = document.getElementById('movelist') as HTMLElement;
            patch(container, h('div#movelist'));

            steps.forEach((step) => {
                this.steps.push(step);
                });
            updateMovelist(this, true, true, false);
        } else { // single step message
            if (ply === this.steps.length) {
                this.steps.push(steps[0]);
                const full = false;
                const activate = !this.spectator || latestPly;
                const result = false;
                updateMovelist(this, full, activate, result);
                if (this.steps.length === 4) {
                    chatMessage("", "Chat visible only to your partner", "bugroundchat");
                }
            }
        }
    }

    private updateBoardsAndClocksSpectors = (board: GameControllerBughouse, fen: cg.FEN, fenPartner: cg.FEN, lastMove: cg.Orig[] | undefined, step: Step, clocks: Clocks, latestPly: boolean, colors: cg.Color[], status: number, check: boolean) => {
        console.log("updateBoardsAndClocksSpectors", board, fen, fenPartner, lastMove, step, clocks, latestPly, colors, status, check);

        this.clockOn = true;// Number(msg.ply) >= 2;
        if ( !this.spectator && this.clockOn ) {
            const container = document.getElementById('abort') as HTMLElement;
            if (container) patch(container, h('div'));
        }

        const msgTurnColor = step.turnColor; // whose turn it is after this move

        // todo: same clock logic also in updateSingleBoardAndClocks - move to reusable method.
        // important we update only the board where the single move happened, the other clock values do not include the
        // time passed since last move on that board, but contain what is last recorded on the server for that board,
        // while the clock values for this move contain what the user making the moves has in their browser, which we
        // consider most accurate
        if (board.boardName == 'a') {
            this.clocktimes = clocks;
        } else {
            this.clocktimesB = clocks;
        }

        // resetting clocks on the client that has just sent them seems like a bad idea
        const startClockAtIdx = colors[0] === msgTurnColor? 0: 1;
        const stopClockAtIdx = 1 - startClockAtIdx;

        const whiteClockAtIdx = colors[0] === 'white'? 0: 1;
        const blackClockAtIdx = 1 -whiteClockAtIdx;

        const clocks1 = board.boardName === 'a'? this.clocks: this.clocksB;
        const clocktimes = board.boardName === 'a'? this.clocktimes: this.clocktimesB;


        clocks1[stopClockAtIdx].pause(false);

        clocks1[whiteClockAtIdx].setTime(clocktimes[WHITE]);
        clocks1[blackClockAtIdx].setTime(clocktimes[BLACK]);

        if (this.clockOn && status < 0) {
            clocks1[startClockAtIdx].start();
        }

        //when message is for opp's move, meaning turnColor is my color - it is now my turn after this message
        if (latestPly) {
            //todo: similar lines below for setting boards state repeat a lot, maybe make a method
            board.chessground.set({
                fen: fen,
                turnColor: board.turnColor,
                check: check,
                lastMove: lastMove,
            });
            board.fullfen = fen;
            board.partnerCC.fullfen = fenPartner;
            board.partnerCC.chessground.set({ fen: fenPartner});
            if (!this.focus) this.notifyMsg(`Played ${step.san}\nYour turn.`);
        }

    }

    private updateBothBoardsAndClocksInitial = (fenA: cg.FEN, fenB: cg.FEN, clocksA: Clocks, clocksB: Clocks) => {
        console.log("updateBothBoardsAndClocksInitial", fenA, fenB, clocksA, clocksB);

        const partsA = fenA.split(" ");
        const partsB = fenB.split(" ");

        this.b1.turnColor = partsA[1] === "w" ? "white" : "black";
        this.b2.turnColor = partsB[1] === "w" ? "white" : "black";

        this.b1.chessground.set({
            fen: fenA,
            turnColor: this.b1.turnColor,
            //  check: msg.check,
            //lastMove: lastMove,
        });
        this.b2.chessground.set({
            fen: fenB,
            turnColor: this.b2.turnColor,
            // check: msg.check,
            //lastMove: lastMove,
        });

        this.clocks[0].pause(false);
        this.clocks[1].pause(false);
        this.clocksB[0].pause(false);
        this.clocksB[1].pause(false);

        this.clocktimes = clocksA;
        this.clocktimesB = clocksB;

        const whiteAClockAtIdx = this.colors[0] === 'white'? 0: 1;
        const blackAClockAtIdx = 1 -whiteAClockAtIdx;
        const whiteBClockAtIdx = this.colorsB[0] === 'white'? 0: 1;
        const blackBClockAtIdx = 1 -whiteBClockAtIdx;

        this.clocks[whiteAClockAtIdx].setTime(this.clocktimes[WHITE]);
        this.clocks[blackAClockAtIdx].setTime(this.clocktimes[BLACK]);
        this.clocksB[whiteBClockAtIdx].setTime(this.clocktimesB[WHITE]);
        this.clocksB[blackBClockAtIdx].setTime(this.clocktimesB[BLACK]);

        if (this.status < 0) {
            const clockOnTurnAidx = this.colors[0] === this.b1.turnColor ? 0 : 1;
            const clockOnTurnBidx = this.colorsB[0] === this.b2.turnColor ? 0 : 1;
            this.clocks[clockOnTurnAidx].start(this.clocktimes[this.b1.turnColor === 'white'? WHITE: BLACK]);
            this.clocksB[clockOnTurnBidx].start(this.clocktimesB[this.b2.turnColor === 'white'? WHITE: BLACK]);
        }

    }

    private updateBothBoardsAndClocksOnFullBoardMsg = (lastStepA: Step, lastStepB: Step, clocksA: Clocks, clocksB: Clocks) => {
        console.log("updateBothBoardsAndClocksOnFullBoardMsg", lastStepA, lastStepB, clocksA, clocksB);
        if (lastStepA) {
            const partsA = lastStepA.fen.split(" ");
            this.b1.turnColor = partsA[1] === "b" ? "black" : "white";
            const lastMoveA = uci2LastMove(lastStepA.move);
            if (this.b1.ffishBoard) {
                this.b1.ffishBoard.setFen(lastStepA.fen);
                this.b1.setDests();
            }
            this.b1.chessground.set({
                fen: lastStepA.fen,
                turnColor: this.b1.turnColor,
                check: this.b1.ffishBoard.isCheck(),
                lastMove: lastMoveA,
            });
        }
        if (lastStepB) {
            const partsB = lastStepB.fenB!.split(" ");
            this.b2.turnColor = partsB[1] === "b" ? "black" : "white";
            const lastMoveB = uci2LastMove(lastStepB.moveB);
            if (this.b2.ffishBoard) {
                this.b2.ffishBoard.setFen(lastStepB.fenB!);
                this.b2.setDests();
            }
            this.b2.chessground.set({
                fen: lastStepB.fenB,
                turnColor: this.b2.turnColor,
                check: this.b2.ffishBoard.isCheck(),
                lastMove: lastMoveB,
            });
        }

        // todo: mostly duplicates same code in updateBothBoardsAndClocksInitial - consider doing some reusable method
        this.clocks[0].pause(false);
        this.clocks[1].pause(false);
        this.clocksB[0].pause(false);
        this.clocksB[1].pause(false);

        this.clocktimes = clocksA;
        this.clocktimesB = clocksB;

        const whiteAClockAtIdx = this.colors[0] === 'white'? 0: 1;
        const blackAClockAtIdx = 1 - whiteAClockAtIdx;
        const whiteBClockAtIdx = this.colorsB[0] === 'white'? 0: 1;
        const blackBClockAtIdx = 1 - whiteBClockAtIdx;


        if (this.status < 0) {
            this.clocks[whiteAClockAtIdx].setTime(this.clocktimes[WHITE]);
            this.clocks[blackAClockAtIdx].setTime(this.clocktimes[BLACK]);
            this.clocksB[whiteBClockAtIdx].setTime(this.clocktimesB[WHITE]);
            this.clocksB[blackBClockAtIdx].setTime(this.clocktimesB[BLACK]);

            const clockOnTurnAidx = this.colors[0] === this.b1.turnColor ? 0 : 1;
            const clockOnTurnBidx = this.colorsB[0] === this.b2.turnColor ? 0 : 1;
            this.clocks[clockOnTurnAidx].start(this.clocktimes[this.b1.turnColor === 'white'? WHITE: BLACK]);
            this.clocksB[clockOnTurnBidx].start(this.clocktimesB[this.b2.turnColor === 'white'? WHITE: BLACK]);
        } else {
            if (lastStepA) {
                this.clocks[whiteAClockAtIdx].setTime(lastStepA.clocks![WHITE]);
                this.clocks[blackAClockAtIdx].setTime(lastStepA.clocks![BLACK]);
            }
            if (lastStepB) {
                this.clocksB[whiteBClockAtIdx].setTime(lastStepB.clocksB![WHITE]);
                this.clocksB[blackBClockAtIdx].setTime(lastStepB.clocksB![BLACK]);
            }
        }

        // prevent sending premove/predrop when (auto)reconnecting websocked asks server to (re)sends the same board to us
        // console.log("trying to play premove....");
        if (this.b1.premove && this.b1.turnColor == this.myColor.get('a')) this.b1.performPremove();
        if (this.b2.premove && this.b2.turnColor == this.myColor.get('b')) this.b2.performPremove();
    }

    private updateSingleBoardAndClocks = (board: GameControllerBughouse, fen: cg.FEN, fenPartner: cg.FEN, lastMove: cg.Orig[] | undefined, step: Step,
                                          msgClocks: Clocks, latestPly: boolean, colors: cg.Color[], status: number, check: boolean) => {
        console.log("updateSingleBoardAndClocks", board, fen, fenPartner, lastMove, step, msgClocks, latestPly, colors, status, check);

        this.clockOn = true;// Number(msg.ply) >= 2;

        const msgTurnColor = step.turnColor; // whose turn it is after this move
        const msgMoveColor = msgTurnColor === 'white'? 'black': 'white'; // which color made the move
        const myMove = this.myColor.get(board.boardName) === msgMoveColor; // the received move was made by me

        // important we update only the board where the single move happened, the other clock values do not include the
        // time passed since last move on that board, but contain what is last recorded on the server for that board,
        // while the clock values for this move contain what the user making the moves has in their browser, which we
        // consider most accurate
        if (board.boardName == 'a') {
            this.clocktimes = msgClocks;
        } else {
            this.clocktimesB = msgClocks;
        }

        const capture = !!lastMove && ((board.chessground.state.boardState.pieces.get(lastMove[1] as cg.Key) && step.san?.slice(0, 2) !== 'O-') || (step.san?.slice(1, 2) === 'x'));
        if (lastMove && (!myMove || this.spectator)) {
            if (!this.finishedGame) sound.moveSound(VARIANTS['bughouse'], capture);
        }
        if (!this.spectator && check && !this.finishedGame) {
            sound.check();
        }

        if (!myMove) {
            // resetting clocks on the client that has just sent them seems like a bad idea
            const startClockAtIdx = colors[0] === msgTurnColor? 0: 1;
            const stopClockAtIdx = 1 - startClockAtIdx;

            const whiteClockAtIdx = colors[0] === 'white'? 0: 1;
            const blackClockAtIdx = 1 -whiteClockAtIdx;

            const clocks = board.boardName === 'a'? this.clocks: this.clocksB;
            const clocktimes = board.boardName === 'a'? this.clocktimes: this.clocktimesB;


            clocks[stopClockAtIdx].pause(false);

            clocks[whiteClockAtIdx].setTime(clocktimes[WHITE]);
            clocks[blackClockAtIdx].setTime(clocktimes[BLACK]);

            if (this.clockOn && status < 0) {
                clocks[startClockAtIdx].start();
            }

            //when message is for opp's move, meaning turnColor is my color - it is now my turn after this message
            if (latestPly) {
                board.setState(fen, board.turnColor === 'white' ? 'black' : 'white', lastMove);
                board.renderState();

                // because pocket might have changed. todo: condition it on if(capture) maybe
                board.partnerCC.setState(fenPartner, board.partnerCC.turnColor, board.partnerCC.lastmove);
                board.partnerCC.renderState();

                if (!this.focus) this.notifyMsg(`Played ${step.san}\nYour turn.`);

                if (board.premove) board.performPremove();
            }
        } else {
            //when message is about the move i just made
            board.setState(fen, board.turnColor === 'white' ? 'black': 'white', lastMove);
            board.renderState();

            // because pocket might have changed. todo: condition it on if(capture) maybe
            board.partnerCC.setState(fenPartner, board.partnerCC.turnColor, board.partnerCC.lastmove);
            board.partnerCC.renderState();
        }

    }

    private onMsgBoard = (msg: MsgBoard) => {
        console.log(msg);
        if (msg.gameId !== this.gameId) return;
        // if (msg.ply <= this.ply) return;// ideally not needed but putting it for now to handle a serverside bug that sends board messages twice sometimes

        // console.log("got board msg:", msg);
        let latestPly;
        const full = msg.steps.length > 1;
        const isInitialBoardMessage = !(msg.steps[msg.steps.length-1].boardName);
        if (this.spectator) {
            // Fix https://github.com/gbtami/pychess-variants/issues/687
            latestPly = (this.ply === -1 || msg.ply === this.ply + 1);
        } else {
            latestPly = (this.ply === -1 || msg.ply === this.ply + 1 || (full && msg.ply > this.ply + 1));
            // when receiving a board msg with full list of moves (aka steps) after reconnecting
            // its ply might be ahead with 2 ply - our move that failed to get confirmed
            // because of disconnect and then also opp's reply to it, that we didn't
            // receive while offline. Not sure if it could be ahead with more than 2 ply
            // todo:this if for spectators probably not needed if that check for full is added -
            //  fix that in other controller as well
        }
        if (latestPly) this.ply = msg.ply;

        this.result = msg.result;
        this.status = msg.status;

        this.updateSteps(full, msg.steps, msg.ply, latestPly);

        this.checkStatus(msg);

        //
        const fens = msg.fen.split(" | ");
        const fenA = fens[0];
        const fenB = fens[1];

        const boardName = msg.steps[msg.steps.length - 1].boardName as 'a' | 'b';
        const board = boardName === 'a' ? this.b1 : this.b2;
        const colors = boardName === 'a' ? this.colors : this.colorsB;

        const fen = boardName == 'a' ? fenA : fenB;
        const fenPartner = boardName == 'a' ? fenB : fenA;

        const check = boardName == 'a' ? msg.check : msg.checkB!;
        const clocks = boardName == 'a' ? msg.clocks : msg.clocksB!;
        const lastMove = uci2LastMove(msg.lastMove);

        if (this.spectator) {
            this.updateBoardsAndClocksSpectors(board, fen, fenPartner, lastMove, msg.steps[0], clocks!, latestPly, colors, msg.status, check);//todo:niki unclear what is different that when playing, but should have full mode as well. generally should test specator mode at least a little bit
        } else {
            if (isInitialBoardMessage) { // from constructor
                this.updateBothBoardsAndClocksInitial(fenA, fenB, msg.clocks!, msg.clocksB!);
            } else if (full) { // manual refresh or reconnect after lost ws connection
                const lastStepA = msg.steps[msg.steps.findLastIndex(s => s.boardName === "a")];
                const lastStepB = msg.steps[msg.steps.findLastIndex(s => s.boardName === "b")];
                this.updateBothBoardsAndClocksOnFullBoardMsg(lastStepA, lastStepB, msg.clocks!, msg.clocksB!);
            } else { // usual single ply board messages sent on each move
                this.updateSingleBoardAndClocks(board, fen, fenPartner, lastMove, msg.steps[0], clocks!, latestPly, colors, msg.status, check);
            }
        }
    }

    doSend = (message: JSONObject) => {
        console.log("---> doSend():", message);
        this.sock.send(JSON.stringify(message));
    }


    goPly = (ply: number) => {
        console.log("RoundControllerBughouse.goPly"+ply);

        const step = this.steps[ply];
        console.log(step);

        const board=step.boardName==='a'?this.b1:this.b2;

        const fen=step.boardName==='a'?step.fen: step.fenB;
        const fenPartner=step.boardName==='b'?step.fen: step.fenB;

        const move = step.boardName==='a'?uci2LastMove(step.move):uci2LastMove(step.moveB);
        const movePartner = step.boardName==='b'?uci2LastMove(step.move):uci2LastMove(step.moveB);

        let capture = false;
        if (move) {
            // 960 king takes rook castling is not capture
            // TODO defer this logic to ffish.js
            capture = (board.chessground.state.boardState.pieces.get(move[1] as cg.Key) !== undefined && step.san?.slice(0, 2) !== 'O-') || (step.san?.slice(1, 2) === 'x');
        }

        board.partnerCC.fullfen = fenPartner!;
        board.partnerCC.ffishBoard.setFen(board.partnerCC.fullfen);
        board.partnerCC.chessground.set({
            fen: fenPartner,
            lastMove: movePartner,
            check: board.partnerCC.ffishBoard.isCheck(),
            turnColor: getTurnColor(board.partnerCC.fullfen),
        });

        board.fullfen = fen!;
        board.turnColor = getTurnColor(board.fullfen);
        if (board.ffishBoard !== null) {
            board.ffishBoard.setFen(board.fullfen);
            board.setDests();
        }

        board.chessground.set({
            fen: fen,
            turnColor: step.turnColor,
            check: board.ffishBoard.isCheck(),
            lastMove: move,
        });

        if (this.status >= 0) {
            //if it is a game that ended, then when scrolling it makes sense to show clocks when the move was made

            const whiteAClockAtIdx = this.colors[0] === 'white'? 0: 1;
            const blackAClockAtIdx = 1 - whiteAClockAtIdx;
            const whiteBClockAtIdx = this.colorsB[0] === 'white'? 0: 1;
            const blackBClockAtIdx = 1 - whiteBClockAtIdx;

            const lastStepA = this.steps[this.steps.findLastIndex((s, i) => s.boardName === "a" && i <= ply)];
            const lastStepB = this.steps[this.steps.findLastIndex((s, i) => s.boardName === "b" && i <= ply)];
            if (lastStepA) {
                this.clocks[whiteAClockAtIdx].setTime(lastStepA.clocks![WHITE]);
                this.clocks[blackAClockAtIdx].setTime(lastStepA.clocks![BLACK]);
            } else {
                this.clocks[whiteAClockAtIdx].setTime(this.base * 60 * 1000);
                this.clocks[blackAClockAtIdx].setTime(this.base * 60 * 1000);
            }
            if (lastStepB) {
                this.clocksB[whiteBClockAtIdx].setTime(lastStepB.clocks![WHITE]);
                this.clocksB[blackBClockAtIdx].setTime(lastStepB.clocks![BLACK]);
            } else {
                this.clocksB[whiteBClockAtIdx].setTime(this.base * 60 * 1000);
                this.clocksB[blackBClockAtIdx].setTime(this.base * 60 * 1000);
            }
        }

        if (ply === this.ply + 1) { // no sound if we are scrolling backwards
            sound.moveSound(board.variant, capture);
        }
        this.ply = ply;
    }

    private onMsgUserConnected = (msg: MsgUserConnected) => {
        console.log(msg);
        // todo: no need for additional roundtrips for all these - should just get this info initially on connect
        this.username = msg["username"];
        if (this.spectator) {
            this.doSend({ type: "is_user_present", username: this.wplayer, gameId: this.gameId });
            this.doSend({ type: "is_user_present", username: this.bplayer, gameId: this.gameId });
            this.doSend({ type: "is_user_present", username: this.wplayerB, gameId: this.gameId });
            this.doSend({ type: "is_user_present", username: this.bplayerB, gameId: this.gameId });
        } else {
            this.firstmovetime = msg.firstmovetime || this.firstmovetime;
            this.doSend({ type: "is_user_present", username: this.wplayer, gameId: this.gameId });
            this.doSend({ type: "is_user_present", username: this.bplayer, gameId: this.gameId });
            this.doSend({ type: "is_user_present", username: this.wplayerB, gameId: this.gameId });
            this.doSend({ type: "is_user_present", username: this.bplayerB, gameId: this.gameId });

            const container = document.getElementById('player1a') as HTMLElement;
            patch(container, h('i-side.online#player1a', {class: {"icon": true, "icon-online": true, "icon-offline": false}}));

            // prevent sending gameStart message when user just reconecting
            if (msg.ply === 0) {
                this.doSend({ type: "ready", gameId: this.gameId });
            }
        }
        // We always need this to get possible moves made while our websocket connection was established
        // fixes https://github.com/gbtami/pychess-variants/issues/962
        this.doSend({ type: "board", gameId: this.gameId });
    }

    private onMsgUserPresent = (msg: MsgUserPresent) => {
        console.log(msg);
        if (msg.username === this.players[0]) {
            const container = document.getElementById('player0a') as HTMLElement;
            patch(container, h('i-side.online#player0a', {class: {"icon": true, "icon-online": true, "icon-offline": false}}));
        }
        if (msg.username === this.players[1]) {
            const container = document.getElementById('player1a') as HTMLElement;
            patch(container, h('i-side.online#player1a', {class: {"icon": true, "icon-online": true, "icon-offline": false}}));
        }
        if (msg.username === this.playersB[0]) {
            const container = document.getElementById('player0b') as HTMLElement;
            patch(container, h('i-side.online#player0b', {class: {"icon": true, "icon-online": true, "icon-offline": false}}));
        }
        if (msg.username === this.playersB[1]) {
            const container = document.getElementById('player1b') as HTMLElement;
            patch(container, h('i-side.online#player1b', {class: {"icon": true, "icon-online": true, "icon-offline": false}}));
        }
    }

    private onMsgUserDisconnected = (msg: MsgUserDisconnected) => {
        console.log(msg);
        if (msg.username === this.players[0]) {
            const container = document.getElementById('player0a') as HTMLElement;
            patch(container, h('i-side.online#player0a', {class: {"icon": true, "icon-online": false, "icon-offline": true}}));
        } else if (msg.username === this.players[1]) {
            const container = document.getElementById('player1a') as HTMLElement;
            patch(container, h('i-side.online#player1a', {class: {"icon": true, "icon-online": false, "icon-offline": true}}));
        }
        if (msg.username === this.playersB[0]) {
            const container = document.getElementById('player0b') as HTMLElement;
            patch(container, h('i-side.online#player0b', {class: {"icon": true, "icon-online": false, "icon-offline": true}}));
        } else if (msg.username === this.playersB[1]) {
            const container = document.getElementById('player1b') as HTMLElement;
            patch(container, h('i-side.online#player1b', {class: {"icon": true, "icon-online": false, "icon-offline": true}}));
        }
    }

    private onMsgDrawOffer = (msg: MsgDrawOffer) => {
        chatMessage("", msg.message, "bugroundchat");
        if (!this.spectator && msg.username !== this.username) this.renderDrawOffer();
    }

    private onMsgDrawRejected = (msg: MsgDrawRejected) => {
        chatMessage("", msg.message, "bugroundchat");
        // this.clearDialog();
    }

    private onMsgRematchOffer = (msg: MsgRematchOffer) => {
        chatMessage("", msg.message, "bugroundchat");
        if (!this.spectator && msg.username !== this.username) this.renderRematchOffer();
    }

    private onMsgRematchRejected = (msg: MsgRematchRejected) => {
        chatMessage("", msg.message, "bugroundchat");
        // this.clearDialog();
    }

    private onMsgFullChat = (msg: MsgFullChat) => {
        // To prevent multiplication of messages we have to remove old messages div first
        patch(document.getElementById('messages') as HTMLElement, h('div#messages-clear'));
        // then create a new one
        patch(document.getElementById('messages-clear') as HTMLElement, h('div#messages'));
        if (this.ply > 4) {
            chatMessage("", "Chat visible only to your partner", "bugroundchat");
        } else {
            chatMessage("", "Messages visible to all 4 players for the first 4 moves", "bugroundchat");
        }
        msg.lines.forEach((line) => {
            if ((this.spectator && line.room === 'spectator') || (!this.spectator && line.room !== 'spectator') || line.user.length === 0) {
                chatMessage(line.user, line.message, "bugroundchat", line.time);
            }
        });
    }

    private onMsgChat = (msg: MsgChat) => {
        if (this.spectator /*spectators always see everything*/ || (!this.spectator && msg.room !== 'spectator') || msg.user.length === 0) {
            chatMessage(msg.user, msg.message, "bugroundchat", msg.time);
        }
    }

    protected onMessage(evt: MessageEvent) {
        console.log("<+++ onMessage():", evt.data);
        // super.onMessage(evt);
        if (evt.data === '/n') return;
        const msg = JSON.parse(evt.data);
        switch (msg.type) {
            // copy pated from gameCtl.ts->onMessage, which is otherwise inherited in normal roundCtrl
            case "spectators":
                // this.onMsgSpectators(msg);
                break;
            case "bugroundchat":
                this.onMsgChat(msg);
                break;
            case "fullchat":
                this.onMsgFullChat(msg);
                break;
            case "game_not_found":
                // this.onMsgGameNotFound(msg);
                break
            case "shutdown":
                // this.onMsgShutdown(msg);
                break;
            case "logout":
                // this.doSend({type: "logout"});
                break;
            // ~copy pated from gameCtl.ts->onMessage, which is otherwise inherited in normal roundCtrl
            case "board":
                this.onMsgBoard(msg);
                break;
            case "gameEnd":
                this.checkStatus(msg);
                break;
            case "gameStart":
                this.onMsgGameStart(msg);
                break;
            case "game_user_connected":
                this.onMsgUserConnected(msg);
                break;
            case "user_present":
                this.onMsgUserPresent(msg);
                break;
            case "user_disconnected":
                this.onMsgUserDisconnected(msg);
                break;
            case "new_game":
                this.onMsgNewGame(msg);
                break;
            case "view_rematch":
                this.onMsgViewRematch(msg);
                break;
            case "draw_offer":
                this.onMsgDrawOffer(msg);
                break;
            case "draw_rejected":
                this.onMsgDrawRejected(msg);
                break;
            case "rematch_offer":
                this.onMsgRematchOffer(msg);
                break;
            case "rematch_rejected":
                this.onMsgRematchRejected(msg);
                break;
            case "updateTV":
                this.onMsgUpdateTV(msg);
                break
            case "setup":
                // this.onMsgSetup(msg);
                break;
            case "berserk":
                // this.onMsgBerserk(msg);
                break;
        }
    }
}

export function swap(nodeA: HTMLElement, nodeB: HTMLElement) {
        const parentA = nodeA.parentNode;
        const siblingA = nodeA.nextSibling === nodeB ? nodeA : nodeA.nextSibling;

        // Move `nodeA` to before the `nodeB`
        nodeB.parentNode!.insertBefore(nodeA, nodeB);

        // Move `nodeB` to before the sibling of `nodeA`
        parentA!.insertBefore(nodeB, siblingA);
};

export function switchBoards(ctrl: RoundControllerBughouse| AnalysisControllerBughouse) {
            // todo: not sure if best implementation below
        //       it manipulates the DOM directly switching places of elements identified by whether they are
        //       main/second board, instead of keeping info about the switch and rendering boards on elements
        //       called left/right
        let mainboardVNode = document.getElementById('mainboard');
        let mainboardPocket0 = document.getElementById('pocket00');
        let mainboardPocket1 = document.getElementById('pocket01');

        let bugboardVNode = document.getElementById('bugboard');
        let bugboardPocket0 = document.getElementById('pocket10');
        let bugboardPocket1 = document.getElementById('pocket11');

        let a = mainboardVNode!.style.gridArea || "board";
        mainboardVNode!.style.gridArea = bugboardVNode!.style.gridArea || "boardPartner";
        bugboardVNode!.style.gridArea = a;

        swap(mainboardPocket0!, bugboardPocket0!);
        swap(mainboardPocket1!, bugboardPocket1!);

        ctrl.b1.chessground.redrawAll();
        ctrl.b2.chessground.redrawAll();
}

export function initBoardSettings(b1: ChessgroundController, b2: ChessgroundController, assetURL: string) {
    boardSettings.ctrl = b1;
    boardSettings.ctrl2 = b2;
    boardSettings.assetURL = assetURL;

    const boardFamily = this.variant.boardFamily;
    const pieceFamily = this.variant.pieceFamily;

    boardSettings.updateBoardStyle(boardFamily);
    boardSettings.updatePieceStyle(pieceFamily);
    boardSettings.updateZoom(boardFamily);
    boardSettings.updateBlindfold();
}