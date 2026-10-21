# Task-first QuoteLens UI — actual checks

21 October 2026. Local implementation/browser checks before root release packaging. These establish the observed behavior below, not customer adoption, business savings, a complete accessibility certification or subjective acceptance.

## Changed product entry

The first page identifies the task as supplier quote comparison. Its explicitly fictional bolt comparison uses the production engine and creates no saved workspace until opened. The app now returns to this overview on reload, with saved comparisons still accessible below it. Inside a workspace its purpose remains visible.

## Checks actually performed

- **1265 × 712 desktop:** actual local browser screenshot inspected. Both supplier totals, the answer and **Open this comparison** fit the viewport; the action's measured bottom was 652.6px. No horizontal page overflow. The locally hosted Source Sans 3 font loaded successfully.
- **390 × 844 phone:** actual browser render inspected. Both competing totals and the open action remain visible together. A single header action starts a user-owned comparison. Secondary case/source/guide links remain reachable below. No horizontal page overflow in the observed quantity-entry state.
- **Real price change:** 120 bolts shows Oak USD 40.00 and Birch USD 27.40. Selecting **Try 100 bolts** changes the outcome to Oak USD 22.00 and Birch USD 23.00. Typing 101 shows Oak USD 40.00 and Birch USD 25.20.
- **Focus:** after entering 101, the active element remained `preview-quantity`. Only the result changes; the input and preset button are not replaced.
- **Error/recovery:** entering 0 and selecting **Open this comparison** left the overview open with an inline whole-quantity error. Entering 101 cleared it; opening then showed the real decision workspace with one 101-unit item, two matching offers, Birch selected, 11 packs/110 units and USD 25.20. The unverified quote-expiry warning remained visible.
- **Return path:** reload returned to the explained overview and displayed the newly saved comparison as an existing record.
- **Case study:** actual desktop route and current humanist typography inspected. Active internal app/guide/case links use relative paths, including `.html` for GitHub Pages compatibility. Canonical and Open Graph URLs target the new GitHub Pages path; root release verification owns the public deployment result.

Reproducible automated checks:

```text
node --test tests/core.test.cjs tests/ui-persistence.test.cjs
```

**31 passed: 23 core + 8 UI.** Four new UI regressions cover startup without data mutation, exact 120/100/101 outcomes, invalid empty/0/fraction/>300 rejection and handoff of the exact displayed quantity/terms into a distinct workspace while preserving the existing one. The harness runs core and UI in one browser-equivalent JavaScript realm; strict portable-file object validation remains unchanged.

## Evidence and limits

[Current desktop capture](clarity-desktop.png) · [Current phone capture](clarity-mobile.png). Root integration review captured these independently from the same local implementation. Additional local state/error captures are in the task's `output/clarity-redesign-2026-10-21` folder. All values are explicitly synthetic.

Core calculations, IndexedDB storage and receipt rules are unchanged. Previously recorded complete request/CSV/review/export checks remain in their original historical evidence records. They were not silently represented as new execution under this visual release. The current reduced-motion CSS and existing state-feedback guard are present; this local agent did not emulate the operating system's reduced-motion setting. No real user study, paid customer, cloud sync, account or supplier integration was introduced.
