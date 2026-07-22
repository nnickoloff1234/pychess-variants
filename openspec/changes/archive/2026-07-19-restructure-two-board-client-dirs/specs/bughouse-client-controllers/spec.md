# bughouse-client-controllers — delta for restructure-two-board-client-dirs

## MODIFIED Requirements

### Requirement: Shared bughouse controller base class
The bughouse client SHALL provide a single abstract base controller (`TwoBoardController` in `client/two-board/twoBoardCtrl.ts`) that owns two-board state and logic common to live play and analysis: `boardA`/`boardB` construction and cross-wiring, shared model fields (`gameId`, `username`, `variant`, `base`, `inc`, `status`, `result`, `home`), `steps` with `ply`/`plyA`/`plyB` bookkeeping, capture detection for a step, and movelist button setup. `RoundControllerBughouse` and `AnalysisControllerBughouse` SHALL extend this base and contain only round-specific (socket, clocks, offers, chat) or analysis-specific (engine, analysis tree, PGN) logic respectively.

#### Scenario: Step ply bookkeeping is defined once
- **WHEN** either controller ingests steps (round `updateSteps` full/single paths, analysis `onMsgBoard`)
- **THEN** the plyA/plyB counting and per-step stamping is performed by the single shared base implementation, and both controllers produce step lists identical to pre-refactor behavior

#### Scenario: Board wiring is defined once
- **WHEN** a bughouse round page or analysis page constructs its controller
- **THEN** both boards are created and cross-wired (`partnerCC`, `parent`) by the base constructor, and each board's `parent` is typed as the base class

### Requirement: No circular imports among bughouse controller modules
The module dependency graph of `client/two-board/` controller files SHALL be acyclic: `round/roundCtrl.ts` and `analysis/analysisCtrl.ts` MUST NOT import each other, directly or transitively through `common/gameCtrl.ts`. Shared free functions (`swap`, `switchBoards`, `initBoardSettings`) SHALL live in the shared base module `client/two-board/twoBoardCtrl.ts` and accept the base controller type.

#### Scenario: Switching boards from either page
- **WHEN** `switchBoards` is invoked from a round controller or an analysis controller
- **THEN** the same shared implementation swaps the board DOM/grid areas and redraws both chessgrounds, with no import of the round module by the analysis module or vice versa

### Requirement: Consumers type against the base class
Modules that operate on "either bughouse controller" (`common/movelist.ts`, `common/gameCtrl.ts`) SHALL use the base class type instead of the union `AnalysisControllerBughouse | RoundControllerBughouse` wherever only shared members are accessed. Narrowing to a concrete subclass SHALL only occur where subclass-only members (e.g. `playersState`, analysis tree accessors) are genuinely needed.

#### Scenario: Movelist renders for both controllers
- **WHEN** `updateMovelist`/`selectMove`/`createMovelistButtons` are called with either controller
- **THEN** they compile against the base type and render output identical to pre-refactor behavior for both the round and analysis pages
