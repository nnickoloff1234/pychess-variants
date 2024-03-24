import { h, VNode } from 'snabbdom';

import * as cg from 'chessgroundx/types';
import * as util from 'chessgroundx/util';
import { DrawShape } from 'chessgroundx/draw';

import { _ } from '../i18n';
import { uci2LastMove, uci2cg } from '../chess';
import { VARIANTS, notation, moddedVariant } from "../variants"
import { createMovelistButtons, updateMovelist, selectMove, activatePlyVari } from './movelist.bug';
import { povChances } from '../winningChances';
import { patch } from '../document';
import { Chart } from "highcharts";
import { PyChessModel } from "../types";
import { Ceval, MsgBoard, Step } from "../messages";
import { GameControllerBughouse } from "./gameCtrl.bug";
import { sound } from "../sound";
import { renderClocks } from "./analysisClock.bug";
import { variantsIni } from "../variantsIni";
import * as idb from "idb-keyval";
import { MsgAnalysis, MsgAnalysisBoard } from "../analysisType";
import ffishModule from "ffish-es6";
import { titleCase } from "@/analysisCtrl";
import { movetimeChart } from "./movetimeChart.bug";
import {switchBoards} from "@/bug/roundCtrl.bug";

const EVAL_REGEX = new RegExp(''
  + /^info depth (\d+) seldepth \d+ multipv (\d+) /.source
  + /score (cp|mate) ([-\d]+) /.source
  + /(?:(upper|lower)bound )?nodes (\d+) nps \S+ /.source
  + /(?:hashfull \d+ )?(?:tbhits \d+ )?time (\S+) /.source
  + /pv (.+)/.source);

const maxDepth = 18;
const maxThreads = Math.max((navigator.hardwareConcurrency || 1) - 1, 1);

const emptySan = '\xa0';

export default class AnalysisControllerBughouse {
    model;
    // sock;

    b1: GameControllerBughouse;
    b2: GameControllerBughouse;

    wplayer: string;
    bplayer: string;
    base: number;
    inc: number;
    gameId: string;
    vpgn: VNode;
    vscore: VNode | HTMLElement;
    vscorePartner: VNode | HTMLElement;
    vinfo: VNode | HTMLElement;
    vpvlines: VNode[] | HTMLElement[];

    readonly variant = VARIANTS['bughouse'];

    vmovelist: VNode | HTMLElement;
    moveControls: VNode;
    lastmove: cg.Key[];
    premove: {orig: cg.Key, dest: cg.Key, metadata?: cg.SetPremoveMetadata} | null;
    result: string;
    flip: boolean;
    settings: boolean;
    status: number;
    steps: Step[];
    pgn: string;
    ply: number;
    plyVari: number;
    plyInsideVari: number;
    animation: boolean;
    showDests: boolean;
    analysisChart: Chart;
    ctableContainer: VNode | HTMLElement;
    localEngine: boolean;

    maxDepth: number;
    isAnalysisBoard: boolean;
    isEngineReady: boolean;
    notation: cg.Notation;

    ffish: any;
    ffishBoard: any;
    notationAsObject: any;

    movetimeChart: Chart;
    chartFunctions: any[];

    arrow: boolean;

    multipv: number;
    evalFile: string;
    nnueOk: boolean;

    importedBy: string;

    embed: boolean;

    fsfDebug: boolean;
    fsfError: string[];
    fsfEngineBoard: any;  // used to convert pv UCI move list to SAN

    username: string;

    notation2ffishjs = (n: cg.Notation) => {
        switch (n) {
            case cg.Notation.ALGEBRAIC: return this.ffish.Notation.SAN;
            case cg.Notation.SHOGI_ARBNUM: return this.ffish.Notation.SHOGI_HODGES_NUMBER;
            case cg.Notation.JANGGI: return this.ffish.Notation.JANGGI;
            case cg.Notation.XIANGQI_ARBNUM: return this.ffish.Notation.XIANGQI_WXF;
            default: return this.ffish.Notation.SAN;
        }
    }

