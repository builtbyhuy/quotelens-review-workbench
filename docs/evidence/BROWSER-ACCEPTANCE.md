# QuoteLens browser acceptance — 21 October 2026

Synthetic QA performed by the root agent through CUA against the local browser build. The independent reviewer inspected the retained mobile screenshot and receipt artifact. These are product checks, not customer use, adoption, commercial savings or hiring outcomes. Anonymous public deployment is not yet verified here.

## Observed task

- Created two arbitrary request items in the UI and imported eight offers with custom CSV-column mapping.
- Inspected stock/expiry/lead blocks and the original physical CSV row reference.
- Selected Beta (USD 25.00) and Delta (USD 41.00), totaling **USD 66.00**.
- Saved a reviewer note through **Save note**, then approved revision 6 and downloaded the actual receipt JSON.
- Edited clamp quantity 23 → 24 (revision 7) → 23 (revision 8), then reloaded. Approval stayed invalidated, while the one historical receipt and saved note remained.
- Checked a 390-pixel mobile viewport: document `scrollWidth = 390`, viewport `innerWidth = 390`. Viewport was reset afterward.

## Retained evidence

- [Desktop decision view](desktop-decision.jpg)
- [Mobile decision view](mobile-decision.jpg)
- [Downloaded synthetic browser receipt](synthetic-browser-receipt.json)

The receipt records revision 6, USD 66.00, Beta and Delta, and the note “Meets the seven-day limit; lowest eligible whole-pack cost.” It preserves the reviewed input snapshot. It is a local review record, not a signed purchase order or authenticated external approval.

Core and source checks are separate: 23 domain tests passed, independent novel-input arithmetic matched USD 66.00, and actual UI-handler checks covered stale approval, edit/revert invalidation, restore collisions, hostile backups, formula-safe exports and visible storage failure. Those harnesses do not replace real browser boundaries.

Public URL loading, public guide/case-study navigation, actual hostile-input DOM execution checks and browser CSV-template download inspection remain unrecorded in this note. The measured mobile viewport is not complete accessibility or device coverage.
