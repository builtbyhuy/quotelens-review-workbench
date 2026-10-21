# Three.js r180 / npm version 0.180.0

Vendored official browser ES modules. MIT license is preserved in `LICENSE`.

- `three.module.min.js`: https://raw.githubusercontent.com/mrdoob/three.js/r180/build/three.module.min.js
- `three.core.min.js`: https://raw.githubusercontent.com/mrdoob/three.js/r180/build/three.core.min.js
- `RoomEnvironment.js`: https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/environments/RoomEnvironment.js
- `LICENSE`: https://raw.githubusercontent.com/mrdoob/three.js/r180/LICENSE

One packaging change: the RoomEnvironment bare import `from 'three'` is replaced with `from './three.module.min.js'`. This allows ordinary static hosting without an import map or a build tool. The two minified core modules are unchanged upstream bytes. No runtime CDN requests, API keys, accounts, or paid assets are required.
