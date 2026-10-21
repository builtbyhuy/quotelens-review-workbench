# Online architecture and reviewer guide

This document describes the current browser product in `dist/`, including its task-first overview and request/offers/decision/history workspace. The **v2** name identifies its domain and portable-data contract, not a hosting release number. [ARCHITECTURE.md](ARCHITECTURE.md) describes the separate historical Python/SQLite prototype.

## Follow one decision through the code

```text
User-created request + manual offers / mapped CSV
  → validate bounded input; retain original source fields
  → calculate whole-pack costs and eligibility
  → explicit selection + saved reviewer reason
  → review the current revision and content
  → local receipt snapshot + CSV / JSON export
```

| Active file | Responsibility and boundary |
| --- | --- |
| [`dist/index.html`](../dist/index.html) | Loads the calculation core, store and application in order; provides the dialog, file inputs and status region. |
| [`dist/core.js`](../dist/core.js) | Dependency-free UMD module shared by the browser and Node tests. Validates workspaces, parses/maps CSV, evaluates offers, calculates totals, creates receipts and validates portable backups. It performs no rendering, storage or network requests. |
| [`dist/app.js`](../dist/app.js) | Owns the task-first overview, fictional first-use comparison, in-memory workspace library, event handlers, escaped rendering, revision changes, explicit note saving, review dialogs, download actions and serialized storage writes. |
| [`dist/store.js`](../dist/store.js) | IndexedDB adapter: `all`, `put` and `remove`. Writes resolve on transaction completion, not merely on a successful individual request. |
| [`dist/ledger.css`](../dist/ledger.css), [`dist/interface-motion.js`](../dist/interface-motion.js) | Current responsive task-first presentation and short state-linked feedback. The CSS filename is retained from the earlier ledger; it does not identify the active visual direction. Motion respects reduced-motion preference and does not gate calculations or storage. |
| [`dist/guide.html`](../dist/guide.html), [`dist/case-study.html`](../dist/case-study.html) | Published usage, decision rules, evidence and limitations. They do not implement an additional backend. |

The earlier glass hero and Three.js files remain historical assets. The current entry point does not load them. Source and rights decisions are recorded in [DESIGN-SOURCES.md](DESIGN-SOURCES.md).

On startup, `activeId` is deliberately `null` after the saved library is loaded: the app explains the comparison before reopening any saved request. Its fictional preview runs through the production core but does not persist while quantities change. **Compare my quotes** creates an empty workspace; **Open this comparison** saves the preview's exact current quantity and terms as a separate workspace. Existing saved work remains available on the overview.

## Import is a boundary, not a guess

`parseCsv()` returns decoded fields and each record's **physical starting row**. It handles BOM, CRLF/LF/CR, quoted multiline fields and escaped quotes. Original fields, including unmapped columns, remain in `source.raw`; the source also keeps the filename and starting row. This is decoded input provenance, not an unchanged file archive or authenticated supplier evidence.

`importCsv()` maps user-selected headers to canonical fields. Required mappings are item ID, supplier, pack size and pack price. Unmapped currency requires an explicit workspace currency; a mapped blank currency is an error. Unknown stock, lead time and validity retain their unknown states. Manual offers retain their entered fields and use `line: null`, rather than inventing a CSV row.

Malformed parsing, mapping or row values reject the whole import. Only after a successful core result does `app.js` append offers, validate the resulting workspace and advance its revision. Unmatched item IDs and duplicate quote identities remain visible as blocked offers; source inspection explains what needs correction. Imported text is escaped for display, and decision CSV text cells are neutralized against spreadsheet formula interpretation.

## Money and review identity

For each eligible offer:

```text
packs = max(ceil(requested units / units per pack), minimum packs)
total = packs × pack price + delivery fee for this offer line
```

Money enters as bounded decimal strings and is calculated with `BigInt` minor units. Supported workspaces use one of USD, EUR, GBP or VND; all display two decimal places. There is no implicit FX, tax calculation or shared supplier-order freight. The selected subtotal becomes a complete review total only when every requested item has an eligible selection. Unknown commercial facts can still require acknowledgement.

