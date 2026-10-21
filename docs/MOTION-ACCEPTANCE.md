# Integrated motion acceptance — 21 October 2026

This is an observed browser check, separate from user research and visual preference approval.

- Actual CUA-controlled browser inspection at a 1265×712 desktop viewport and an emulated 390×844 viewport. QuoteLens quote sheets and PourLab liquid sculpture render as real geometry with changing reflections; the original PNG hides only after a successful render. Text/actions remain ordinary readable DOM content.
- Both mobile documents measured scrollWidth = clientWidth = 390. Saved full-page and viewport screenshots were inspected. The approved white/black Manrope direction is retained. Mobile emulation is not a physical-device performance benchmark.
- QuoteLens capture: 80 real CDP screencast JPEG frames over 5.470 seconds. PourLab capture: 83 real frames over 5.453 seconds. JSON files preserve original browser timestamps. GIFs encode every second captured frame and preserve that elapsed timing; GIF dimensions/compression do not imply rendered FPS. These are recordings of actual browser output, not generated animations.
- A legal manual pour changed bottle 1 from [0,1,2] to [0,1] and bottle 4 from [] to [2]. A single visual trace was observed while the game already reported one pour; focus remained on bottle 4. Captured separately in pourframes.json/JPEG frames.
- Undo restored the starting level. Actual A* solved the custom three-color capacity-three arrangement in seven pours / 48 discovered states. Next, Next, Previous returned to 1/7 with one trace and focus on Previous. No visual queue blocked input.
- Mobile illegal pour from full bottle 1 to full bottle 2 produced the actual legal-pour error, kept zero pours, retained the source selection and created zero traces.
- Independent test/control/lifecycle evidence is in QA.md: QuoteLens 27/27, PourLab 8/8, reduced-motion startup/opt-in/keyboard pause, offscreen suspension and repeated hero cleanup.

Limitations: no measured GPU/memory budget, physical mobile performance, forced context loss, fluid physics, exhaustive browser compatibility, full accessibility audit or customer acceptance. Hero motion is an art-directed sculpture. The gameplay trace explains actual state changes; it is not a fluid simulation.
