# Synthetic engineering evaluation

Observed 2026-10-21T09:04:47.967Z. Command: `node scripts/evaluate-corpus.cjs --write`. Environment: Node v24.19.0, win32/x64. Base commit at run: `b3742d2a07936bbd47c788deb0f0a1798c07d319`; the JSON records exact input/script/core hashes, including uncommitted evaluation files at this run.

15/15 fixed cases matched; 33 offers were inspected. These are corpus counts, not a quality score or business-impact metric.

## Method

A separate [reference calculator](../../evaluations/reference.cjs) enumerates pack counts, then adds each pack price as an exact decimal rational. It imports no production code and uses a different arithmetic path from the production ceiling division and minor-unit totals. A fixed handwritten ledger in the [corpus](../../evaluations/corpus.cjs) checks its packs, units, totals and choices. Eligibility and warning annotations come from the documented domain contract; they are not an independently proven full validation implementation. All evaluation code was AI-assisted.

The [machine-readable report](engineering-evaluation.json) contains expanded synthetic inputs, every expected/actual offer result, warning/blocker tags, environment and source hashes. Any mismatch produces a nonzero exit code. Run without `--write` for verification without replacing these records.

| Case | Expected / actual selected subtotal | Expected / actual complete | Outcome |
| --- | --- | --- | --- |
| whole-packs-countercase | EUR 8.00 / 8.00 | true / true | Match |
| minimum-order | GBP 5.25 / 5.25 | true / true | Match |
| delivery-reverses-ranking | USD 13.20 / 13.20 | true / true | Match |
| unknown-is-not-zero | EUR 3.60 / 3.60 | true / true | Match |
| unknown-deadline | EUR 0.00 / 0.00 | false / false | Match |
| inclusive-calendar-and-lead | EUR 14.10 / 14.10 | true / true | Match |
| stock-counts-packs | VND 9300.00 / 9300.00 | true / true | Match |
| invalid-terms | EUR 0.00 / 0.00 | false / false | Match |
| exact-duplicates | EUR 6.30 / 6.30 | true / true | Match |
| conflicting-duplicates | EUR 6.30 / 6.30 | true / true | Match |
| partial-selection | EUR 9.42 / 9.42 | false / false | Match |
| blocked-selection-excluded | EUR 9.42 / 9.42 | false / false | Match |
| no-implicit-fx | GBP 6.20 / 6.20 | true / true | Match |
| large-exact-decimals | USD 3555555555555555.89 / 3555555555555555.89 | true / true | Match |
| same-total-new-review | EUR 18.50 / 18.50 | true / true | Match |

## Countercase to nominal unit price

For 51 fictional screws, 100-unit packs at 9.00 have a lower nominal unit price (0.09) than 10-unit packs at 1.30 (0.13). The first purchase nevertheless costs **10.00** including its 1.00 line fee; six small packs plus a 0.20 fee cost **8.00**. The naive ranking chooses the wrong line for this stated cost contract. The 2.00 difference is arithmetic on synthetic inputs, not customer savings.

## Same total, different reviewed input

The pad case buys three 10-unit packs at 5.75 plus 1.25 delivery: **18.50** for either 23 or 24 requested units. The evaluator invokes the current app's actual approval-lookup predicate. The original receipt approves revision 1 / quantity 23. A defensive control changes quantity to 24 **while retaining revision 1**; current approval must become false even though the subtotal and revision number match. This simulates an incorrectly versioned or stale state: ordinary app edits increment the revision. A deliberately broken revision-only lookup accepts this control, so the evaluator records and rejects that mutant.

Revision 2 with quantity 24 also needs review. Revision 3 after reverting to 23 remains unapproved even though the canonical content string matches revision 1. The original receipt snapshot remains at quantity 23. The four explicit expected/actual steps and the mutant counterexample are in the JSON report. This checks local revision/content identity; the fingerprint is not a cryptographic hash or authenticated signature.

## Limits

- Fixed synthetic corpus, not random coverage, exhaustive input validation or a procurement acceptance benchmark.
- Reference intentionally supports only these small pack counts and bounded two-decimal terms; production boundary rejection is annotated, not reimplemented.
- Does not exercise browser rendering, CSV parsing, IndexedDB, concurrent tabs, real suppliers, taxes, FX, shared freight, accessibility or user acceptance.
- No time saving, customer saving, demand, adoption, production readiness or unaided personal coding ability is established.
- Revision lookup is application logic evidence, not a fresh browser acceptance run. Existing browser evidence remains separate.
