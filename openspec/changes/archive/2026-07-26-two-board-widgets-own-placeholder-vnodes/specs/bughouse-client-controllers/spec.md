## ADDED Requirements

### Requirement: Analysis-page widgets own their placeholder vnode instead of being found by id
Each of the five stateful two-board analysis widgets — the movelist (`MovelistView`), the engine panel (`EngineController`), the PGN panel (`PgnView`), the per-position analysis clocks, and the movetime chart (`MovetimeChartView`) — SHALL be constructed with no `ctrl` reference and no `document.*` access, building and storing its own placeholder vnode(s) purely. `client/two-board/analysis/analysis.ts` (and `client/two-board/round/round.ts` for the shared movelist) SHALL construct each widget's object during its synchronous view-building code and embed the object's placeholder vnode(s) directly in the returned tree, instead of writing a raw `h(...)` placeholder literal itself. The real controller's constructor (`AnalysisControllerBughouse`, and `TwoBoardController`/`RoundControllerBughouse` for the shared movelist) SHALL accept these pre-built objects as constructor parameters instead of instantiating them internally, and SHALL hand itself to whichever objects need `ctrl` for their first content-bearing render (or ongoing lifetime), exactly once, at the same point in construction where that widget's initial rendering already happens today.

#### Scenario: Movelist placeholder owned by MovelistView
- **WHEN** the analysis page or the round page is constructed
- **THEN** the `#movelist` element originates from `MovelistView`'s own placeholder-vnode construction, embedded by `analysis.ts`/`round.ts`, not from a raw `h('div#movelist')` literal in either view file, and the base controller receives the `MovelistView` instance as a constructor parameter

#### Scenario: Engine panel placeholders owned by EngineController, ctrl attached once
- **WHEN** the analysis page is constructed
- **THEN** `#score`/`#scorePartner`/`#info`/`#pv1`-`#pv5` originate from `EngineController`'s own constructor (no `document.getElementById`/`querySelector` lookups for them), and `EngineController.attachCtrl(ctrl)` is called exactly once, immediately after the real controller's own construction, before any other engine method runs — performing the `#input`/`#inputPartner` checkboxes' one ctrl-dependent initial render

#### Scenario: PGN panel placeholders owned by PgnView
- **WHEN** the analysis page is constructed
- **THEN** the `#copyfen` and `#pgntext` regions originate from `PgnView`'s own constructor-built placeholders, and the PGN panel's first ctrl-dependent content render happens via a `PgnView` method taking `ctrl`, called at the point `renderFENAndPGN` runs today

#### Scenario: Analysis clocks keyed by physical position, not color
- **WHEN** the analysis page is constructed and later has its boards flipped or switched
- **THEN** the clock view object's four retained placeholders are keyed by physical position (main-top, main-bottom, bug-top, bug-bottom), and color-to-position resolution continues to happen at render time exactly as before, so clock rendering after a flip/switch is unaffected by this change

#### Scenario: Movetime chart container owned by MovetimeChartView
- **WHEN** the analysis page is constructed and the movetime chart is (re)rendered
- **THEN** `Highcharts.chart(...)` is called against `MovetimeChartView`'s own retained element reference instead of the string id `'chart-movetime'`, and Highcharts' existing recreate-the-whole-chart-on-every-call behavior is unchanged

#### Scenario: Behavior is unchanged
- **WHEN** the analysis or round page is used after this change (movelist updates, engine toggling, PGN panel content, clock rendering across flip/switch, movetime chart display)
- **THEN** all rendered output and behavior is identical to before this change — this is a pure construction-time wiring change, with no change to any widget's re-render/update logic

#### Scenario: Contiguous multi-element widgets expose one composed-view method
- **WHEN** a widget's owned elements are always rendered together as one fixed-structure, contiguous block in the page view file's markup (the engine panel's checkboxes/score/info/scorePartner; the PGN panel's copyfen/pgntext pair)
- **THEN** the widget exposes a single method returning that whole composed block (`EngineController.renderPanel()`/`pvPanel()`, `PgnView.placeholders()`), and the page view file calls just that method instead of reassembling individual per-leaf placeholders; widgets whose elements are not contiguous (`AnalysisClockView`'s four clocks, interleaved with chessground board-wrapper divs it doesn't own) correctly keep separate per-element placeholder methods
