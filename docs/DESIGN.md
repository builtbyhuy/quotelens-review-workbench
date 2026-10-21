# QuoteLens — current task-first interface

Updated 21 October 2026 after the user rejected the editorial ledger's clarity, typography and presentation. This replaces the earlier Swiss/Georgia interface. Existing behavior, source records and user workspaces remain the product contract.

## What the first viewport must explain

QuoteLens compares supplier quotes for the full purchase quantity, including whole packs, minimum packs and per-line delivery. The page states that purpose directly: **Compare supplier quotes. See the real cost.** A working comparison follows immediately, instead of a large editorial slogan or instructions that must be read elsewhere.

The fictional workshop-bolt example runs through `QL.analyze`, the same deterministic engine used for real workspaces. At 120 bolts, Oak's USD 0.18 unit price produces a USD 40.00 purchase while Birch's USD 0.22 unit price produces USD 27.40. The visible **Try 100 bolts** preset reverses the result: Oak USD 22.00, Birch USD 23.00. At 101 bolts the whole-pack boundary makes Birch USD 25.20 versus Oak USD 40.00. Supplier, pack size, purchased quantity, overage and delivery stay visible beside each total.

The quantity field accepts whole values 1–300 for this introductory example. Invalid input leaves the last valid result visible, exposes an inline error and blocks opening a misleading comparison. The limit applies to this small example; user-created requests retain the existing domain limits. The preview creates no saved work until the user selects **Open this comparison**. That action preserves the chosen quantity and exact offer terms in a new editable workspace and opens its actual decision. Existing workspaces are not overwritten.

**Compare my quotes** starts a blank user-owned comparison. CSV mapping, manual entry, source inspection, review and export remain available. The app opens on the overview instead of silently reopening the first saved request; saved comparisons remain directly below the working example. Inside a workspace the persistent “Supplier quote comparison” descriptor keeps its purpose visible.

## Visual system

- One locally hosted humanist family: Adobe Source Sans 3, variable upright, weights 200–900 under SIL OFL 1.1. Display titles use 650 weight and a compact scale; normal controls/body use 400–600. Tabular numerals support exact totals without turning the interface into a monospaced folio.
- Navy ink `#182b47`, restrained blue action/selection `#2454a3`, cool page `#f4f7f8`, white working surface and quiet blue-grey separators. Green remains only where a functional approved/success status requires it. PourLab owns a separate game-oriented palette and type system.
- Compact top navigation, direct task title, one full-width comparison sheet and aligned data. Saved work appears as records. No decorative feature-card row, quotation-like serif heading, glass scene or gallery artwork.
- Desktop shows supplier, unit price, purchased packs and order total in shared columns. At 390px each supplier becomes a compact record with its total at right; both competing totals remain visible in the first 844px viewport. The phone header carries the single primary action, while secondary project links remain in the footer.
- The working app, guide and case study use the same current type and color roles. Original bolt line art is project-authored SVG.

## Interaction and verification boundary

Quantity changes update only the comparison result, preserving input and preset-button focus. The unchanged state-feedback module still handles explicit workspace-stage changes, recomputed selected totals and dialogs. Reduced-motion preference suppresses visual animations and transitions; nothing loops continuously.

The calculation and storage modules are unchanged. The UI regression suite adds a recoverable missing-engine state without storage access, first-use navigation, exact 120/100/101 results, invalid input blocking and precise preview-to-workspace handoff. Automated checks supplement actual desktop/mobile browser inspection; they do not prove user adoption, commercial impact or subjective acceptance. Historical ledger/glass screenshots and their QA describe earlier designs, not the present interface.
