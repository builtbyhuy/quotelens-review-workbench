# Cosmos purchasing-ledger redesign — browser checks

21 October 2026. Internal Codex checks of the current redesign; not a customer study, human usability acceptance or a complete accessibility certification. Existing core/store modules and stored workspace schema are unchanged.

## Render and interaction

- Actual desktop and 390 px-wide browser renders inspected. Main home, working request/offers/decision/history, create/source dialogs, guide and case study retain the paper/serif/mono/ruled-grid identity. Mobile document width and scroll width were both 390 px; source dialog was 352 px. Native tables can scroll inside their own wrapper.
- A separate Codex agent independently inspected the two products and identified a 1 px vertical tab scrollbar; it was corrected while preserving horizontal tab scrolling.
- Explicit navigation from a bottom action now focuses and immediately reveals the workspace heading. This does not change note persistence or cause animation delays.
- Current feedback follows navigation, selection totals and source dialogs; reduced-motion CSS disables short effects. No ambient glass scene is loaded.

## Synthetic end-to-end input

Created two arbitrary request items: 37 retaining rings and 11 seals, EUR, review date 2026-10-21, max lead 7 days. Imported the six-row [CSV](cosmos-functional-offers.csv) through the visible chooser and column mapper. A unit-cheap bulk offer cost 122.00 for the whole purchase; another cost 53.00. An expired 0.37 offer was blocked; missing lead time could not satisfy the request deadline and stayed blocked, with missing terms visible.

Selected Orbit Supply 53.00 and Documented Seals 7.95; UI total and the actual exported [receipt](cosmos-functional-receipt.json) both equal EUR 60.95. Source inspection showed original CSV physical row 3 and original field values. The saved synthetic reason survived receipt export and reload.

Revision 7 was approved. Changing ring quantity 37→38 created revision 8 with status Ready for review, even though whole-pack total stayed the same. Approved exports became disabled, the saved note survived reload, and history retained revision 7/EUR 60.95 as Historical. No order, supplier message or payment was sent.

## Evidence and checks

- [Current first-visit desktop](cosmos-desktop.jpg), [mobile](cosmos-mobile.jpg), [working decision](cosmos-working-desktop.png), [mobile source dialog](cosmos-source-mobile.png). Captures are unaltered running local previews of the released source; all verification data are fictional.
- Existing 23 core and 4 persistence checks passed; persistence 4 passed again after navigation change. No new duplicate unit suite was added for styling.
- Earlier redesign-* and motion files are historical captures of the superseded glass presentation. Their evidence and license notices are retained.