    constructor(el1: HTMLElement,el1Pocket1: HTMLElement,el1Pocket2: HTMLElement,el2: HTMLElement,el2Pocket1: HTMLElement,el2Pocket2: HTMLElement, model: PyChessModel) {

        this.fsfDebug = true;
        this.fsfError = [];
        this.embed = this.gameId === undefined;
        this.username = model["username"];

        this.b1 = new GameControllerBughouse(el1, el1Pocket1, el1Pocket2, 'a', model);
        this.b2 = new GameControllerBughouse(el2, el2Pocket1, el2Pocket2, 'b', model);
        this.b2.chessground.set({orientation:"black"});
        this.b1.partnerCC = this.b2;
        this.b2.partnerCC = this.b1;
        this.b1.parent = this;
        this.b2.parent = this;

        const parts = this.b1.fullfen.split(" ");
        ffishModule().then((loadedModule: any) => {
            this.ffish = loadedModule;
            this.ffish.loadVariantConfig(variantsIni);
            this.notationAsObject = this.notation2ffishjs(this.notation);
            this.ffishBoard = new this.ffish.Board(
                moddedVariant(this.variant.name, false/*this.chess960*/, this.b1.chessground.state.boardState.pieces, parts[2]),
                this.b1.fullfen,
                false/*this.chess960*/);
            window.addEventListener('beforeunload', () => this.ffishBoard.delete());
        });

        this.isAnalysisBoard = model["gameId"] === "";
        this.chartFunctions = [movetimeChart];

        // is local stockfish.wasm engine supports current variant?
        this.localEngine = false;

        // UCI isready/readyok
        this.isEngineReady = false;

        this.maxDepth = maxDepth;

        // current interactive analysis variation ply
        this.plyVari = 0;
        this.plyInsideVari = -1

        this.model = model;
        this.gameId = model["gameId"] as string;

        this.wplayer = model["wplayer"] as string;
        this.bplayer = model["bplayer"] as string;
        this.base = model["base"];
        this.inc = model["inc"] as number;
        this.status = model["status"] as number;
        this.steps = [];
        this.pgn = "";
        this.ply = isNaN(model["ply"]) ? 0 : model["ply"];

        this.flip = false;
        this.settings = true;
        this.animation = localStorage.animation === undefined ? true : localStorage.animation === "true";
        this.showDests = localStorage.showDests === undefined ? true : localStorage.showDests === "true";
        this.arrow = localStorage.arrow === undefined ? true : localStorage.arrow === "true";

        this.multipv = localStorage.multipv === undefined ? 1 : Math.max(1, Math.min(5, parseInt(localStorage.multipv)));
        const variant = VARIANTS[model.variant];
        this.evalFile = localStorage[`${variant.name}-nnue`] === undefined ? '' : localStorage[`${variant.name}-nnue`];
        this.nnueOk = false;

        this.importedBy = '';

        this.notation = notation(this.b1.variant);

        const fens = model.fen.split(" | ");

        this.steps.push({
            'fen': fens[0],
            'fenB': fens[1],
            'move': undefined,
            'check': false,//not relevant/meaningful - we use the fens for that
            'turnColor': this.b1.turnColor,//not relevant/meaningful - we use the fens for that
            });

        if (!this.isAnalysisBoard && !this.model["embed"]) {
            this.ctableContainer = document.getElementById('ctable-container') as HTMLElement;
        }


        createMovelistButtons(this);
        this.vmovelist = document.getElementById('movelist') as HTMLElement;

        if (!this.model["embed"]) {
            patch(document.getElementById('input') as HTMLElement, h('input#input', this.renderInput(this.b1)));
            patch(document.getElementById('inputPartner') as HTMLElement, h('input#inputPartner', this.renderInput(this.b2)));

            this.vscore = document.getElementById('score') as HTMLElement;
            this.vscorePartner = document.getElementById('scorePartner') as HTMLElement;
            this.vinfo = document.getElementById('info') as HTMLElement;
            this.vpvlines = [...Array(5).fill(null).map((_, i) => document.querySelector(`.pvbox :nth-child(${i + 1})`) as HTMLElement)];

            const pgn = (this.isAnalysisBoard) ? this.getPgn() : this.pgn;
            this.renderFENAndPGN(pgn);

            if (this.isAnalysisBoard) {
                (document.querySelector('[role="tablist"]') as HTMLElement).style.display = 'none';
                (document.querySelector('[tabindex="0"]') as HTMLElement).style.display = 'flex';
            }
        }

        // Add a click event handler to each tab
        const tabs = document.querySelectorAll('[role="tab"]');
        tabs!.forEach(tab => {
            tab.addEventListener('click', changeTabs);
        });
        function changeTabs(e: Event) {
            const target = e.target as Element;
            const parent = target!.parentNode;
            const grandparent = parent!.parentNode;

            // Remove all current selected tabs
            parent!.querySelectorAll('[aria-selected="true"]').forEach(t => t.setAttribute('aria-selected', 'false'));

            // Set this tab as selected
            target.setAttribute('aria-selected', 'true');

            // Hide all tab panels
            grandparent!.querySelectorAll('[role="tabpanel"]').forEach(p => (p as HTMLElement).style.display = 'none');

            // Show the selected panel
            (grandparent!.parentNode!.querySelector(`#${target.getAttribute('aria-controls')}`)! as HTMLElement).style.display = 'flex';
        }
        (document.querySelector('[tabindex="0"]') as HTMLElement).style.display = 'flex';
        // const menuEl = document.getElementById('bars') as HTMLElement;
        // menuEl.style.display = 'block';
``
        //
        this.onMsgBoard(model["board"] as MsgBoard);
    }

    nnueIni() {
        if (this.b1.localAnalysis && this.nnueOk) {
            this.engineStop();
            this.engineGo(this.b1);
        } else if (this.b2.localAnalysis && this.nnueOk) {
            this.engineStop();
            this.engineGo(this.b2);
        }
    }

    pvboxIni() {
        if (this.b1.localAnalysis || this.b2.localAnalysis) this.engineStop();
        this.clearPvlines();
        if (this.b1.localAnalysis) {
            this.engineGo(this.b1);
        } else if (this.b2.localAnalysis) {
            this.engineGo(this.b2);
        }
    }

