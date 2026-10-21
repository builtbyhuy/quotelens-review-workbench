# Live glass hero

The hero now has a local WebGL scene. It does not rotate, warp, or map the fallback PNG onto a plane. Three.js r180 / 0.180.0 is pinned inside `dist/vendor/three/` with its MIT license and source URLs. `motion3d.js` is identical in QuoteLens and PourLab; the `data-motion-scene` value chooses the sculpture.

## Scenes and material

- QuoteLens: three closed, curved quote sheets. Each has front/back surfaces, a physical rounded perimeter, and three shallow document strokes. Their positions and angles slowly converge and splay.
- PourLab: a closed tapered tube following a three dimensional liquid loop, plus a separate volumetric droplet. Both have real depth. This is an art directed sculpture, not a fluid simulation.
- Both use `MeshPhysicalMaterial` with transmission, thickness, refraction, iridescence, clearcoat, and studio environment reflections. A locally generated `RoomEnvironment` plus lavender/cobalt/rose reflector cards is processed through `PMREMGenerator`. The sculptures and reflection direction move over time, so the highlights are recomputed. Desktop has a small dispersion effect.
- Perspective projection, long focal framing, slow bounded rotations, and a restrained pointer response preserve the black hero text. There is no full spin, zoom loop, scroll lock, or animated CTA.

The intended result is glossy iridescent glass in the existing white/black Manrope design. The shader is an approximation; the fallback asset remains a different, pre-rendered artwork. This module does not claim path tracing, caustics, fluid dynamics, or photoreal equivalence to the PNG.

## Integration contract

1. Add `data-motion-scene="quotelens"` or `data-motion-scene="pourlab"` to the existing positioned hero section.
2. Import `./motion3d.js` as an ES module, after the document body exists.
3. Keep the existing `.hero-art` fallback. The renderer adds an absolutely positioned `.motion-canvas` and a normal `.motion-toggle` button.
4. Hide `.hero-art` only while the hero has `[data-motion-ready="true"]`. This attribute is set after geometry has rendered. The canvas is decorative and has `aria-hidden="true"`; the original heading and links remain ordinary DOM elements.
5. Style the pause button for the layout. Its inline default is right 0 / bottom 22px; stylesheet rules can override those placement values with `!important` where needed.

The module observes DOM child changes because QuoteLens recreates its welcome screen inside `#app`. Disconnected heroes are disposed; newly mounted heroes get one new scene and one control. It does not alter application state, saved workspaces, solver logic, or the other page content.

## User control and fallback

- Default autoplay is disabled when `prefers-reduced-motion: reduce` is active. Those visitors initially retain the static artwork and see a Play motion button. Clicking Play explicitly opts into the live scene.
- The keyboard accessible button toggles Play motion / Pause motion and exposes its state through `aria-pressed`. Pausing freezes the rendered scene. Focus behavior stays native.
- Motion suspends when the hero is offscreen or the document is hidden. The time accumulator resumes without a large jump. `data-motion-state` reports `playing`, `paused`, `hidden`, `offscreen`, `context-lost`, or `fallback`.
- Failed module loading, unavailable WebGL, or render failure preserves the original PNG. A lost WebGL context also restores that fallback while the scene waits for a context restore. No failure UI blocks the app.
- Disposal cancels animation callbacks and observers, removes event listeners and the canvas/control, and disposes geometry, material, environment texture, and renderer resources. Page hide and back/forward cache restoration are handled.

## Cost limits

No packages are loaded from the network at runtime. The engine loads lazily once playback is wanted; reduced-motion defaults do not load Three.js. Rendering uses one canvas per mounted hero, no post-processing chain, and no shadow maps. Pixel ratio is capped at 1.6 on desktop and 1.2 on narrow screens. Narrow screens use fewer fluid segments, no dispersion or antialiasing, and a smaller transmission render target. Animation scheduling targets a maximum of 45 draws/second on desktop and 30 on narrow screens. These are configured limits, not measured FPS claims or device benchmarks.

## Verification

The implementation was checked for valid module syntax and served locally with the pinned modules. Initial automated browser checks confirmed both scenes render geometry, pause/resume, reduced-motion static default (zero canvases before opt-in), explicit opt-in playback, and responsive resize. The only test resource warning was the scratch page's missing favicon. Temporary loopback port 8773 was stopped after those checks.

Final integration and visual acceptance must be inspected in the actual pages through Codex computer-use tools. Static source checks or the scratch preview do not establish public deployment, mobile device performance, or acceptance of the visual finish. Review the black heading contrast and pause-button placement at desktop/mobile sizes after integration.

Official primary references used: [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html), [RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html), [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html). The implementation follows the local design-motion-principles method for restrained, pausable, reduced-motion-aware ambient motion.

## Integrated acceptance

Actual CUA review, mobile layout and recorded live geometry are now documented in [MOTION-ACCEPTANCE.md](MOTION-ACCEPTANCE.md); independent regression/control/lifecycle checks are in [MOTION-QA.md](MOTION-QA.md). See [the actual live browser recording](evidence/motion.gif), [desktop](evidence/motion-desktop.jpg) and [390px mobile](evidence/motion-mobile.jpg). The unit checks do not establish visual acceptance or mobile hardware performance.
