# Verification

Checked 21 October 2026 on the author's Windows workspace. Status: **23 automated
checks passed; the stated local browser flow was inspected.** These are functional
results for synthetic inputs, not customer acceptance or business outcomes.

## Executed checks

`python -m unittest discover -s tests -v` completed successfully: **23 tests**.
The suite exercises whole-pack calculation, the independent USD 256.80 fixture
total, duplicate identities, missing currency, malformed numbers, expiry, stock,
mixed currency, multiline/blank-line provenance, invalid selection, stale revision,
replacement source, persistent storage, idempotent/concurrent approval, export
provenance, spreadsheet formula escaping and the loopback HTTP boundary.

The first run found an approval SQL placeholder mismatch and SQLite connections
that remained open on Windows. Both were corrected; the full final suite passed.

## Browser observations

The actual Python server ran on `127.0.0.1:8767`; the interface was used through
the in-app browser.

- Conflicting CSV: four offers excluded; the drive-belt item has no eligible
  selection; the approval button is disabled and the reason is visible.
- Source inspection: Northline bolts show 100-unit packs at USD 18.00; the
  inspected row produces two packs / 200 units / USD 36.00 for 120 required units.
- Keyboard: Escape closes the source dialog and focus returns to its source link.
- Clean sample: four items covered, selected total USD 256.80, approval enabled.
- Approval: a source-bound receipt appears and the export link receives focus.
- Changed selection: choosing Northline bolts changes the total to USD 270.00,
  increments the revision and removes the prior approval from the current decision.
- File import: `samples/clean.csv` was selected through the browser file picker;
  a replacement review appeared and required a fresh approval.
- Download: the actual browser CSV download was read; its header and four decision
  rows were checked. A copy is retained as [example-decision.csv](example-decision.csv).
- Reload: the current approval receipt and source state survived a browser reload.
- Mobile: a 390 x 844 viewport was inspected; the layout adapts to a single column
  and the DOM width check reported no horizontal overflow. The temporary viewport
  override was reset after inspection.

Retained actual browser captures:

- [Desktop comparison](workbench-desktop.png)
- [Mobile approved decision and history](workbench-mobile.png)

## Limits

No real supplier account, purchase order, payment or customer record was used.
No external connector was called. No production deployment, authentication,
multi-user authorization, accessibility certification, load test or security audit
is claimed. Keyboard coverage is limited to the recorded flow; no screen-reader
review or automated axe run was performed. CI results, if later available, are
separate from this local run.