    pvView(i: number, pv: VNode | undefined) {
        if (this.vpvlines === undefined) this.pvboxIni();
        this.vpvlines[i] = patch(this.vpvlines[i], h(`div#pv${i + 1}.pv`, pv));
    }

    clearPvlines() {
        for (let i = 4; i >= 0; i--) {
            if (i + 1 <= this.multipv && (this.b1.localAnalysis || this.b2.localAnalysis)) {
                this.vpvlines[i] = patch(this.vpvlines[i], h(`div#pv${i + 1}.pv`, [h('pvline', h('pvline', '-'))]));
            } else {
                this.vpvlines[i] = patch(this.vpvlines[i], h(`div#pv${i + 1}`));
            }
        }
    }

    flipBoards = (): void => {
        this.b1.toggleOrientation();
        this.b2.toggleOrientation();
    }

    switchBoards = (): void => {
        switchBoards(this);
    }

    private renderInput = (cc: GameControllerBughouse) => {
        return {
            attrs: {
                disabled: !this.localEngine,
            },
            on: {change: () => {
                cc.localAnalysis = !cc.localAnalysis;
                if (cc.localAnalysis) {
                    cc.partnerCC.localAnalysis = false;
                    const partnerCheckboxId = cc.partnerCC.boardName == 'a'? 'input': 'inputPartner';
                    (document.getElementById(partnerCheckboxId) as HTMLInputElement).checked = false;

                    this.vinfo = patch(this.vinfo, h('info#info', '-'));
                    this.pvboxIni();
                } else {
                    this.engineStop();
                    this.pvboxIni();
                }
            }}
        };
    }

    private drawAnalysisChart = (withRequest: boolean) => {
        console.log("drawAnalysisChart "+withRequest)
    }

    private checkStatus = (msg: MsgAnalysisBoard | MsgBoard) => {
        if ((msg.gameId !== this.gameId && !this.isAnalysisBoard) || this.model["embed"]) return;

        // but on analysis page we always present pgn move list leading to current shown position!
        // const pgn = (this.isAnalysisBoard) ? this.getPgn() : this.pgn;
        const pgn =/* (this.isAnalysisBoard) ?*/ this.getPgn() /*: this.pgn*/;
        this.renderFENAndPGN( pgn );

        if (!this.isAnalysisBoard) selectMove(this, this.ply);
    }

    private renderFENAndPGN(pgn: string) {
        let container = document.getElementById('copyfen') as HTMLElement;
        if (container !== null) {
            const buttons = [
                h('a.i-pgn', { on: { click: () => console.log("downloadPgnText(\"pychess-variants_\" + this.gameId) not implemented") } }, [
                    h('i', {props: {title: _('Download game to PGN file')}, class: {"icon": true, "icon-download": true} }, _('Download PGN'))]),
                h('a.i-pgn', { on: { click: () => console.log("copyTextToClipboard(this.uci_usi) not implemented") } }, [
                    h('i', {props: {title: _('Copy USI/UCI to clipboard')}, class: {"icon": true, "icon-clipboard": true} }, _('Copy UCI/USI'))]),
                h('a.i-pgn', { on: { click: () => console.log("copyBoardToPNG not implemented") } }, [
                    h('i', {props: {title: _('Download position to PNG image file')}, class: {"icon": true, "icon-download": true} }, _('PNG image'))]),
                ]

            patch(container, h('div', buttons));
        }

        const e = document.getElementById('fullfen') as HTMLInputElement;
        e.value = this.b1.fullfen + " | " + this.b2.fullfen;

        container = document.getElementById('pgntext') as HTMLElement;
        this.vpgn = patch(container, h('div#pgntext', pgn));
    }

    private onMsgBoard = (msg: MsgBoard) => {
        if (msg.gameId !== this.gameId) return;

        this.importedBy = msg.by;

        // console.log("got board msg:", msg);
        this.ply = msg.ply
        // this.fullfen = msg.fen;
        // this.dests = new Map(Object.entries(msg.dests)) as cg.Dests;
        // list of legal promotion moves
        // this.promotions = msg.promo;

        // const parts = msg.fen.split(" ");
        // this.turnColor = parts[1] === "w" ? "white" : "black";

        this.result = msg.result;
        this.status = msg.status;

        if (msg.steps.length > 1) {
            this.steps = [];

            msg.steps.forEach((step, ply) => {
                if (step.analysis !== undefined) {
                    step.ceval = step.analysis;
                    const scoreStr = this.buildScoreStr(ply % 2 === 0 ? "w" : "b", step.analysis);
                    step.scoreStr = scoreStr;
                }
                this.steps.push(step);
                });
            updateMovelist(this);

            if (this.steps[0].analysis !== undefined) {
                this.vinfo = patch(this.vinfo, h('info#info', '-'));
                this.drawAnalysisChart(false);
            }

            patch(document.getElementById('anal-clock-top') as HTMLElement, h('div.anal-clock.top'));
            patch(document.getElementById('anal-clock-bottom') as HTMLElement, h('div.anal-clock.bottom'));
            patch(document.getElementById('anal-clock-top-bug') as HTMLElement, h('div.anal-clock.top.bug'));
            patch(document.getElementById('anal-clock-bottom-bug') as HTMLElement, h('div.anal-clock.bottom.bug'));
            renderClocks(this);

            const cmt = document.getElementById('chart-movetime') as HTMLElement;
            if (cmt) cmt.style.display = 'block';
            movetimeChart(this);

        } else {/*
            if (msg.ply === this.steps.length) {
                const step: Step = {
                    'fen': msg.fen,
                    'move': msg.lastMove,
                    'check': msg.check,
                    'turnColor': this.turnColor,
                    'san': msg.steps[0].san,
                    };
                this.steps.push(step);
                updateMovelist(this);
            }*/
        }

        // const lastMove = uci2LastMove(msg.lastMove);
        // const step = this.steps[this.steps.length - 1];
        // const capture = (lastMove.length > 0) && ((this.chessground.state.pieces.get(lastMove[1]) && step.san?.slice(0, 2) !== 'O-') || (step.san?.slice(1, 2) === 'x'));
        //
        // if (lastMove.length > 0 && (this.turnColor === this.mycolor || this.spectator)) {
        //     sound.moveSound(this.variant, capture);
        // }
        this.checkStatus(msg);

        // if (this.spectator) {
        //     this.chessground.set({
        //         fen: this.fullfen,
        //         turnColor: this.turnColor,
        //         check: msg.check,
        //         lastMove: lastMove,
        //     });
        // }
        if (this.model["ply"] > 0) {
            this.ply = this.model["ply"]
            selectMove(this, this.ply);
        }
    }

