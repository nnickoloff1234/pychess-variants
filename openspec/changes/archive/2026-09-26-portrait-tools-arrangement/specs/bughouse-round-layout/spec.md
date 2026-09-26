## ADDED Requirements

### Requirement: A tolerated accessibility deviation SHALL be recorded, not just accepted

Where the layout knowingly falls short of an accessibility guideline, the shortfall SHALL be
written down in three places: in the stylesheet beside the rule that causes it, in the spec as a
named deviation, and in whatever automated survey can see it. A deviation that is only accepted in
conversation is indistinguishable a month later from one nobody noticed.

Each record SHALL carry the guideline, the measured value, the reason the trade was made, and what
it would cost to undo. **The purpose is a reviewable list**: these are expected to be revisited
together in a single accessibility pass rather than argued one at a time, and that pass needs to be
able to find them all without re-measuring the product.

A deviation SHALL NOT be recorded as a defect in a change's task list, because a task implies
someone owes the work. This is a decision, and the decision is to tolerate it for now.

#### Scenario: A rule is written that breaks a guideline

- **WHEN** a layout rule knowingly takes a value below an accessibility minimum
- **THEN** the guideline, the measured value and the cost of compliance are stated beside the rule
- **AND** the deviation appears in the spec as a named, tolerated deviation

#### Scenario: The accessibility pass comes round

- **WHEN** the deviations are reviewed as a group
- **THEN** every one of them is findable from the spec without re-surveying the product

#### Scenario: A deviation stops being true

- **WHEN** a later change removes the cause
- **THEN** the record is removed with it, so the list never overstates what is outstanding

### Requirement: TOLERATED — the portrait chat entry is under the 24px target minimum

In portrait, the chat entry SHALL be drawn without the vertical padding and top rule it carries in
the other modes, and the first preset panel SHALL sit flush against it. The entry is therefore
about **15.3px tall against WCAG 2.5.8's 24px** for a pointer target (Level AA), and because the
preset buttons abut it, the spacing exception does not apply either.

**This is deliberate and is tolerated for now.** Portrait's whole chat is about 50px; the padding
and rule are a fifth of it, and on the smallest phone still in use those pixels buy the difference
between a partner's message clipping mid-sentence and being readable. Measured at 375x667: the
message area goes from 25.3px to 39.9px, 1.6 lines to 2.5.

**What it would cost to comply:** a `min-height: 24px` on the entry returns 8.7px to the entry and
takes them from the message area — 39.9px back down to 31.2px, 2.5 lines to 1.9. That is more than
half the gain.

**The sharper risk is not the dimension.** A 240px-wide strip is easy to hit at any height; what the
missing separation invites is a tap landing on the first preset row instead, and a preset tap sends
a message to the partner immediately. A few pixels of separation addresses that for a third of the
cost of the floor, and is the first thing to try whenever this is revisited.

The other modes keep the padding and the rule. This deviation is portrait's alone.

#### Scenario: Portrait draws the chat entry

- **WHEN** the round page is shown in portrait
- **THEN** the entry has no vertical padding and no top rule, and its height is below 24px

#### Scenario: Any other mode draws the chat entry

- **WHEN** the round page is shown in either landscape mode
- **THEN** the entry keeps its padding and rule and is at or above the 24px minimum

#### Scenario: The survey reports it

- **WHEN** the layout matrix walks a portrait row with the chat tab open
- **THEN** the entry is listed among the undersized tap targets, so the deviation stays visible
