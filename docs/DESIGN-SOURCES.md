# QuoteLens — selected ATELIER design sources

Recorded 21 October 2026. The user selected ATELIER after inspecting two working directions. Its principles were adapted to the complete QuoteLens controller; the isolated prototype is not the production persistence or import implementation.

## Selected reference: ProSave

[ProSave — B2B Procurement Platform UI/UX Redesign](https://www.behance.net/gallery/249980381/ProSave-B2B-Procurement-Platform-UIUX-Redesign), **Alina Volodina**, published 25 May 2026.

Inspected in a real browser: the cream/coral opening with a staged device on an industrial object; deeper benefits, ordering and approval panels with light typography, quiet neutral surfaces, restrained icons and generous whitespace. ProSave is a procurement redesign concept. Its claims, customers, platform scope and outcomes do not establish QuoteLens's capabilities or demand.

| Observed principle | QuoteLens decision |
| --- | --- |
| Large light type, deliberate whitespace and sparse navigation | Instrument Sans at weight 400 for the opening; quiet navigation, a literal supplier-comparison category and a clear action for the user's own quotes. |
| A staged object explains the product's setting | Original HTML/CSS papers show a purchase request and two supplier quotes. They contain actual preview values, not copied device imagery or a decorative glass asset. |
| Calm cream surfaces with a restrained warm accent | Warm paper and graphite throughout the working app; coral identifies selected/relevant information, while dark primary actions remain clear. |
| Hierarchy supports a procurement task | Input → comparison → explicit review/source record. The existing multi-item, mapped-CSV and history workflow remains complete. |

The inspected reference panels were static gallery images. No motion or live behavior is attributed to ProSave on that basis. QuoteLens's short paper/result/dialog movement is original integration work and was checked separately in its running interface.

## Actual reusable design supply

**Instrument Sans**, designed by Rodrigo Fuenzalida and Jordan Egstad / Instrument, is bundled unmodified from the official [Google Fonts directory](https://github.com/google/fonts/tree/main/ofl/instrumentsans). Its official [metadata](https://github.com/google/fonts/blob/main/ofl/instrumentsans/METADATA.pb) names `InstrumentSans[wdth,wght].ttf` and the OFL license. The [upstream repository](https://github.com/Instrument/instrument-sans) is linked by that metadata.

The local binary is `dist/assets/InstrumentSans.ttf`, 194,336 bytes, SHA-256 `b24f1812584816958afcf22e22d08e44318c5e51651e25d2438efdde389b33b1`. The complete copyright and SIL OFL 1.1 notice is retained as [InstrumentSans-OFL.txt](../dist/assets/InstrumentSans-OFL.txt). It is served locally, works with vanilla HTML/CSS/JavaScript and adds no runtime font-service request or subscription.

Behance displays **All Rights Reserved**. No gallery artwork, screenshot, device image, brand, logo, source file or UI code is included in QuoteLens. The paper layout, coral lens icon, line art and interaction code are original project work under the repository's MIT license. No designer was contacted, no private materials were uploaded and no purchase was made. A gallery reference is not a reuse license.

## Superseded and unselected references

- **REDLINE**, the unselected study, drew on [Redford Fintech SaaS Platform — Dashboard, UX UI Design](https://www.behance.net/gallery/246302949/Redford-Fintech-SaaS-Platform-Dashboard-UX-UI-Design) by Denys K. / Denys Khimchenko. Its dark/red cockpit and Archivo type are not the selected production direction. Redford's finance/traffic charts, coins, claims and branding were not copied.
- The former task-first navy/blue interface used [Ramp purchasing-record details](https://support.ramp.com/purchases-orders-in-ramp/#po-overview) and [Cosmos Studio's Ply procurement design](https://www.cosmos.studio/projects/ply-procurement-saas-design) as hierarchy references. It used Adobe Source Sans 3; its binary and complete OFL notice remain historical assets. [Its browser record](evidence/TASK-FIRST-UI-QA.md) describes that earlier appearance.
- Earlier Cosmos elements [1795378467](https://www.cosmos.so/e/1795378467) and [1312667708](https://www.cosmos.so/e/1312667708) informed the superseded Swiss/Georgia ledger. [Its browser record](evidence/COSMOS-REDESIGN-QA.md) retains the original screenshots and workflow scope.
- [Lifemed Web & Motion](https://www.behance.net/gallery/252323471/Lifemed-Web-Motion) informed the earlier glass design. The generated glass image, Manrope and Three.js files remain with their original notices; the active interface does not load that scene.

See [current design decisions](DESIGN.md), [asset provenance](../dist/assets/SOURCES.md) and [current integrated checks](evidence/SELECTED-DESIGN-QA.md). Design references and internal verification do not establish real user demand or commercial results.