    moveIndex = (ply: number) => {
      return Math.floor((ply - 1) / 2) + 1 + (ply % 2 === 1 ? '.' : '...');
    }

    fsfPostMessage(msg: string) {
        if (this.fsfDebug) console.debug('<---', msg);
        window.fsf.postMessage(msg);
    }

    onFSFline = (line: string) => {
        if (this.fsfDebug) console.debug('--->', line);

        if (line.startsWith('info')) {
            const error = 'info string ERROR: ';
            if (line.startsWith(error)) {
                this.fsfError.push(line.slice(error.length));
                if (line.includes('terminated')) {
                    const suggestion = _('Try browser page reload.');
                    this.fsfError.push('');
                    this.fsfError.push(suggestion);
                    const errorMsg = this.fsfError.join('\n');
                    alert(errorMsg);
                    return;
                }
            }
        }

        if (line.includes('readyok')) this.isEngineReady = true;

        if (line.startsWith('Fairy-Stockfish')) {
            window.prompt = function() {
                return variantsIni + '\nEOF';
            }
            this.fsfPostMessage('load <<EOF');
        }

        if (!this.localEngine) {
            this.localEngine = true;
            patch(document.getElementById('input') as HTMLElement, h('input#input', {attrs: {disabled: false}}));
            patch(document.getElementById('inputPartner') as HTMLElement, h('input#inputPartner', {attrs: {disabled: false}}));
            this.fsfEngineBoard = new this.ffish.Board(this.variant.name, this.b1.fullfen, false);

            if (this.evalFile) {
                idb.get(`${this.variant.name}--nnue-file`).then((nnuefile) => {
                    if (nnuefile === this.evalFile) {
                        idb.get(`${this.variant.name}--nnue-data`).then((data) => {
                            const array = new Uint8Array(data);
                            const filename = "/" + this.evalFile;
                            window.fsf.FS.writeFile(filename, array);
                            console.log('Loaded to fsf.FS:', filename);
                            this.nnueOk = true;
                            const nnueEl = document.querySelector('.nnue') as HTMLElement;
                            const title = _('Multi-threaded WebAssembly (with NNUE evaluation)');
                            patch(nnueEl, h('span.nnue', { props: {title: title } } , 'NNUE'));
                        });
                    }
                });
            }

            window.addEventListener('beforeunload', () => this.fsfEngineBoard.delete());

        }

        if (!(this.b1.localAnalysis || this.b2.localAnalysis) || !this.isEngineReady) return;

        const matches = line.match(EVAL_REGEX);
        if (!matches) {
            if (line.includes('mate 0')) this.clearPvlines();
            return;
        }

        const depth = parseInt(matches[1]),
            multiPv = parseInt(matches[2]),
            isMate = matches[3] === 'mate',
            povEv = parseInt(matches[4]),
            evalType = matches[5],
            nodes = parseInt(matches[6]),
            elapsedMs: number = parseInt(matches[7]),
            moves = matches[8];
        //console.log("---", depth, multiPv, isMate, povEv, evalType, nodes, elapsedMs, moves);

        // Sometimes we get #0. Let's just skip it.
        if (isMate && !povEv) return;

        // For now, ignore most upperbound/lowerbound messages.
        // The exception is for multiPV, sometimes non-primary PVs
        // only have an upperbound.
        // See: https://github.com/ddugovic/Stockfish/issues/228
        if (evalType && multiPv === 1) return;

        let score;
        if (isMate) {
            score = {mate: povEv};
        } else {
            score = {cp: povEv};
        }
        const knps = nodes / elapsedMs;
        const boardInAnalysis = this.b1.localAnalysis? this.b1: this.b2;
        const msg: MsgAnalysis = {type: 'local-analysis', ply: this.ply, color: boardInAnalysis.turnColor.slice(0, 1), ceval: {d: depth, multipv: multiPv, p: moves, s: score, k: knps}};
        this.onMsgAnalysis(msg, boardInAnalysis);
    };