`change()` clones, validates and increments the workspace revision before persistence. Request, offer, selection, note and relevant settings changes therefore require another review. The approval dialog captures both revision and `QL.fingerprint(workspace)` and checks them again on submission. `approved()` also requires both to match; even reverting to earlier values does not revive a receipt from an earlier revision.

The fingerprint is a deterministic **canonical content string**, not a cryptographic hash or signature. A receipt contains selected lines, reasons, source copies and a deep input snapshot; its snapshot excludes nested history. Validation reconciles its lines and snapshot, but a consistently rewritten user file is still possible. A receipt records a local review, not authenticated organizational authorization or a purchase order.

## Saving, failure and recovery

The IndexedDB database `quotelens-workspaces` contains a `workspaces` object store keyed by workspace ID. `persist()` updates memory immediately and queues cloned snapshots in revision order. A later write acknowledgement does not replace the DOM and erase a newly typed reason. The UI distinguishes **Saving**, **Saved** and **Not saved** using transaction outcomes; a toast is not the persistence boundary.

If storage fails, the current in-memory workspace remains available for **Export backup** while the tab is open. Keep that JSON outside browser storage. Restore validates the full workspace before accepting it; an existing workspace ID requires replacement confirmation. Deletion requires confirmation and offers restoration of the last deleted workspace during the same tab session. Neither browser storage nor that temporary undo is a permanent archive.

The queue orders writes within one tab. There is no account, cloud sync, multi-user authorization or cross-tab conflict resolution. Another origin or device has a separate library. Application code includes no quote-upload path or analytics SDK; the hosting provider still receives page/resource requests and can add security checks.

Public core limits include 200 request items, 2,000 offers, 64 CSV columns, 2 MiB of CSV characters, 8 MiB of portable JSON characters and 50 receipts. Large snapshots can hit the backup-size cap first. See [CORE.md](CORE.md) for field, numeric and schema limits.

## Inspect the recorded end-to-end flow

Serve `dist/` using the [README instructions](../README.md#run-the-online-version-locally). [Current task-first browser findings](evidence/TASK-FIRST-UI-QA.md) cover first-use navigation, interactive quantities, errors and preview-to-workspace handoff. A separate [recorded workflow from the earlier ledger interface](evidence/COSMOS-REDESIGN-QA.md) includes its input [CSV](evidence/cosmos-functional-offers.csv), exported [receipt](evidence/cosmos-functional-receipt.json) and historical working-screen captures. The earlier workflow was not silently rerun or recaptured under the new appearance.

That recorded synthetic run created a EUR request for 37 retaining rings and 11 seals, with a seven-day lead constraint, then mapped six offers. The reviewer inspected physical source row 3, selected two offers totaling **EUR 60.95**, saved a reason and approved revision 7. Increasing ring quantity to 38 produced revision 8: the whole-pack total stayed unchanged, but approved exports became unavailable. After reload, the reason and historical revision 7 receipt remained. This tests input/review identity beyond a changed price; it does not demonstrate customer savings or adoption.

The reproducible command `node --test tests/core.test.cjs tests/ui-persistence.test.cjs` covers 23 core tests and nine targeted UI regressions. The initial four UI regressions cover note handling, delayed render safety, serialized writes and selected-offer warning scope; five later checks cover the first-use behavior described above. The UI harness stubs surrounding DOM/storage behavior; it is not a real-browser or IndexedDB compatibility suite. The [recorded 32-check result](evidence/TASK-FIRST-UI-QA.md) and browser observations retain their stated execution scope, not complete accessibility, human usability or every failure mode.

## Trade-off: local review instead of a shared approval service

A server-backed workflow with identities, shared revisions and signed approvals would require authentication, authorization, operating storage and conflict handling. This version deliberately keeps a static, inspectable product with user-controlled inputs and portable backups. That makes the full comparison loop usable without an account or API credential, while leaving organizational approval, supplier authenticity and collaborative purchasing outside its contract. Adding a backend solely to make the stack larger would not resolve those product responsibilities by itself.
