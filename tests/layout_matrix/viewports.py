"""The two declared lists the matrix is the product of, and the thresholds they must straddle.

CSS VIEWPORT SIZES, NOT DISPLAY RESOLUTIONS. The layout branches on the viewport; a 1080p display
gives a page about 955px tall, so a row of 1080 would test a shape nobody has. Desktop heights below
already have browser chrome deducted.

These are representative popular shapes rather than figures from this project's analytics, which do
not exist. What earns a row its place is covering a side of a threshold the stylesheet branches on —
which `assert_spans_thresholds()` checks, so the list cannot quietly drift to one side.
"""

from dataclasses import dataclass

# The page's own cut-off between portrait and landscape rules, as a ratio. Mirrored here ONLY to
# check the list straddles it: the driver asks the page's media query which mode it is in.
PORTRAIT_MAX_ASPECT = 9 / 16
# The page zooms only in tall landscape: `(aspect-ratio > 9/16) and (height >= 600px)`.
ZOOM_MIN_HEIGHT = 600


@dataclass(frozen=True)
class Viewport:
    key: str
    stands_for: str
    width: int
    height: int
    dpr: float
    kind: str  # desktop | phone | tablet

    @property
    def aspect(self) -> float:
        return self.width / self.height

    @property
    def is_portrait_mode(self) -> bool:
        """What the page's portrait media query will say. Predicted, then verified in-page."""
        return self.aspect <= PORTRAIT_MAX_ASPECT

    @property
    def zooms(self) -> bool:
        return self.aspect > PORTRAIT_MAX_ASPECT and self.height >= ZOOM_MIN_HEIGHT

    @property
    def label(self) -> str:
        return f"{self.width}x{self.height} @{self.dpr:g}"


def _rotate(v: Viewport) -> Viewport:
    return Viewport(
        key=v.key + "-landscape",
        stands_for=v.stands_for + ", rotated",
        width=v.height,
        height=v.width,
        dpr=v.dpr,
        kind=v.kind,
    )


DESKTOP = [
    Viewport("D1", "1080p desktop, the commonest of all", 1920, 955, 1, "desktop"),
    Viewport("D2", "768p laptop", 1366, 643, 1, "desktop"),
    Viewport("D3", "1080p at 125% scaling", 1536, 739, 1.25, "desktop"),
    Viewport("D4", "16:10 laptop", 1440, 775, 1, "desktop"),
    Viewport("D5", "QHD desktop", 2560, 1315, 1, "desktop"),
    Viewport("D6", '14" MacBook Pro class', 1512, 857, 2, "desktop"),
]

# Portrait is the upright orientation for both mobile classes; each is also walked rotated.
PHONE_PORTRAIT = [
    Viewport("P1", "iPhone 12-14", 390, 844, 3, "phone"),
    Viewport("P2", "iPhone 15/16", 393, 852, 3, "phone"),
    Viewport("P3", "Android baseline, 20:9", 360, 800, 3, "phone"),
    Viewport("P4", "Pixel 7/8", 412, 915, 2.625, "phone"),
    # 375/667 = 0.5622 against a cut-off of 0.5625: inside portrait by three ten-thousandths, and
    # the row that proves the cut-off is where we think it is.
    Viewport("P5", "iPhone SE 2/3, the smallest still in use", 375, 667, 2, "phone"),
    Viewport("P6", "Pro Max class", 430, 932, 3, "phone"),
]

# EVERY TABLET IN PORTRAIT IS A LANDSCAPE-RULES PAGE. Not an oversight: it follows from setting the
# portrait cut-off at 9/16 so that portrait means phones. All six are taller than they are wide and
# all six get the two-column landscape geometry, which nothing has ever looked at on purpose.
TABLET_PORTRAIT = [
    Viewport("T1", "iPad 9.7/10.2, 4:3", 768, 1024, 2, "tablet"),
    Viewport("T2", "iPad 10th", 810, 1080, 2, "tablet"),
    Viewport("T3", "iPad Air", 820, 1180, 2, "tablet"),
    Viewport("T4", "iPad Pro 11", 834, 1194, 2, "tablet"),
    Viewport("T5", "iPad Pro 12.9", 1024, 1366, 2, "tablet"),
    Viewport("T6", "Android 16:10", 800, 1280, 2, "tablet"),
]

VIEWPORTS: list[Viewport] = (
    DESKTOP
    + PHONE_PORTRAIT
    + [_rotate(v) for v in PHONE_PORTRAIT]
    + TABLET_PORTRAIT
    + [_rotate(v) for v in TABLET_PORTRAIT]
)


@dataclass(frozen=True)
class Case:
    key: str
    page: str  # round | analysis
    state: str  # live | over | analysis
    tab: str  # the tab label to select
    describes: str


CASES = [
    Case("C1", "round", "live", "Chat", "round page during a game, chat shown"),
    Case("C2", "round", "live", "Moves", "round page during a game, movelist shown"),
    Case("C3", "round", "over", "Moves", "round page after the game has ended"),
    Case("C4", "analysis", "analysis", "Moves", "analysis page, movelist shown"),
]

# Named by the two boards' zoom percentages, left then right. The asymmetric one is the reason the
# set exists: independent zoom is what makes the two squares diverge, which is what zone A is
# measured from and what the tools' cascade decides on.
ZOOMS = [(100, 100), (100, 50), (50, 50)]
BASE_ZOOM = ZOOMS[0]


def assert_spans_thresholds() -> None:
    """A list that drifts to one side of a threshold tests only the case that already worked."""
    both = lambda pred: any(pred(v) for v in VIEWPORTS) and any(not pred(v) for v in VIEWPORTS)

    assert both(lambda v: v.is_portrait_mode), "no viewport on one side of the portrait cut-off"
    assert both(lambda v: v.height >= ZOOM_MIN_HEIGHT), "no viewport on one side of the zoom floor"
    assert both(lambda v: v.zooms), "every viewport zooms, or none does"
    # The width at which the tools lose their column is not a constant this module can state — it
    # falls out of the square arithmetic — so the list is checked for spread instead: something
    # genuinely narrow, and something genuinely wide.
    assert any(v.width <= 700 for v in VIEWPORTS), "nothing narrow enough to squeeze the tools"
    assert any(v.width >= 1900 for v in VIEWPORTS), "nothing wide enough to keep the tools a column"

    keys = [v.key for v in VIEWPORTS]
    assert len(keys) == len(set(keys)), "duplicate viewport key"


def planned_rows() -> list[tuple[Viewport, Case, tuple[int, int]]]:
    """Every combination the run will visit, in no particular order — the driver orders them."""
    rows = []
    for v in VIEWPORTS:
        for c in CASES:
            for z in ZOOMS if v.zooms else [BASE_ZOOM]:
                rows.append((v, c, z))
    return rows