    engineStop = () => {
        this.isEngineReady = false;
        this.fsfPostMessage('stop');
        this.fsfPostMessage('isready');
    }

    engineGo = (cc: GameControllerBughouse) => {
        if (false/*this.chess960*/) {
            this.fsfPostMessage('setoption name UCI_Chess960 value true');
        }
        if (this.variant.name !== 'chess') {
            this.fsfPostMessage('setoption name UCI_Variant value ' + /*'crazyhouse'*/this.variant.name);
        }
        if (this.evalFile === '' || !this.nnueOk) {
            this.fsfPostMessage('setoption name Use NNUE value false');
        } else {
            this.fsfPostMessage('setoption name Use NNUE value true');
            this.fsfPostMessage('setoption name EvalFile value ' + this.evalFile);
        }

        //console.log('setoption name Threads value ' + maxThreads);
        this.fsfPostMessage('setoption name Threads value ' + maxThreads);

        this.fsfPostMessage('setoption name MultiPV value ' + this.multipv);

        //console.log('position fen ', this.fullfen);
        this.fsfPostMessage('position fen ' + cc.fullfen);

        if (this.maxDepth >= 99) {
            this.fsfPostMessage('go depth 99');
        } else {
            this.fsfPostMessage('go movetime 90000 depth ' + this.maxDepth);
        }
    }

    onMoreDepth = () => {
        this.maxDepth = 99;
        this.engineStop();
        this.engineGo(this.b1);
    }

    makePvMove (pv_line: string, cc: GameControllerBughouse) {
        const move = uci2cg(pv_line.split(" ")[0]);
        this.sendMove(cc, move /*move.slice(0, 2) as cg.Orig, move.slice(2, 4) as cg.Key, move.slice(4, 5)*/);
    }

    // Updates PV, score, gauge and the best move arrow
    drawEval = (ceval: Ceval | undefined, scoreStr: string | undefined, turnColor: cg.Color, boardInAnalysis: GameControllerBughouse) => {

        const pvlineIdx = (ceval && ceval.multipv) ? ceval.multipv - 1 : 0;

        // Render PV line
        if (ceval?.p !== undefined) {
            let pvSan: string | VNode = ceval.p;
            if (this.fsfEngineBoard) {
                try {
                    this.fsfEngineBoard.setFen(boardInAnalysis.fullfen);
                    pvSan = this.fsfEngineBoard.variationSan(ceval.p, this.notationAsObject);
                    if (pvSan === '') pvSan = emptySan;
                } catch (error) {
                    pvSan = emptySan;
                }
            }
            if (pvSan !== emptySan) {
                pvSan = h('pv-san', { on: { click: () => this.makePvMove(ceval.p as string, boardInAnalysis) } } , pvSan)
                this.pvView(pvlineIdx, h('pvline', [(this.multipv > 1 && boardInAnalysis.localAnalysis) ? h('strong', scoreStr) : '', pvSan]));
            }
        } else {
            this.pvView(pvlineIdx, h('pvline', (boardInAnalysis.localAnalysis) ? h('pvline', '-') : ''));
        }

        // Render gauge, arrow and main score value for first PV line only
        if (pvlineIdx > 0) return;

        let shapes0: DrawShape[] = [];
        boardInAnalysis.chessground.setAutoShapes(shapes0);

        const gaugeEl = document.getElementById(boardInAnalysis.boardName == 'a'? 'gauge': 'gaugePartner') as HTMLElement;
        if (gaugeEl && pvlineIdx === 0) {
            const blackEl = gaugeEl.querySelector('div.black') as HTMLElement | undefined;
            if (blackEl && ceval !== undefined) {
                const score = ceval['s'];
                // TODO set gauge colour according to the variant's piece colour
                const color = (this.variant.colors.first === "Black") ? turnColor === 'black' ? 'white' : 'black' : turnColor;
                if (score !== undefined) {
                    const ev = povChances(color, score);
                    blackEl.style.height = String(100 - (ev + 1) * 50) + '%';
                }
                else {
                    blackEl.style.height = '50%';
                }
            }
        }

        if (ceval?.p !== undefined) {
            const pv_move = uci2cg(ceval.p.split(" ")[0]);
            // console.log("ARROW", this.arrow);
            if (this.arrow && pvlineIdx === 0) {
                const atPos = pv_move.indexOf('@');
                if (atPos > -1) {
                    const d = pv_move.slice(atPos + 1, atPos + 3) as cg.Key;
                    let color = turnColor;
                    const dropPieceRole = util.roleOf(pv_move.slice(0, atPos) as cg.Letter);

                    shapes0 = [{
                        orig: d,
                        brush: 'paleGreen',
                        piece: {
                            color: color,
                            role: dropPieceRole
                        }},
                        { orig: d, brush: 'paleGreen' }
                    ];
                } else {
                    const o = pv_move.slice(0, 2) as cg.Key;
                    const d = pv_move.slice(2, 4) as cg.Key;
                    shapes0 = [{ orig: o, dest: d, brush: 'paleGreen', piece: undefined },];
                }
            }

            if (boardInAnalysis.boardName == 'a'){
                this.vscore = patch(this.vscore, h('score#score', scoreStr));
            } else {
                this.vscorePartner = patch(this.vscorePartner, h('score#scorePartner', scoreStr));
            }

            const info = [h('span', _('Depth') + ' ' + String(ceval.d) + '/' + this.maxDepth)];
            if (ceval.k) {
                if (ceval.d === this.maxDepth && this.maxDepth !== 99) {
                    info.push(
                        h('a.icon.icon-plus-square', {
                            props: {type: "button", title: _("Go deeper")},
                            on: { click: () => this.onMoreDepth() }
                        })
                    );
                } else if (ceval.d !== 99) {
                    info.push(h('span', ', ' + Math.round(ceval.k) + ' knodes/s'));
                }
            }
            this.vinfo = patch(this.vinfo, h('info#info', info));
        } else {
            if (boardInAnalysis.boardName == 'a') {
                this.vscore = patch(this.vscore, h('score#score', ''));
            } else {
                this.vscorePartner = patch(this.vscorePartner, h('score#scorePartner', ''));
            }
            this.vinfo = patch(this.vinfo, h('info#info', _('in local browser')));
        }

        // console.log(shapes0);
        boardInAnalysis.chessground.set({
            drawable: {autoShapes: shapes0},
        });
    }

