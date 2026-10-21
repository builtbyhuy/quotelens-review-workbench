# QuoteLens

**Compare your own supplier offers without losing the source behind a decision.**

[Open the online workbench](https://quotelens-huy.hokhachuy1234.chatgpt.site) · [User guide](https://quotelens-huy.hokhachuy1234.chatgpt.site/guide.html) · [Public case study](https://quotelens-huy.hokhachuy1234.chatgpt.site/case-study.html)

Independent product by [Hồ Khắc Huy](https://github.com/builtbyhuy), built with AI coding assistance on 21 October 2026. Examples and verification inputs are synthetic. No customer adoption, measured saving, procurement deployment or production readiness is claimed.

![QuoteLens current purchasing ledger](docs/evidence/cosmos-desktop.jpg)

[Current mobile interface](docs/evidence/cosmos-mobile.jpg) · [Redesign browser checks](docs/evidence/COSMOS-REDESIGN-QA.md)

## Online product: your request, your offers

The browser product starts with an empty workspace. Create arbitrary purchase requests, enter offers manually or map your own CSV columns, compare the whole packs you would buy, inspect the source and record the reviewed revision. The editable fictional example is a tour; it is not a fixed input requirement.

- User-created workspaces with a review date, one currency and arbitrary request items.
- Generic CSV column mapping and manual offer entry, preserving original fields and physical CSV row references.
- Exact `BigInt` money: whole-pack rounding, minimum pack orders and a delivery fee for each offer line.
- Explicit eligibility and warnings for stock, expiry, lead time, duplicate identities, currency and invalid values. Missing facts are not silently converted into confirmation or zero.
- Explicit selection, optional reasons, revision-specific local approvals and historical input snapshots.
- IndexedDB persistence, visible save failures, decision CSV/receipt exports and validated workspace JSON backup/restore.

Read the [current domain rules](docs/CORE.md) and [v2 case study](docs/CASE-STUDY-V2.md). The historical Python implementation below is a separate local prototype with a fixed synthetic request.

## Use the browser workflow

The interface is a paper-toned purchasing ledger: a persistent workbench rail, numbered workflow, original-input tables and a revision-specific decision summary. An explicitly fictional offer calculation explains why the lowest unit price need not produce the lowest purchase cost. View changes, source inspection and a changed selection total receive short feedback; calculation and storage do not wait for animation. Reduced-motion preference disables that feedback. See [current design decisions](docs/DESIGN.md) and [inspected Cosmos references](docs/DESIGN-SOURCES.md).

1. Create a workspace and choose the review date and currency.
2. Add your request items, matching IDs, whole quantities and optional maximum lead times.
3. Add manual offers or import a CSV and map its columns.
4. Inspect whole-pack costs, source rows, blocked offers and unverified facts.
5. Choose eligible offers for every item, review the current revision and acknowledge the remaining unknowns.
6. Export an approved comparison or receipt, and keep a workspace backup outside browser storage.

Changing decision inputs requires a new review. Historical receipts remain snapshots of their original inputs. A receipt is a local record, not a signed purchase order or tamper-proof certificate. The content fingerprint is a canonical string, not a cryptographic hash.

## Run the online version locally

Serve `dist/` with a static server; no package installation or application backend is needed:

```sh
python -m http.server 8080 --directory dist
```

Open **http://localhost:8080**. A modern browser with JavaScript, BigInt and IndexedDB is required. This is separate from the Python application server below.

## Test the current calculation core

Node 18 or newer; no install step:

```sh
node --test tests/core.test.cjs tests/ui-persistence.test.cjs
```

On 21 October 2026, **27 checks passed: 23 core tests and four UI regression tests**. The core checks cover novel arbitrary inputs, exact money, pack/MOQ/line-fee rules, eligibility, CSV boundaries, source provenance, immutable receipts and hostile backup rejection. The UI checks cover explicit note saving, delayed render safety, serialized revision writes and selected-offer warning scope. A separate Codex-agent integration review exercised actual app handlers using a surrounding-workspace harness; that harness is not included as a repository test.

Actual browser verification used a custom two-item, eight-offer CSV request with an exact selected total of **USD 66.00**. Revision 6 was approved and its exported receipt retained the saved reason. Changing a requested quantity to 24 created revision 7; reverting to 23 created revision 8, which remained unapproved after reload, while the earlier receipt stayed in history. These are synthetic functional checks, not business acceptance, savings or a complete accessibility audit.

[Desktop browser evidence](docs/evidence/desktop-decision.jpg) · [Mobile browser evidence](docs/evidence/mobile-decision.jpg) · [Synthetic exported receipt](docs/evidence/synthetic-browser-receipt.json)



## Storage, limits and deliberate scope

Data is saved in IndexedDB on the current browser origin, with explicit save-failure feedback. There is no account, authentication or cloud sync. Export JSON backups before clearing browser data, moving devices or changing origins. Shared local use is not multi-user authorization.

The application has no in-app AI, OCR/PDF extraction, exchange-rate conversion, tax calculation, shared supplier-order freight, supplier integration, external messaging, payment or order placement. AI assistance describes development, not the deterministic comparison method. USD/EUR/GBP/VND workspaces use separate currencies and two decimal places, including VND. A delivery fee applies to one offer line. Quantities are whole units.

Practical bounds: 200 request items, 2,000 offers, 64 CSV columns, 2 MiB CSV characters, 8 MiB portable JSON characters and 50 historical receipts. Large snapshots can reach the backup size cap before the receipt count cap. See [CORE.md](docs/CORE.md) for exact limits and validation behavior.

## Tóm tắt tiếng Việt

QuoteLens cho phép tự tạo yêu cầu mua hàng, nhập báo giá bằng CSV có ánh xạ cột hoặc nhập tay, tính đúng số kiện phải mua/MOQ/phí giao theo dòng, kiểm tra dữ liệu và lưu quyết định theo phiên bản. Dữ liệu lưu tại trình duyệt, có xuất/nhập bản sao JSON. Đây là sản phẩm độc lập có AI hỗ trợ lập trình, chưa có bằng chứng khách hàng thực tế hay hiệu quả thương mại.

## Legacy Python prototype (v1)

The following historical instructions are retained for the earlier Python/SQLite application. Its fixed request, source hashes, SQLite storage and historical verification are **not** the online v2 contract. `docs/ARCHITECTURE.md`, `docs/VERIFICATION.md` and `docs/PROVENANCE.md` describe that earlier implementation.

<details>
<summary>Run and inspect the historical local prototype</summary>

**Compare supplier quotes without losing the source behind a decision.**

QuoteLens is a runnable local workbench for reviewing a small purchasing request.
It calculates the cost of the **whole packs actually needed**, excludes invalid
offers, links each number to its original CSV row, and records a review approval
against an exact source and selection version.

Independent, AI-assisted portfolio work by [Hồ Khắc Huy](https://github.com/builtbyhuy),
created 21 October 2026. The suppliers, prices and purchasing request are synthetic.

![Quote review workbench](docs/workbench-desktop.png)

### Try the complete workflow

Requires Python 3.11 or newer. No package installation, API key or cloud account.

```sh
python quotelens.py
```

Open **http://127.0.0.1:8767**.

1. Start with the conflicting sample. Drive belts have insufficient stock, an
   expired quote and conflicting duplicate identities. Approval stays blocked.
2. Open **Source line** to inspect the original fields behind a price or error.
3. Choose **Load clean sample**, or import `samples/clean.csv`. The lowest eligible
   USD selection costs **256.80** for the four synthetic request items, excluding
   freight and tax. This is a fixture calculation, not a customer saving.
4. Change a supplier offer, approve the selection, then export the decision CSV
   and JSON receipt. Exports retain source line numbers and source/snapshot hashes.
5. Change the approved selection or reimport a CSV. The earlier approval remains
   in history but cannot authorize the new decision.
6. Restart the server. The current source, selection, approval and audit history
   persist in the local SQLite database.

### The problem worth solving

A nominally cheaper unit price can produce a more expensive purchase when pack
sizes differ. A spreadsheet comparison can also hide an expired offer, insufficient
stock, conflicting rows or an approval that belongs to an older source file.

For example, 120 bolts require two 100-unit packs at USD 18 each: **USD 36**, not
USD 21.60. A 10-unit pack at USD 2.20 requires twelve packs: **USD 26.40**.
QuoteLens preserves that calculation beside the selected offer and original row.

### What actually works

- CSV import with schema, row-count, field-length and numeric bounds.
- Decimal arithmetic, whole-pack rounding and quantity/availability checks.
- Duplicate supplier/quote/item detection, expiry checks and currency boundaries.
- A source inspector showing untouched original fields and physical CSV line spans.
- Explicit offer selection, optimistic revision checks and immutable approval receipts.
- Transactional SQLite storage; repeated or concurrent approval of one revision
  returns the same receipt.
- Reapproval after a source or selection change; older decisions remain auditable.
- Decision CSV and JSON receipt exports. CSV text cells are escaped against
  spreadsheet formula interpretation.
- Responsive browser interface with loading, error, blocked and approved states.

### Inspect the engineering

- [Domain, storage and HTTP boundary](quotelens.py)
- [Browser interface](web/)
- [Synthetic clean and conflict cases](samples/)
- [Executable checks](tests/test_quotelens.py)
- [Architecture and trade-offs](docs/ARCHITECTURE.md)
- [Observed verification and limits](docs/VERIFICATION.md)
- [AI assistance and source provenance](docs/PROVENANCE.md)

Run the focused checks:

```sh
python -m unittest discover -s tests -v
```

### Deliberate scope

This is a **single-user local application**, not a procurement service or a
customer deployment. It uses a fixed four-item synthetic request and a stated
21 October 2026 review date so the sample remains reproducible. Import files
follow the provided schema. PDF/OCR extraction, exchange-rate conversion,
freight/tax comparison, authentication, multi-user authorization and supplier
integrations are outside this version.

The server binds to loopback only and rejects unrelated Host/Origin values.
Do not expose it to a public network. No purchase order, message or payment is
sent. UI verification and synthetic checks do not establish adoption, business
savings or production readiness.

MIT licensed. No third-party runtime assets or customer records are included.

</details>



## Visual redesign

The latest design follows two inspected Cosmos references: [Swiss grid structure](https://www.cosmos.so/e/1795378467) and [an editorial works index](https://www.cosmos.so/e/1312667708). These inform asymmetric columns, aligned folio metadata, sharp rules and working files presented as records. Georgia, Arial/Helvetica and Consolas system stacks separate editorial headings, controls and numeric evidence. Ivory paper, graphite and an ochre selection cue deliberately distinguish this operational product from PourLab's game instrument. See [design decisions](docs/DESIGN.md) and [source-to-decision mapping](docs/DESIGN-SOURCES.md).

The earlier Lifemed-inspired glass interface, Manrope font, original glass image and Three.js implementation remain in the repository as historical assets with their licenses. They are not loaded by the current app. Earlier `redesign-*` screenshots and `motion.gif` show that superseded version, not the current ledger. Domain rules, user data, storage and calculation behavior are preserved.
