# QuoteLens v2: a decision the reviewer can explain

Created 21 October 2026. Independent product work by Hồ Khắc Huy with AI coding assistance. All examples and verification inputs are synthetic. No customer adoption, business savings, procurement deployment or production readiness is claimed.

**Product:** [Online workbench](https://builtbyhuy.github.io/quotelens-review-workbench/)

**Guide:** [Workflow and limits](https://builtbyhuy.github.io/quotelens-review-workbench/guide.html)

**Public case study:** [Problem, decisions and evidence](https://builtbyhuy.github.io/quotelens-review-workbench/case-study.html)

## The problem and useful outcome

A quoted unit price can hide the cost of the packs actually purchased. A minimum order may increase the purchase, a delivery fee may change the lowest total, or the apparently attractive offer may be expired, unavailable or duplicated. An approval is also easy to misread when it belongs to a previous set of inputs. This product compares whole-pack goods costs plus the entered delivery fee for each offer line, before tax; it does not calculate FX or shared supplier-order freight.

QuoteLens connects a reviewer-authored request to supplier offers, exact whole-pack totals, visible exclusions and warnings, source inspection and a revision-specific review record. The useful result is a decision that can be traced to its inputs. It does not decide whether an item meets a specification or negotiate commercial terms.

## What changed from the local prototype

The legacy Python/SQLite application used a fixed synthetic four-item request. It remains in the repository as a historical local prototype with its own run instructions and tests. The current online product opens with an interactive fictional comparison and accepts arbitrary user-created request items, manual offers and mapped CSV columns. Users can start an empty comparison or open the displayed example as a new editable workspace without overwriting saved work. Its browser storage, monetary engine, schema and portable receipts are separate from the earlier server implementation.

This distinction matters: opening an example is a tour, while creating a novel request and importing a supplier-shaped file exercises the actual product boundary. Fixture totals from v1 do not certify v2.

## Product loop

1. Create a workspace with an explicit review date and one currency.
2. Create request items with exact matching IDs, whole-unit quantities and optional lead-time constraints.
3. Add offers manually or map generic CSV headers; keep original source fields and physical row references.
4. Inspect whole-pack costs, minimum orders, line delivery fees, blocked offers and missing-data warnings.
5. Select eligible offers, record a reason where useful and review the current revision.
6. Export an approved comparison, a receipt or a restorable workspace backup; return to historical decisions later.

## Engineering decisions

### Compare the actual purchase, with exact money

`packs = max(ceil(request.quantity / offer.packSize), offer.minPacks)`

`total = packs × offer.packPrice + offer.deliveryFee`

MOQ and available stock are measured in packs. The delivery fee applies once to **that offer line**; there is no supplier-order freight aggregation. Input money is a nonnegative decimal string with no more than two decimal places. `BigInt` minor-unit arithmetic avoids floating-point money calculations and retains exact totals beyond JavaScript's safe numeric cents. All supported currencies, including VND, are displayed with two decimal places by this product contract.

Negative or malformed prices, exponent notation, grouped money and excess decimals are rejected rather than coerced or rounded. Explicit zero values are allowed where the field permits them. The product supports USD, EUR, GBP and VND in separate workspaces and performs no implicit FX or tax calculation.

### Keep unknown facts distinct from a failed check

Known stock below the packs required blocks an offer. Zero stock means unavailable. Unknown stock remains an explicit warning. Unknown expiry and lead time likewise remain unverified; unknown lead time blocks a request with a maximum lead-time constraint. Valid-through dates are inclusive and compared with the user-visible review date.

Both exact and conflicting duplicate supplier/quote/item identities block every involved row. Unselected invalid offers stay visible but do not inflate the eligible selected subtotal. A complete approved total requires an eligible selection for every request item.

### Preserve source evidence through flexible import

The CSV boundary supports BOM, ordinary line endings, escaped quotes and quoted multiline fields. Users map canonical fields to their actual column names. Original decoded fields, including unmapped columns, and physical starting row numbers survive import. Manual offers preserve their entered fields with no invented CSV line.

Malformed structure, mapping or row values reject an import atomically. Missing stock, lead time and validity do not become zero. An unmapped currency uses the explicitly supplied workspace currency; a mapped blank currency is an error. The app escapes rendered strings, and CSV exports neutralize formula-leading text before quoting.

Source preservation supports inspection; it is not authentication of a supplier statement. CSV content and restored backups are user-provided material.

### Bind a local review to its inputs

A receipt contains the revision, a deterministic canonical content fingerprint, selected lines, reviewer reasons, source copies and a deep input snapshot. Request, offer, selection, note and relevant settings changes require a new review while old snapshots remain historical. The fingerprint is a **canonical content string**, not a hash, signature, identity check or cryptographic integrity guarantee.

Portable validation checks schema, bounds, IDs and references, receipts and snapshot-line reconciliation. It rejects dangerous prototype keys, exotic objects, accessors, unsafe numbers and excessive structure. This detects malformed or internally inconsistent data. A fully rewritten consistent backup is still possible; the receipt is not tamper-proof or an authenticated organizational approval.

### A small static product with explicit storage limits

The browser UI, dependency-free UMD calculation core and IndexedDB store have separate responsibilities. `core.js` neither renders nor saves nor makes network calls. `store.js` resolves writes on transaction completion, so the UI can distinguish saved data from an unsuccessful write. JSON backup is the device-transfer and recovery path; there is no cloud account or sync service.

This keeps the app accessible through static hosting without API credentials or a backend. The tradeoffs are local-only data, no multi-user authorization and no centrally managed archive. Two devices or two origins do not share a library. The app is not an ERP, supplier portal or production purchasing system.

## Verification and its limits

The current suite recorded on 21 October 2026 passes **32 checks: 23 core tests plus nine targeted UI regressions** with `node --test tests/core.test.cjs tests/ui-persistence.test.cjs`. Core checks cover the browser UMD boundary, arbitrary novel requests, MOQ and whole-pack rounding, delivery-fee ranking, exact large money, inclusive expiry/lead constraints, missing-data warnings, duplicates, identity and currency failures, generic CSV import, safe exports, immutable receipt snapshots and hostile backup rejection. The initial online release passed 27 checks, including four UI regressions for explicit Save note handling, delayed-render note preservation, serialized revision writes and warning scope for selected offers. The task-first revision retained those checks and added five UI regressions; their scope and actual browser observations are recorded in [TASK-FIRST-UI-QA.md](evidence/TASK-FIRST-UI-QA.md).

A separate Codex-agent integration review exercised actual application handlers using synthetic inputs; its harness is in the surrounding job-hunt validation workspace, not included as a repository test. It must be distinguished from the 23 executable core tests and from a complete browser acceptance pass.

An earlier online-v2 browser verification observed a novel two-item, eight-offer CSV request producing a selected total of USD 66.00. Revision 6 was approved; its exported receipt preserved the saved reviewer reason. Changing the requested quantity to 24 produced revision 7, then reverting to 23 produced revision 8. After reload, revision 8 remained unapproved and one historical receipt remained. The observed note-saving defect was repaired with explicit Save note handling and serialized writes before this check passed. These captures retain their earlier interface; current first-use observations are separately recorded in [TASK-FIRST-UI-QA.md](evidence/TASK-FIRST-UI-QA.md).

These are synthetic functional observations, not a customer saving or business acceptance. They do not prove IndexedDB behavior in every browser, complete accessibility or production readiness. Evidence: [desktop](evidence/desktop-decision.jpg), [mobile](evidence/mobile-decision.jpg), [synthetic exported browser receipt](evidence/synthetic-browser-receipt.json).

## Deliberate scope

No in-app AI, OCR, PDF extraction, currency conversion, tax calculation, supplier-order freight aggregation, supplier integration, account, authentication, cloud sync, external messaging, payment or order placement is included. AI assistance describes the development process, not the calculation method. Real supplier facts, specification fit, policy and accountable authorization remain outside this independent tool's evidence.

## Next useful evaluation

Give an unfamiliar purchasing reviewer their own small request and supplier CSV. Observe whether they can map fields, explain a whole-pack/MOQ difference, find a blocked row, distinguish a warning from a known failure, and restore a backup. Measure task completion and mistakes before expanding into OCR or integrations. No such user study or adoption result is claimed here.

## Current source map

| File | Role |
|---|---|
| `dist/core.js` | Pure validation, exact arithmetic, CSV, analysis, fingerprints, receipt snapshots |
| `dist/store.js` | IndexedDB transactions |
| `dist/app.js` | Workspace UI and interaction handlers |
| `dist/guide.html` | Public workflow and limitations |
| `tests/core.test.cjs` | Reproducible v2 domain tests |
| `docs/CORE.md` | Detailed current domain contract |
| `docs/ARCHITECTURE.md`, `VERIFICATION.md` | Historical Python prototype documents |


## Current task-first interface

The first viewport states the job directly: compare supplier quotes using whole-pack costs and entered delivery fees per offer line. Its fictional 120-bolt request is interactive and runs through the production calculation engine. At 120, Birch's order costs USD 27.40 and Oak's costs USD 40.00. Trying 100 reverses the result: Oak USD 22.00, Birch USD 23.00. At the 101-unit pack boundary Birch becomes USD 25.20 versus Oak USD 40.00. Those totals exclude tax, FX and shared supplier-order freight. Opening the comparison saves the exact current quantity and offers in a fresh editable workspace; trying quantities alone does not write data.

The selected ATELIER interface uses locally hosted Instrument Sans, warm paper, coral and dark primary actions. Original HTML request/Oak/Birch papers update alongside the real comparison. Full request, offers, decision, history and recovery screens share that system. At390px, papers stay contained and working controls stay readable. The input stays focused while results change; invalid quantities show an inline error and cannot open a misleading workspace. Saved comparisons remain visible below the preview instead of being silently reopened at startup.

The selected reference is [ProSave by Alina Volodina](https://www.behance.net/gallery/249980381/ProSave-B2B-Procurement-Platform-UIUX-Redesign), inspected beyond its thumbnail. Earlier Ramp/Ply research informed the superseded navy interface. No gallery assets, branding or code were copied. See [current decisions](DESIGN.md), [sources and rights](DESIGN-SOURCES.md) and [actual integrated browser findings](evidence/SELECTED-DESIGN-QA.md).

The present regression suite passes 32 checks: 23 core and nine targeted UI tests. Five new UI tests cover missing-core recovery, first-use navigation, 120/100/101 exact outcomes, invalid input blocking and exact preview-to-workspace handoff. The prior core and persistence/review tests remain intact. Historical [Cosmos browser checks](evidence/COSMOS-REDESIGN-QA.md) retain their original workflow evidence; their screenshots describe the superseded Georgia/ivory ledger. Earlier glass/Three.js captures are also historical. Domain calculations and storage are unchanged by the current visual redesign.