    // // Updates chart and score in movelist
    drawServerEval = (ply: number, scoreStr?: string) => {
        console.log("drawServerEval "+ply+" "+scoreStr);
    //     if (ply > 0) {
    //         const evalEl = document.getElementById('ply' + String(ply)) as HTMLElement;
    //         patch(evalEl, h('eval#ply' + String(ply), scoreStr));
    //     }
    //
    //     analysisChart(this);
    //     const hc = this.analysisChart;
    //     if (hc !== undefined) {
    //         const hcPt = hc.series[0].data[ply];
    //         if (hcPt !== undefined) hcPt.select();
    //     }
    }

    // When we are moving inside a variation move list
    // then plyVari > 0 and ply is the index inside vari movelist
    goPly = (ply: number, plyVari = 0) => {
        console.log(ply, plyVari);
        const vv = this.steps[plyVari]?.vari;
        const step = (plyVari > 0 && vv) ? vv[ply - plyVari] : this.steps[ply];
        if (step === undefined) return;

        console.log(step);

        const board=step.boardName==='a'?this.b1:this.b2;

        const fen=step.boardName==='a'?step.fen: step.fenB!;
        const fenPartner=step.boardName==='b'?step.fen: step.fenB!;

        const move = step.boardName==='a'?uci2LastMove(step.move):uci2LastMove(step.moveB);
        const movePartner = step.boardName==='b'?uci2LastMove(step.move):uci2LastMove(step.moveB);

        let capture = false;
        if (move) {
            // 960 king takes rook castling is not capture
            // TODO defer this logic to ffish.js
            capture = (board.chessground.state.boardState.pieces.get(move[1] as cg.Key) !== undefined && step.san?.slice(0, 2) !== 'O-') || (step.san?.slice(1, 2) === 'x');
        }


        if (ply === this.ply + 1) { // no sound if we are scrolling backwards
            sound.moveSound(board.variant, capture);
        }
        this.ply = ply;

        ////////////// above is more or less copy/pasted from gameCtrl.ts->goPLy. other places just call super.goPly

        if (this.plyVari > 0) {
            this.plyInsideVari = ply - plyVari;
        }

        if (this.b1.localAnalysis || this.b2.localAnalysis) {
            this.engineStop();
            this.clearPvlines();
            // Go back to the main line
            if (plyVari === 0) {
                const container = document.getElementById('vari') as HTMLElement;
                patch(container, h('div#vari', ''));
            }
        }

        // Go back to the main line
        if (this.plyVari > 0 && plyVari === 0) {
            this.steps[this.plyVari]['vari'] = undefined;
            this.plyVari = 0;
            updateMovelist(this);
        }
        board.turnColor = step.turnColor;//todo: probably not needed here and other places as well where its set

        board.fullfen = fen;
        if (board.ffishBoard) { //TODO:NIKI: if this ffishboard object is one and the same, maybe move it to some global place instead of associating it to board
            board.ffishBoard.setFen(board.fullfen);
            board.setDests();
        }
        board.chessground.set({
            fen: fen,
            turnColor: step.turnColor,
            movable: {
                color: step.turnColor,
                },
            check: board.ffishBoard.isCheck(),
            lastMove: move,
        });

        //todo:niki:actually try removing this below - no longer sure if needed/helping. there were other bugs to fix also and not sure which one helped and if this is needed at all
        //todo:niki:not great on first load when ffishboard not initialized yet.
        //     probably same bug exist in normal, but here in 2 board more visible because even after scroll of moves of one board, the second's dests dont get refreshed
        //     that is why i am adding this here, otherwise it shouldn't really be needed as position doesn't change, but
        //     we onle need it now because we dont know if second board ever got initialized
        //todo:niki:can we find a way to better wait for initializing of ffishboard stuff? put code like this in some lambda and pass it to some promise or something, maybe?
        board.partnerCC.fullfen = fenPartner;
        if (board.partnerCC.ffishBoard) {
            board.partnerCC.ffishBoard.setFen(board.partnerCC.fullfen);
            board.partnerCC.setDests();
        }
        const turnColorPartner = fenPartner.split(' ')[1] === "w"? "white": "black";
        board.partnerCC.chessground.set({
            fen: fenPartner,
            turnColor: turnColorPartner,
            movable: {
                color: turnColorPartner
            },
            check: board.partnerCC.ffishBoard.isCheck(),
            lastMove: movePartner,
        });
        //
        renderClocks(this);
    }

