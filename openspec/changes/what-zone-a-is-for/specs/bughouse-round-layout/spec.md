## ADDED Requirements

### Requirement: A zone is occupied or it is not there

Zone A SHALL NOT be admitted as a home unless what is placed there FITS IT, and SHALL NOT be left
standing empty when nothing is placed there. Which of those two the layout does in a given
arrangement is a mechanism this requirement does not fix; that a declared band is neither
overflowing nor dead is what it does fix.

ADMITTING A HOME IS A PROMISE THAT ITS OCCUPANTS FIT. Admitting zone A on a proxy for its size — "is
it at least `T` squares tall" — is not that promise, because the proxy knows nothing of how many
parts the page has: measured on the round page in short landscape at 682x503, zone A measured 173px
against a 150px threshold and qualified, then held four parts needing 186px with the chat already
squeezed to zero, and the page overflowed by 44px. The analysis page, with two parts, passed the
same test honestly. A test that one page passes and another fails, for a reason neither page states,
is not a test of the thing it names.

AN EMPTY BAND IS A DEFECT, NOT A NEUTRAL OUTCOME. Where zone A is declared, has room, and nothing is
placed in it, the layout SHALL either place something there or collapse the row: measured on the
analysis page at 629x830, `zoneA2` stood 199 x 240 and empty while the only visible tab panel sat in
zone B below both boards — a black rectangle beside a board, in space the layout created on purpose
by drawing the partner's board smaller.

THE FIT TEST SHALL NOT MAKE THE BOARDS DEPEND ON THE BOARDS. `toolsHome()` is a pure function of the
viewport, and that is what keeps a board's size from being derived from a quantity measured off the
boards. Any answer SHALL preserve that: a part COUNT is a fact about the page and may be used; a
part's measured height is not and may not.

#### Scenario: A home is not admitted unless its occupants fit
- **WHEN** zone A is chosen as the tools' home
- **THEN** every part placed there is drawn at or above its own minimum
- **AND** the page does not overflow either axis

#### Scenario: A declared band is never left dead
- **WHEN** zone A is declared in the arrangement and nothing is placed in it
- **THEN** its row takes no height

#### Scenario: The decision stays a function of the viewport
- **WHEN** the tools' home is chosen
- **THEN** no input to that choice was measured from a board or from a part
