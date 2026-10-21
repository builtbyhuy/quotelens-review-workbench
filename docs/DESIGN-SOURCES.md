# QuoteLens design sources

Recorded 21 October 2026. The approved white / black / glass direction remains the design constraint. References were opened on the designers' actual pages and inspected visually in a browser; a gallery title or thumbnail alone was not used as evidence of fit.

## Selected references and translation

### Ply — purchasing workflow

[Ply – Inventory Management, Cosmos Studio and collaborators](https://www.behance.net/gallery/230579469/Ply-Inventory-Management), published July 2025, is the primary product-fit reference. Its white panels, dark text, thin divisions, compact tabs and restrained status accents make operational data legible. The [designer's case study](https://www.cosmos.studio/projects/ply-procurement-saas-design) also explains RFQ stages, supplier coordination and CSV/Excel import progress.

QuoteLens uses those principles for request → offers → comparison → review: keep the purchase facts, exception states, source inspection and next action close together. It retains its own workspace picker, pack/MOQ calculations, unknown-data states and receipt history. Ply's branding, warehouse imagery, green identity and full interface layout are not reused.

### Lifemed — approved composition and glass

[Lifemed Web & Motion, Mubien](https://www.behance.net/gallery/252323471/Lifemed-Web-Motion), published July 2026, remains the visual reference for whitespace, regular black display type, compact black actions, thin navigation and layered iridescent glass. QuoteLens translates the glass into **three original curved quote sheets** with physical depth and restrained document strokes. Their slow convergence and separation suggest comparison while preserving the heading's readability. They are project-created geometry, not a screenshot, extracted model or textured copy of Lifemed artwork.

Lifemed's healthcare copy, folder-shaped brand device, customer claims, diagrams and video sequences are excluded. Its broad composition fits the approved identity; Ply is more useful for the purchasing task itself.

## Motion evidence and project choices

Lifemed's embedded video was seen changing between a claim/file composition and the Analyze / Integrate / Automate cards without a user action. This verifies automatic presentation motion in the case video. It does not establish the live site's interaction trigger, source easing or exact duration. The inspected Ply sections were static designs; no product animation timing was verified.

All QuoteLens timing is therefore a project choice, not a measured Behance specification. Short control feedback (about 120–180 ms), view changes (about 180–260 ms) and grouped result emphasis (about 260–400 ms) are design starting ranges, not a claim that every range is implemented. Feedback must follow actual data/state changes; imports and calculation results must not gain artificial waiting time. The implemented hero's geometry, pause control, reduced-motion default, offscreen suspension and fallback contract are recorded in [MOTION-ENGINE.md](MOTION-ENGINE.md). Source inspection or a still image does not establish final motion acceptance.

## Source and license boundaries

- The original project code and generated runtime geometry use the repository's [MIT license](../LICENSE). This does not relicense third-party or gallery material.
- Three.js **0.180.0 / r180** is vendored locally under its own [MIT notice](../dist/vendor/three/LICENSE). Keep that notice with redistributed copies. It provides the rendering engine; it does not provide the gallery's art or design rights.
- Manrope retains its separate SIL Open Font License. The original generated fallback image and font provenance are recorded in [asset SOURCES.md](../dist/assets/SOURCES.md). The fallback image is a separate pre-rendered asset, not the live geometry.
- Ply's page displayed **All Rights Reserved**. Lifemed displayed **Attribution / Non-commercial / No Derivatives** badges. Neither inspected page offered a verified commercial source-code/asset license or download price. They supply observed design principles only; no gallery image, video, font, model or code was copied into QuoteLens.

No designer was contacted and no asset, subscription or service was purchased for this reference work.

Integrated geometry, recordings, narrow-screen checks and interaction findings are recorded separately in [MOTION-ACCEPTANCE.md](MOTION-ACCEPTANCE.md).
