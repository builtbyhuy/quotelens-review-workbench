# Motion QA — QuoteLens and PourLab

Date: 21 October 2026. Scope: local motion upgrade, preserving each existing app and its data contracts. This record distinguishes source review, automated regression checks and actual rendered observations. No deployment or customer acceptance is established by these checks.

## Acceptance criteria

| Requirement | Concrete check |
| --- | --- |
| Real motion | Inspect separated rendered moments and source: changing geometry/camera/light or genuinely changing frames. A single image bobbing, tilting or fading is insufficient for the requested animated glass. |
| White/black/glass direction | Clear white gallery surface, readable black text, controlled iridescent glass; inspect composition rather than infer quality from library choice. |
| Readability | Desktop and 390px mobile keep heading, explanation, CTA and pause control unobstructed at all observed frames. No horizontal document overflow. |
| Motion control | Keyboard-operable hero pause/play is separate from PourLab solution playback. Reduced motion suppresses autonomous movement, including pointer parallax. |
| Bounded work | Offscreen and hidden scenes stop continuous frames; remounts dispose obsolete loops, observers, listeners, GPU resources and canvases. |
| Responsive feedback | User actions update state immediately; repeated actions retarget/cancel motion. Typing and keyboard workflows do not replay decorative entrance effects. |
| Input integrity | QuoteLens note typing survives delayed writes and blur/review; PourLab board focus survives re-render and level name is not overwritten during typing. |
| Existing behavior | Retain QuoteLens exact totals, selection, revision approval and IndexedDB/exports; retain PourLab legal moves, Undo/Reset, worker cancellation, solution replay and portable/local levels. |
| Honest evidence | Automated checks establish their covered logic only. Visual craft, frame smoothness and accessibility require rendered evidence; no invented FPS or device claims. |

## Source risk map before motion changes

- QuoteLens `dist/app.js`: `render()` replaces all `#app` markup. Scene lifecycle must handle home → workspace → Overview without duplicate canvases or loops. Storage acknowledgement must remain an indicator-only update, not a render.
- QuoteLens `persist()` serializes snapshots; `{refresh:false}` on note change and explicit `save-note` protect the draft, clicked review control and exact revision/fingerprint. Motion hooks must not alter those boundaries.
- PourLab `dist/app.js`: `renderBoard()` replaces board children and restores focus via `data-slot`/`data-bottle`. Any transition must preserve these handlers and that focus restoration.
- PourLab `changed()`/`invalidate()` terminate search and playback; changes make prior solver results stale. Motion must not delay state or replay a superseded board after rapid Next/Previous/slider/Undo.
- PourLab `level-name` persists on input without a full render. Keep that behavior. Hero pause is not the solution Play/Pause state.
- Inspect same-origin runtime assets, fallback, reduced-motion and offscreen behavior after integration. Engine and storage source review alone cannot establish these runtime behaviors.

## Automated regression results

Ran both existing suites after the stable interface integration using the bundled Node runtime:

| App | Result | Covered behavior |
| --- | --- | --- |
| QuoteLens | 27 passed, 0 failed | 23 core checks plus four UI persistence regressions: exact money, pack/MOQ/line fees, CSV/source preservation, eligibility, revision receipts, hostile backup rejection, delayed writes, note saving, serialized snapshots and selected-offer warning scope. |
| PourLab | 8 passed, 0 failed | Legal maximal pours, immutable transitions, validation/budgets, exhaustive small arrangements against an independent labeled BFS oracle, novel seeded levels, replay and portable JSON/share links. |

These checks do not establish visual quality, frame rate, full keyboard acceptance or production readiness.

## Independent CUA observations

Used separate local preview tabs at `http://127.0.0.1:8770/` and `http://127.0.0.1:8771/`. Preserved the pre-existing synthetic workspaces and saved level; no decision, level, library or export data was edited.

- Both homes mounted one live WebGL canvas and one motion control. Source uses actual closed curved sheet meshes for QuoteLens and a tapered volumetric loop plus droplet for PourLab, with physical transmission/iridescence; no image planes.
- On both apps, emulating reduced motion during a live scene changed the scene to `paused` and the accessible control to **Play motion**. Reloading under reduced motion mounted no canvas and retained the static fallback. Keyboard **Enter** explicitly opted into live motion; **Space** paused it. Temporary preference overrides were restored.
- Three QuoteLens home → existing workspace → home cycles produced canvas counts `1 → 0 → 1` each time. Returned homes had exactly one scene and one toggle. This verifies rendered mount/unmount behavior; GPU allocation totals were not measured.
- Both scenes reported `offscreen` when fully outside their observer margin: observed hero bottom was −65px for QuoteLens and −148px for PourLab. Source cancels the frame request in this state. No measured FPS claim is made.
- No warning/error entries appeared in the owned local preview tabs during these checks.
- Hidden-document sleep, context loss and bfcache resource cleanup are present in the source. This independent pass did not force GPU context loss, instrument frame requests or inspect heap retention.
- Root implementation owner owns the final desktop/mobile screenshots, separated-frame motion proof and puzzle pour visual review. Those results are distinct from this independent control/lifecycle check.

## Motion review findings

| Before | After | Why |
| --- | --- | --- |
| Static generated hero images in the original builds | Actual volumetric WebGL scenes, with fallback retained | Satisfies the real-geometry implementation requirement; final composition and movement are reviewed separately in rendered evidence. |
| QuoteLens reveal observer retained detached offscreen workflow panels after home replacement | Implementation owner added an observed Set, prunes disconnected targets, removes revealed targets and disconnects on pagehide | Prevents repeated home/workspace trips retaining obsolete observed panels. Fix inspected at `QuoteLens/dist/interface-motion.js:16–35`. |

Verdict: **Approve the independently checked controls, local scene lifecycle and covered functional regressions.** No unresolved functional blocker found in this scope. Final visual/mobile approval remains with the root's rendered review; these checks do not certify the requested aesthetic or smoothness on other devices.