    private getPgn = (idxInVari  = 0) => {
        const moves : string[] = [];
        let moveCounter: string = '';
        let whiteMove: boolean = true;
        let blackStarts: boolean = this.steps[0].turnColor === 'black';

        let plyA: number = 0;
        let plyB: number = 0;

        for (let ply = 1; ply <= this.ply; ply++) {
            this.steps[ply].boardName === 'a'? plyA++ : plyB++;
            // we are in a variation line of the game
            if (this.steps[ply] && this.steps[ply].vari && this.plyVari > 0) {
                const variMoves = this.steps[ply].vari;
                if (variMoves) {
                    blackStarts = variMoves[0].turnColor === 'white';
                    for (let idx = 0; idx <= idxInVari; idx++) {
                        if (blackStarts && ply ===1 && idx === 0) {
                            moveCounter = '1...';
                        } else {
                            whiteMove = variMoves[idx].turnColor === 'black';
                            moveCounter = (whiteMove) ? Math.ceil((ply + idx + 1) / 2) + '.' : '';
                        }
                        moves.push(moveCounter + variMoves[idx].sanSAN);
                    };
                    break;
                }
            // we are in the main line
            } else {
                if (blackStarts && ply === 1) {
                    moveCounter = '1...';
                } else {
                    whiteMove = this.steps[ply].turnColor === 'black';
                    moveCounter = Math.floor(this.steps[ply].boardName === 'a'? (plyA + 1) / 2 : (plyB + 1) / 2 ) + this.steps[ply].boardName!.toUpperCase() + ".";
                }
                moves.push(moveCounter + this.steps[ply].san);
            }
        }
        const moveText = moves.join(' ');

        const today = new Date().toISOString().substring(0, 10).replace(/-/g, '.');

        const event = '[Event "?"]';
        const site = `[Site "${this.b1.home}/analysis/${this.variant.name}"]`;
        const date = `[Date "${today}"]`;
        const whiteA = '[WhiteA "'+this.model['wplayer']+'"]';
        const blackA = '[BlackA "'+this.model['bplayer']+'"]';
        const whiteB = '[WhiteB "'+this.model['wplayerB']+'"]';
        const blackB = '[BlackB "'+this.model['bplayerB']+'"]';
        const result = '[Result "*"]';
        const variant = `[Variant "${titleCase(this.variant.name)}"]`;
        const fen = `[FEN "${this.steps[0].fen}"]`;
        const setup = '[SetUp "1"]';

        return `${event}\n${site}\n${date}\n${whiteA}\n${blackA}\n${whiteB}\n${blackB}\n${result}\n${variant}\n${fen}\n${setup}\n\n${moveText} *\n`;
    }

