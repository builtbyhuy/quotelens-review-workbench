# QuoteLens — ATELIER buying desk

Updated 21 October 2026 after the user selected the ATELIER direction from two working Behance-informed prototypes. The approved presentation is integrated with the complete browser product. The prototype's one-item, in-memory state layer was not copied into production.

## Make the job visible before the guide

The opening identifies **Compare supplier quotes**, then shows one purchase request beside two fictional supplier quotes. The headline is **Same purchase. Different quotes. See the quoted cost.** The primary action, **Compare my quotes**, starts a user-owned request. **Try the working example** brings the visitor to an actual comparison and focuses its quantity field.

These are original HTML/CSS papers with real text, not a screenshot, PDF upload feature or supplier integration. Their quantity, pack counts, fees, totals and lowest-eligible marker derive from the same `QL.analyze` result as the example below. They update when its quantity changes. The fictional label stays visible; the papers do not establish authentic supplier evidence.

The comparison contract is whole-pack goods cost plus the entered delivery fee for each offer line, before tax, without FX or shared supplier-order freight. The synthetic workshop example retains the established outcomes: at 120 bolts, Birch costs USD 27.40 versus Oak USD 40.00; at 100, Oak costs USD 22.00 versus Birch USD 23.00; at 101, Birch costs USD 25.20 versus Oak USD 40.00.

The introductory quantity field accepts whole values 1–300. Invalid input retains the last valid comparison, exposes an inline error and blocks opening it as a misleading workspace. Trying quantities does not save or overwrite work. **Open this comparison** saves its exact displayed quantity and offers as a new editable workspace. User-created requests retain the full domain limits, multiple items, mapped CSV and manual offers.

## Selected visual system

- **Type:** locally hosted Instrument Sans, variable upright, weight 400 for large display and monetary typography, mostly 400–500 for working text and controls. Working forms use 16px inputs; ordinary task descriptions retain readable 14–15px text. Small type belongs to quiet metadata and the decorative paper composition. Tabular numerals support exact totals.
- **Color:** warm page `#f9f7f1`, soft paper `#fffdf8`, graphite `#2d2e28`, coral display/selection `#ef6b42`, darker functional accent `#b34a29`, and dark `#303229` primary actions. Success and warning states keep their separate meanings. The navy/blue palette is superseded.
- **Composition:** spacious first viewport, light headline, a staged original paper composition, then a working comparison sheet and saved buying records. No invented dashboard KPIs, customer logos, awards or decorative charts.
- **Complete working surface:** request, offers, decision and history preserve their actual hierarchy. Source, CSV mapping, settings, review, receipt and recovery dialogs use the same warm surfaces and type system. The retained filename `ledger.css` does not mean the earlier Swiss ledger is active.
- **Responsive behavior:** decorative paper transforms are contained without clipping product controls. On phones the entire three-paper group scales inside the page; supplier rows become compact records. Wide working tables scroll in their own wrappers. Decision inputs, source dialogs and exports remain ordinary accessible controls.

## Motion and state

Paper entrance, result feedback, task navigation and dialog transitions are short CSS/DOM movement. They do not represent volumetric WebGL or a rendered 3D asset. Quantity changes update the result and paper summaries without replacing the focused input or preset button. Storage acknowledgement still updates the save indicator rather than rebuilding a typed note.

**Motion off** pauses visual effects without stopping calculations or changing saved data. The operating system's reduced-motion preference disables movement and exposes a **Reduced motion** control state. No ambient animation loops continuously. The motion controller releases detached references when leaving the overview and disconnects its observers on page exit.

## Evidence and acceptance boundary

[Current desktop](evidence/selected-desktop.png), [current phone](evidence/selected-mobile.png) and [selected-design checks](evidence/SELECTED-DESIGN-QA.md) describe the integrated release. The 32-check suite retains 23 core and nine targeted UI regressions; its existing quantity-boundary check also checks the paper summary. The separate 15-case/33-offer calculation corpus is unchanged. Browser checks, automated checks and the user's visual choice are different evidence.

The calculation core, IndexedDB store and portable schema are preserved. No customer usage, business savings, organizational approval or complete accessibility certification is inferred from this redesign. Earlier Source Sans/navy, Swiss/Georgia and glass/Three.js captures retain their original historical scope.
