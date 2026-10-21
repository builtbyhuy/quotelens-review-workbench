# Architecture and decisions

```text
Supplier CSV
  -> bounded schema and value validation
  -> original fields + source hash + physical source line spans
  -> whole-pack calculation + invalid-offer exclusions
  -> explicit reviewer selection
  -> current-revision and completeness gate
  -> immutable local approval receipt
  -> source-linked decision CSV / JSON export
```

The interface calls a small Python HTTP boundary. The domain calculation and
review store are separate functions/classes in `quotelens.py`. A standard-library
implementation keeps the work reproducible without installing dependencies.

## Pricing is a decision input, not a cosmetic total

`packs_needed = ceil(required_units / pack_size)`.
`purchase_cost = packs_needed * price_per_pack`, rounded half up to two decimal
places for this USD demonstration. Displayed unit quantities include purchased
surplus. Freight and tax remain outside the total rather than silently becoming
zero-valued inputs. A mixed-currency selection has no comparable grand total and
cannot be approved without a separate FX policy.

The application suggests the lowest eligible USD offer per item; it does not
optimize supplier freight, minimum-order values, consolidated shipments or
business preferences. Reviewers can select a higher-priced eligible offer.

## Source identity and approval are different identities

The imported UTF-8 bytes determine a SHA-256 source identity. Physical CSV line
spans and original field values remain attached to each offer, including quoted
multiline fields. Duplicate supplier / quote / SKU identities invalidate all
colliding offers so a cheaper duplicate cannot win silently.

An approval captures the source identity, review ID, selection revision, exact
selected rows, currency and amount. A source import creates a new review. A changed
selection increments its revision. Both paths require a new approval; prior
receipts remain history. Hashes identify artifacts, not external certification.

SQLite transactions and a local process lock serialize writes. A unique
`(review_id, revision)` constraint makes repeated approval idempotent. A stale
browser receives HTTP 409 rather than approving a different version silently.

## Boundaries

- This local tool has no user authentication or role permissions. Its review
  approval is a demonstration state, not an accountable business authorization.
- No external connector is invoked. Exporting a reviewed decision is the last
  implemented step; purchasing remains outside the application.
- SQLite records persist but have no production backup, encryption, retention or
  tamper-evident audit policy. Administrators can edit the local database.
- Basic request/CSV bounds, Host/Origin checks, text escaping and restrictive
  content policy reduce local-demo risks; they do not constitute a security audit.
- A real deployment requires confirmed purchasing requirements, a configurable
  request model, currency precision rules, identity, authorization, supplier
  contracts and an independently reviewed production architecture.

## Design rationale

The central comparison uses requested items as rows and supplier offers as
columns. Purchased quantities sit beside prices; source links remain visible.
A separate decision rail holds completeness, totals and approval. Source issues
and decision history remain adjacent below the comparison.

Palette: navy `#172641`, text `#162138`, blue `#2848c6`, neutral `#f4f7fb`,
green `#166b48`, amber `#8c4c0b`. System UI type keeps a data-heavy workspace
legible without external fonts. No remote runtime asset is required.

[GitHub Primer's table guidance](https://primer.style/product/components/data-table/)
was inspected for readable row identity, alignment and associated controls. The
implementation is original HTML/CSS/JavaScript, not a copied Primer component.