    sendMove = (b: GameControllerBughouse, move: string) => {
        const san = b.ffishBoard.sanMove(move, b.notationAsObject);
        const sanSAN = b.ffishBoard.sanMove(move);
        const vv = this.steps[this.plyVari]['vari'];

        // console.log('sendMove()', move, san);
        // Instead of sending moves to the server we can get new FEN and dests from ffishjs
        b.ffishBoard.push(move);
        // b.dests = this.getDests(b);
        b.setDests();

        // We can't use ffishBoard.gamePly() to determine newply because it returns +1 more
        // when new this.ffish.Board() initial FEN moving color was "b"
        // const moves = b.ffishBoard.moveStack().split(' ');
        const newPly = this.ply + 1;

        const msg : MsgAnalysisBoard = {
            gameId: this.gameId,
            fen: b.ffishBoard.fen(this.b1.variant.ui.showPromoted, 0),
            ply: newPly,
            lastMove: move,
            bikjang: b.ffishBoard.isBikjang(),
            check: b.ffishBoard.isCheck(),
        }

        this.onMsgAnalysisBoard(b, msg);

        const step = {  //no matter on which board the ply is happening i always need both fens and moves for both boards. this way when jumping to a ply in the middle of the list i can setup both boards and highlight both last moves
            fen: b.boardName==='a'? b.ffishBoard.fen(b.variant.ui.showPromoted, 0): b.partnerCC.ffishBoard.fen(b.partnerCC.variant.ui.showPromoted, 0),
            fenB: b.boardName==='b'? b.ffishBoard.fen(b.variant.ui.showPromoted, 0): b.partnerCC.ffishBoard.fen(b.partnerCC.variant.ui.showPromoted, 0),
            'move': b.boardName==='a'? msg.lastMove: this.steps[this.steps.length-1].move,
            'moveB': b.boardName==='b'? msg.lastMove: this.steps[this.steps.length-1].moveB,
            'check': msg.check,
            'turnColor': b.turnColor,
            'san': san,
            'sanSAN': sanSAN,
            'boardName': b.boardName,
            'plyA': this.b1.ply,
            'plyB': this.b2.ply,
            };
        console.log(">>>>>>>>>>>>>>>>>>>>>")
        console.log(b.partnerCC.ffishBoard.moveStack().split(' '));
        console.log(b.ffishBoard.moveStack().split(' '));
        const ffishBoardPly = b.ffishBoard.moveStack().split(' ').length; // TODO:NIKI: check all places where ffishBoard is used and we rely its state is preserved for each board but it seems like it is not actually the case then if we are open to bugs like losing that state because move happens on partner board, then this board logic still expecting old state is here and stuff like that
        const partnerBoardHasNoMoves = b.partnerCC.ffishBoard.moveStack().split(' ')[0] === '' ;
        // const ffishPartnerBoardPly = partnerBoardHasNoMoves? 0: b.partnerCC.ffishBoard.moveStack().split(' ').length;
        const moveIdx = (this.plyVari === 0) ? this.ply : this.plyInsideVari;
        // New main line move
        if (moveIdx === this.steps.length && this.plyVari === 0) {
            this.steps.push(step);
            this.ply = moveIdx;
            updateMovelist(this);

            this.checkStatus(msg);
        // variation move
        } else {
            // possible new variation starts
            if (ffishBoardPly === 1 && partnerBoardHasNoMoves) { // TODO:NIKI: i dont understand why i have added check for partnerBoardHasNoMoves but also above see TODO about probably that state being completely lost because its the same ffishBoard object we are checking twice here for being empty (that === 1 also practiacally checks if empty or something like that)
                if (this.ply < this.steps.length && msg.lastMove === this.steps[this.ply].move) {
                    // existing main line played
                    selectMove(this, this.ply);
                    return;
                }
                // new variation starts
                if (vv === undefined) {
                    this.plyVari = this.ply;
                    this.steps[this.plyVari]['vari'] = [];
                } else {
                    // variation in the variation: drop old moves
                    if ( vv ) {
                        this.steps[this.plyVari]['vari'] = vv.slice(0, this.ply - this.plyVari);
                    }
                }
            }
            // continuing the variation
            if (this.steps[this.plyVari].vari !== undefined) {
                this.steps[this.plyVari]?.vari?.push(step);
            };

            const full = true;
            const activate = false;
            updateMovelist(this, full, activate);
            if (vv) {
                activatePlyVari(this.plyVari + vv.length - 1);
            } else if (vv === undefined && this.plyVari > 0) {
                activatePlyVari(this.plyVari);
            }
            this.checkStatus(msg);
        }

        const e = document.getElementById('fullfen') as HTMLInputElement;
        e.value = this.b1.fullfen+" "+this.b2.fullfen;

    }

    private onMsgAnalysisBoard = (b: GameControllerBughouse, msg: MsgAnalysisBoard) => {
        // console.log("got analysis_board msg:", msg);
        if (msg.gameId !== this.gameId) return;
        if (b.localAnalysis) this.engineStop();

        b.fullfen = msg.fen;
        this.ply = msg.ply

        const parts = msg.fen.split(" ");
        b.turnColor = parts[1] === "w" ? "white" : "black";

        b.chessground.set({
            fen: b.fullfen,
            turnColor: b.turnColor,
            lastMove: uci2LastMove(msg.lastMove),
            check: msg.check,
            movable: {
                color: b.turnColor,
                // dests: b.dests,
            },
        });

        if (b.localAnalysis) this.engineGo(b);
    }

    private buildScoreStr = (color: string, analysis: Ceval) => {
        const score = analysis['s'];
        let scoreStr = '';
        let ceval : number;
        if (score['mate'] !== undefined) {
            ceval = score['mate']
            const sign = ((color === 'b' && Number(ceval) > 0) || (color === 'w' && Number(ceval) < 0)) ? '-': '';
            scoreStr = '#' + sign + Math.abs(Number(ceval));
        } else if (score['cp'] !== undefined) {
            ceval = score['cp']
            let nscore = Number(ceval) / 100.0;
            if (color === 'b') nscore = -nscore;
            scoreStr = nscore.toFixed(1);
        }
        return scoreStr;
    }

    private onMsgAnalysis = (msg: MsgAnalysis, boardInAnalysis: GameControllerBughouse) => {
        // console.log(msg);
        if (msg['ceval']['s'] === undefined) return;

        const scoreStr = this.buildScoreStr(msg.color, msg.ceval);

        // Server side analysis message
        if (msg.type === 'analysis') {
            this.steps[msg.ply]['ceval'] = msg.ceval;
            this.steps[msg.ply]['scoreStr'] = scoreStr;

            if (this.steps.every((step) => {return step.scoreStr !== undefined;})) {
                const element = document.getElementById('loader-wrapper') as HTMLElement;
                element.style.display = 'none';
            }
            this.drawServerEval(msg.ply, scoreStr);
        } else {
            const turnColor = msg.color === 'w' ? 'white' : 'black';
            this.drawEval(msg.ceval, scoreStr, turnColor, boardInAnalysis);
        }
    }

}
