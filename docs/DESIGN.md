# QuoteLens — current interface direction

Updated 21 October 2026 after the user rejected QuoteLens and PourLab sharing a visual language. This decision supersedes the earlier Lifemed white/glass direction for QuoteLens.

## A Swiss editorial purchasing ledger

QuoteLens treats the working record itself as the visual subject: request, source-backed offers, actual whole-pack cost and the reviewed revision. The home page is an asymmetric editorial introduction beside an original, explicitly fictional offer calculation, followed by actual device-local workspaces as disciplined ledger rows. It is not a generic marketing hero or an abstract material sculpture.

The app uses a persistent workbench rail on desktop, a compact navigation strip on mobile, numbered horizontal workflow tabs and a separate decision-summary column. Workspace context remains visible beside the current stage. Request, offers, decision, history, dialogs, guide and case study share this system. Existing item IDs, input names, actions, core calculations, IndexedDB storage and revision-specific receipts are preserved.

## Type, color and composition

- Georgia / Times New Roman: editorial display and key record headings. Italic emphasis is selective, rather than a second decorative identity.
- Arial / Helvetica: compact controls, explanatory text and operational facts.
- Consolas / Liberation Mono: folio labels, dates, revision, units and exact tabular money.
- Warm paper `#f5f3ec`, graphite `#262820`, quiet metadata `#6b6c61`, rule `#d7d7ca`, working sheet `#fdfcf7`, functional ochre/orange `#aa431d`.
- Sharp dividers and square controls. No gradients, pill navigation, glass objects or ambient 3D canvas.
- Wide editorial hierarchy resolves into denser tables and source fields. Tables retain contained horizontal overflow on narrow screens; surrounding navigation and forms reflow.

All active fonts are system stacks; no font service, new asset license, dependency, purchase or remote design-code request is required. There is no gallery artwork or code in the implementation.

## Inspected professional references

See [DESIGN-SOURCES.md](DESIGN-SOURCES.md) for the source-to-decision map. The selected Cosmos grid study supplies disciplined asymmetric columns and small metadata; the works index supplies aligned records, repeated rules and folio rhythm. Ply remains the earlier purchasing-workflow research reference. The two Cosmos references are visual composition references, not evidence of procurement demand.

## Motion with a purpose

The active `dist/interface-motion.js` gives brief view feedback after a user changes a workflow stage, draws attention to a recomputed selected total, and opens source/review dialogs with a short settling transition. Explicit stage navigation focuses the workspace heading and immediately returns it to view; persistence acknowledgments and note editing never change scroll or focus. The method rows receive one-time entry feedback. These run through the Web Animations API and CSS control transitions, with no artificial calculation delay and no continuous ambient animation. Keyboard interaction suppresses reveal motion; `prefers-reduced-motion: reduce` disables/cancels visual animation. Because nothing loops continuously, no pause button is required. This replaces the earlier glass motion system on the active page.

The former `style.css`, `motion.css`, `motion3d.js`, generated PNG, Manrope font and Three.js files are retained only as historical implementation/assets with their source and license notices. Earlier `MOTION-*` documents and recordings describe that superseded glass version; they do not establish acceptance of this ledger redesign.

## Verification boundary

The existing calculation/persistence checks remain the behavioral baseline. Root-level integration review owns current desktop/mobile browser checks, published screenshots and final product acceptance. A test pass establishes only its checked behavior, not user adoption or recruiter preference.
