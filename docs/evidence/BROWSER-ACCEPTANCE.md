# QuoteLens browser acceptance — 21 October 2026

Synthetic QA performed by the root agent through CUA against the local build and the deployed public product. The independent reviewer inspected the retained mobile screenshot and local receipt artifact, and recorded root's public-browser observations below. These are product checks, not customer use, adoption, commercial savings or hiring outcomes.

## Public v1 release

- [Open QuoteLens](https://quotelens-huy.hokhachuy1234.chatgpt.site)
- Hosted source commit: `63605dd21e569a9bb66baed7f677f4a2fc87950c`.
- Root verified fresh no-cookie HTTP 200 responses for the app, [guide](https://quotelens-huy.hokhachuy1234.chatgpt.site/guide.html) and [case study](https://quotelens-huy.hokhachuy1234.chatgpt.site/case-study.html).
- In the actual public app, imported the user's synthetic revision-8 workspace backup, approved revision 8 at **USD 66.00**, and downloaded its approved decision CSV. The downloaded CSV was checked for Beta **25.00**, Delta **41.00** and the saved reviewer note.

This commit identifies the hosted v1 runtime. Later proof/documentation commits may advance the repository HEAD without identifying a different deployed runtime.

## Observed task

- Created two arbitrary request items in the UI and imported eight offers with custom CSV-column mapping.
- Inspected stock/expiry/lead blocks and the original physical CSV row reference.
- Selected Beta (USD 25.00) and Delta (USD 41.00), totaling **USD 66.00**.
- Saved a reviewer note through **Save note**, then approved revision 6 and downloaded the actual receipt JSON.
- Edited clamp quantity 23 → 24 (revision 7) → 23 (revision 8), then reloaded. Approval stayed invalidated, while the one historical receipt and saved note remained.
- Exported a workspace backup, imported it, confirmed the same-ID replacement, and saw a successful restore. A backup containing a forbidden __proto__ key was rejected without changing the current workspace.
- Checked a 390-pixel mobile viewport: document `scrollWidth = 390`, viewport `innerWidth = 390`. Viewport was reset afterward.

## Retained evidence

- [Desktop decision view](desktop-decision.jpg)
- [Mobile decision view](mobile-decision.jpg)
- [Downloaded synthetic browser receipt](synthetic-browser-receipt.json)
- [Public deployed decision view](live-decision.jpg)

The receipt records revision 6, USD 66.00, Beta and Delta, and the note “Meets the seven-day limit; lowest eligible whole-pack cost.” It preserves the reviewed input snapshot. It is a local review record, not a signed purchase order or authenticated external approval.

Core and source checks are separate: 23 domain tests passed, independent novel-input arithmetic matched USD 66.00, and actual UI-handler checks covered stale approval, edit/revert invalidation, restore collisions, hostile backups, formula-safe exports and visible storage failure. Those harnesses do not replace real browser boundaries.

Browser hostile-title/request HTML remained literal with zero injected onerror/onload handlers. A downloaded offer template prefixed a formula-leading item label with an apostrophe. Public app and guide/case-study responses, public approval and an actual public CSV download are now verified as recorded above. The measured mobile viewport is not complete accessibility or device coverage.
