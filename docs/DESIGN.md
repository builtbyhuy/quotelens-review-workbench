# Interface direction — 21 October 2026

The user rejected the first green dashboard design and selected [Lifemed Web & Motion by Mubien](https://www.behance.net/gallery/252323471/Lifemed-Web-Motion) as the new visual direction. Its live site was inspected at https://lifemed.ai/ on 21 October 2026.

The translation uses a white gallery canvas, regular black display typography, a restrained floating navigation bar, original refractive glass artwork, quiet lilac surfaces, thin boundaries and clear black actions. It borrows composition and visual principles, not Lifemed's brand, healthcare copy, customers, metrics, logo or artwork.

Manrope is bundled under its complete SIL Open Font License. The original glass sculpture was generated specifically for this project using imagegen; prompts and provenance are in dist/assets/SOURCES.md. No remote font, tracking SDK, copied reference video or external animation dependency is needed.

The purchase workflow uses the same visual language at a denser scale: full-width working area, calm supplier tables, legible input controls, pale review summary and explicit warnings. A workspace picker replaces the permanent sidebar. Home, workspace selection and import remain functional actions. Data and calculation rules are preserved.

Color roles: white #ffffff, ink #19191d, muted #6a6a75, line #e9e9ef, lilac wash #f6f5fa, focus #937ee4. Display text ranges from 50–74px desktop; working headings from 23–36px; controls and input values from 12–14px. Mobile collapses to one column with scrolling tables contained inside the table wrapper. Entry animation is short and respects reduced motion.

Visual and browser acceptance are separate from calculation tests. See docs/evidence for recorded interface captures; these are internal checks, not user approval of the redesign.

## 21 October 2026 — project-fit sources and live motion

The approved white/black/glass identity is preserved. [Ply – Inventory Management](https://www.behance.net/gallery/230579469/Ply-Inventory-Management) now supplies the purchasing-workflow reference: clear stages, readable supplier facts and explicit status hierarchy. [Lifemed Web & Motion](https://www.behance.net/gallery/252323471/Lifemed-Web-Motion) remains the composition/material reference. The live hero uses three original curved quote sheets rendered with locally vendored MIT-licensed Three.js; it supersedes the earlier static-only hero description and the earlier statement that no external animation dependency is used. The generated PNG remains a fallback. No gallery artwork, models, video or code are reused.

Lifemed's automatic case-video movement was observed; Ply's inspected sections were static. Exact source triggers and durations were not measured. QuoteLens's ambient movement and short state-feedback timings are its own choices, with pause and reduced-motion behavior. See [DESIGN-SOURCES.md](DESIGN-SOURCES.md) for inspected sources, product-specific choices and license boundaries, [MOTION-ENGINE.md](MOTION-ENGINE.md) for the runtime contract, and [MOTION-ACCEPTANCE.md](MOTION-ACCEPTANCE.md) for integrated browser findings. These notes are not user acceptance.
