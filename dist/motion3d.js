/* Live, local Three.js hero studies. No image planes or remote runtime assets. */
const sceneSelector = '[data-motion-scene="quotelens"], [data-motion-scene="pourlab"]';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const instances = new Map();
let enginePromise;

function loadEngine() {
  return enginePromise ||= Promise.all([
    import('./vendor/three/three.module.min.js'),
    import('./vendor/three/RoomEnvironment.js')
  ]).then(([THREE, { RoomEnvironment }]) => ({ THREE, RoomEnvironment }));
}

function makeSheet(THREE, material, index) {
  // A closed, curved sheet with genuine front/back/edge surfaces, not a texture.
  const nx = 24, ny = 30, w = 1.92, h = 2.58, corner = .22, depth = .045;
  const points = [], indices = [], row = nx + 1, faceCount = row * (ny + 1);
  const bend = (x, y) => .34 * Math.sin(x * 2.2 + index * .2) + .21 * Math.sin(y * 1.5 + index * .5) + .12 * x * y;
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j <= ny; j++) {
      const y = (j / ny - .5) * h;
      const dy = Math.max(0, Math.abs(y) - (h / 2 - corner));
      const halfWidth = w / 2 - corner + Math.sqrt(Math.max(0, corner * corner - dy * dy));
      for (let i = 0; i <= nx; i++) {
        const x = (i / nx * 2 - 1) * halfWidth;
        points.push(x, y, bend(x, y) + (side === 0 ? depth / 2 : -depth / 2));
      }
    }
  }
  for (let side = 0; side < 2; side++) {
    const offset = side * faceCount;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = offset + j * row + i, b = a + 1, c = a + row, d = c + 1;
      if (!side) indices.push(a, b, d, a, d, c);
      else indices.push(a, d, b, a, c, d);
    }
  }
  const rim = [];
  for (let i = 0; i <= nx; i++) rim.push(i);
  for (let j = 1; j <= ny; j++) rim.push(j * row + nx);
  for (let i = nx - 1; i >= 0; i--) rim.push(ny * row + i);
  for (let j = ny - 1; j > 0; j--) rim.push(j * row);
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i], b = rim[(i + 1) % rim.length];
    indices.push(a, a + faceCount, b, b, a + faceCount, b + faceCount);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const sheet = new THREE.Group();
  sheet.add(new THREE.Mesh(geometry, material));
  const borderPoints = rim.map(i => new THREE.Vector3(points[i * 3], points[i * 3 + 1], points[i * 3 + 2] - depth / 2));
  const borderCurve = new THREE.CatmullRomCurve3(borderPoints, true, 'centripetal');
  sheet.add(new THREE.Mesh(new THREE.TubeGeometry(borderCurve, 144, .032, 8, true), material));
  // Subtle physical strokes make the abstract pieces read as quote sheets.
  const ink = new THREE.MeshPhysicalMaterial({ color: 0xaaa5cf, roughness: .25, metalness: .2, transparent: true, opacity: .34 });
  for (let line = 0; line < 3; line++) {
    const y = .60 - line * .23, length = line === 2 ? .64 : 1.12;
    const p = Array.from({ length: 12 }, (_, i) => {
      const x = -.57 + i / 11 * length;
      return new THREE.Vector3(x, y, bend(x, y) + depth / 2 + .009);
    });
    sheet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 16, .008, 4, false), ink));
  }
  return sheet;
}

function makeFluid(THREE, material, mobile) {
  class LiquidLoop extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * Math.PI * 2;
      return target.set(1.18 * Math.sin(a) * (1 - .16 * Math.cos(a)), 1.43 * Math.cos(a), .46 * Math.sin(2 * a) + .14 * Math.cos(a));
    }
  }
  const curve = new LiquidLoop(), segments = mobile ? 100 : 168, sides = mobile ? 10 : 16;
  const frames = curve.computeFrenetFrames(segments, true), points = [], normals = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, a = t * Math.PI * 2, p = curve.getPoint(t);
    const radius = .17 + .14 * (1 - Math.cos(a)) / 2 + .055 * Math.sin(a) ** 2;
    for (let j = 0; j <= sides; j++) {
      const v = j / sides * Math.PI * 2;
      const normal = frames.normals[i].clone().multiplyScalar(Math.cos(v)).addScaledVector(frames.binormals[i], Math.sin(v));
      points.push(p.x + radius * normal.x, p.y + radius * normal.y, p.z + radius * normal.z);
      normals.push(normal.x, normal.y, normal.z);
      if (i < segments && j < sides) {
        const k = i * (sides + 1) + j, n = k + sides + 1;
        indices.push(k, k + 1, n, n, k + 1, n + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material));
  const droplet = new THREE.Mesh(new THREE.SphereGeometry(1, mobile ? 24 : 36, mobile ? 20 : 28), material);
  droplet.scale.set(.19, .31, .20);
  droplet.position.set(1.65, .60, .36);
  droplet.rotation.z = -.35;
  group.add(droplet);
  return { group, droplet };
}

function studioEnvironment(THREE, RoomEnvironment, renderer) {
  const room = new RoomEnvironment();
  room.traverse(object => {
    if (object.isMesh && object.material?.isMeshStandardMaterial) object.material.color.set(0x17182a);
  });
  const panels = [
    { color: 0xaaa1ff, p: [-4, 1, 2], s: [2.8, 6, .1] },
    { color: 0x6b77ff, p: [4, 1, -.3], s: [2, 6, .1] },
    { color: 0xffc1da, p: [-1, -1, -4], s: [4, 4, .1] },
    { color: 0xffffff, p: [0, 5, 1], s: [5, .1, 4] },
    { color: 0x5234e4, p: [-2.5, .5, 4], s: [1.4, 6, .1] },
    { color: 0xa291ff, p: [.4, -1, 5], s: [1.8, 4, .1] },
    { color: 0xee7ab6, p: [3.2, .4, 4], s: [1.5, 5, .1] }
  ];
  for (const panel of panels) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...panel.s), new THREE.MeshBasicMaterial({ color: new THREE.Color(panel.color).multiplyScalar(3), toneMapped: false }));
    mesh.position.set(...panel.p);
    room.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, .035);
  room.dispose();
  pmrem.dispose();
  return target;
}

class MotionHero {
  constructor(element) {
    this.element = element;
    this.kind = element.dataset.motionScene;
    this.paused = reducedMotion.matches;
    this.visible = true;
    this.disposed = false;
    this.loading = false;
    this.failed = false;
    this.contextLost = false;
    this.elapsed = 0;
    this.frame = 0;
    this.lastTick = 0;
    this.previousTime = 0;
    this.pointer = { x: 0, y: 0 };
    this.targetPointer = { x: 0, y: 0 };
    this.abort = new AbortController();
    this.button = document.createElement('button');
    this.button.className = 'motion-toggle';
    this.button.type = 'button';
    this.button.style.cssText = 'position:absolute;right:0;bottom:22px;z-index:5;min-height:36px;pointer-events:auto';
    this.button.addEventListener('click', () => { this.paused = !this.paused; this.updateButton(); this.sync(); }, { signal: this.abort.signal });
    element.append(this.button);
    this.updateButton();
    this.onVisibility = () => this.sync();
    document.addEventListener('visibilitychange', this.onVisibility, { signal: this.abort.signal });
    this.onPreference = () => { this.paused = reducedMotion.matches; this.updateButton(); this.sync(); };
    reducedMotion.addEventListener('change', this.onPreference);
    this.intersection = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.sync();
    }, { rootMargin: '30px', threshold: .01 });
    this.intersection.observe(element);
    element.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || this.paused) return;
      const rect = element.getBoundingClientRect();
      this.targetPointer.x = (event.clientX - rect.left) / rect.width - .5;
      this.targetPointer.y = (event.clientY - rect.top) / rect.height - .5;
    }, { passive: true, signal: this.abort.signal });
    element.addEventListener('pointerleave', () => { this.targetPointer.x = 0; this.targetPointer.y = 0; }, { signal: this.abort.signal });
    this.sync();
  }

  updateButton() {
    const label = this.paused ? 'Play motion' : 'Pause motion';
    this.button.textContent = `${this.paused ? '▷' : 'Ⅱ'}  ${label}`;
    this.button.setAttribute('aria-label', label);
    this.button.setAttribute('aria-pressed', String(!this.paused));
    this.element.dataset.motionState = this.paused ? 'paused' : 'playing';
  }

  async init() {
    if (this.loading || this.renderer || this.failed || this.disposed) return;
    this.loading = true;
    try {
      const { THREE, RoomEnvironment } = await loadEngine();
      if (this.disposed) return;
      this.THREE = THREE;
      this.mobile = matchMedia('(max-width: 700px)').matches;
      const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: !this.mobile, alpha: true, powerPreference: 'low-power' });
      renderer.setClearColor(0xffffff, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.mobile ? 1.2 : 1.6));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.24;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.transmissionResolutionScale = this.mobile ? .5 : .75;
      const canvas = renderer.domElement;
      canvas.className = 'motion-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:0';
      this.element.prepend(canvas);
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        this.contextLost = true;
        delete this.element.dataset.motionReady;
        this.element.dataset.motionState = 'context-lost';
        canvas.style.opacity = '0';
        this.sync();
      }, { signal: this.abort.signal });
      canvas.addEventListener('webglcontextrestored', () => {
        this.contextLost = false;
        this.environment?.dispose();
        this.environment = studioEnvironment(THREE, RoomEnvironment, renderer);
        this.scene.environment = this.environment.texture;
        this.resize();
        this.sync();
      }, { signal: this.abort.signal });
      const scene = this.scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);
      this.camera = new THREE.PerspectiveCamera(30, 1, .1, 40);
      this.camera.position.set(0, 0, 12);
      this.environment = studioEnvironment(THREE, RoomEnvironment, renderer);
      scene.environment = this.environment.texture;
      scene.environmentIntensity = 1;
      scene.add(new THREE.AmbientLight(0xffffff, .35));
      const key = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(-3, 4, 6); scene.add(key);
      const rim = new THREE.DirectionalLight(0xa1a7ff, 2.2); rim.position.set(4, 0, -1); scene.add(rim);
      const rose = new THREE.DirectionalLight(0xffc3e0, 1.4); rose.position.set(-3, -2, 3); scene.add(rose);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xf0eaff, metalness: .42, roughness: .045,
        transmission: .62, thickness: this.kind === 'quotelens' ? .30 : .75,
        ior: 1.50, iridescence: 1, iridescenceIOR: 1.45,
        iridescenceThicknessRange: [160, 480], clearcoat: 1, clearcoatRoughness: .04,
        attenuationColor: new THREE.Color(0xb4a5ff), attenuationDistance: 1.2,
        envMapIntensity: 1.4, specularIntensity: 1, dispersion: this.mobile ? 0 : .16
      });
      this.sculpture = new THREE.Group();
      scene.add(this.sculpture);
      if (this.kind === 'quotelens') {
        this.sheets = [0, 1, 2].map(i => {
          const piece = makeSheet(THREE, material.clone(), i);
          this.sculpture.add(piece);
          return piece;
        });
      } else {
        const fluid = makeFluid(THREE, material, this.mobile);
        this.fluid = fluid.group; this.droplet = fluid.droplet;
        this.sculpture.add(fluid.group);
      }
      this.baseMaterial = material;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.element);
      this.resize();
      this.pose(0);
      if (!this.contextLost && !document.hidden && this.visible && !this.paused) this.draw();
      this.sync();
    } catch (error) {
      this.failed = true;
      this.element.dataset.motionState = 'fallback';
      this.button.hidden = true;
      delete this.element.dataset.motionReady;
      this.renderer?.domElement.remove();
      this.renderer?.dispose();
      console.info('Hero uses its static glass fallback: WebGL is unavailable.', error?.message || '');
    } finally { this.loading = false; }
  }

  resize() {
    if (!this.renderer || this.disposed || this.contextLost) return;
    const width = this.element.clientWidth, height = this.element.clientHeight;
    if (!width || !height) return;
    const viewHeight = this.kind === 'quotelens' ? (width < 650 ? 6.7 : 4.8) : (width < 650 ? 4.9 : 4.3);
    const half = viewHeight / 2;
    this.camera.aspect = width / height;
    this.camera.position.z = half / Math.tan(Math.PI / 12);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.element.dataset.motionReady === 'true') this.draw();
  }

  pose(t) {
    const damp = .065;
    this.pointer.x += (this.targetPointer.x - this.pointer.x) * damp;
    this.pointer.y += (this.targetPointer.y - this.pointer.y) * damp;
    if (this.sheets) {
      const spread = .97 + .10 * Math.sin(t * .30);
      this.sculpture.position.y = -.48;
      this.sculpture.rotation.set(-.08 + this.pointer.y * .06, .08 * Math.sin(t * .22) + this.pointer.x * .10, -.08);
      this.sheets.forEach((sheet, i) => {
        const s = i - 1;
        sheet.position.set(s * 1.20 * spread, .10 * Math.sin(t * .38 + i * 1.7) + (i === 1 ? .09 : -.02), i === 1 ? .22 : -.22);
        sheet.rotation.set(.10 * Math.sin(t * .25 + i), s * -.36 + .10 * Math.sin(t * .32 + i), s * -.20 + .045 * Math.sin(t * .34 + i));
      });
    } else if (this.fluid) {
      this.sculpture.position.y = .04;
      this.sculpture.rotation.set(.14 + .09 * Math.sin(t * .30) + this.pointer.y * .08, -.23 + .20 * Math.sin(t * .24) + this.pointer.x * .13, -.42 + .055 * Math.sin(t * .28));
      this.droplet.position.y = .60 + .10 * Math.sin(t * .6);
      this.droplet.rotation.z = -.35 + .08 * Math.sin(t * .42);
    }
    if (this.scene.environmentRotation) this.scene.environmentRotation.y = .08 * Math.sin(t * .2);
  }

  draw() {
    if (this.disposed || this.contextLost) return;
    try {
      this.renderer.render(this.scene, this.camera);
      if (this.renderer.getContext().isContextLost()) return;
      if (!this.renderer.info.render.calls) throw new Error('No scene geometry rendered');
      this.renderer.domElement.style.opacity = '1';
      this.element.dataset.motionReady = 'true';
    } catch (error) {
      this.failed = true;
      this.dispose();
      this.element.dataset.motionState = 'fallback';
      console.info('Hero uses its static glass fallback: the 3D render could not complete.', error?.message || '');
    }
  }

  sync() {
    if (this.disposed || this.failed) return;
    this.element.dataset.motionState = this.contextLost ? 'context-lost' : this.paused ? 'paused' : document.hidden ? 'hidden' : !this.visible ? 'offscreen' : 'playing';
    const run = !this.paused && this.visible && !document.hidden && !this.contextLost;
    if (!run) {
      cancelAnimationFrame(this.frame); this.frame = 0; this.previousTime = 0;
      return;
    }
    if (!this.renderer) { this.init(); return; }
    if (this.frame) return;
    const tick = now => {
      this.frame = requestAnimationFrame(tick);
      const interval = this.mobile ? 1000 / 30 : 1000 / 45;
      if (now - this.lastTick < interval) return;
      this.elapsed += this.previousTime ? Math.min((now - this.previousTime) / 1000, .1) : 0;
      this.previousTime = now; this.lastTick = now;
      this.pose(this.elapsed);
      this.draw();
    };
    this.frame = requestAnimationFrame(tick);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    reducedMotion.removeEventListener('change', this.onPreference);
    this.intersection.disconnect();
    this.resizeObserver?.disconnect();
    const materials = new Set(), geometries = new Set();
    this.scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    this.baseMaterial?.dispose();
    this.environment?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.button.remove();
    delete this.element.dataset.motionReady;
  }
}

function reconcile() {
  for (const [element, instance] of instances) {
    if (!element.isConnected) { instance.dispose(); instances.delete(element); }
  }
  for (const element of document.querySelectorAll(sceneSelector)) {
    if (!instances.has(element)) instances.set(element, new MotionHero(element));
  }
}
let reconcileQueued = false;
const mutation = new MutationObserver(() => {
  if (reconcileQueued) return;
  reconcileQueued = true;
  queueMicrotask(() => { reconcileQueued = false; reconcile(); });
});
mutation.observe(document.body, { childList: true, subtree: true });
reconcile();
window.addEventListener('pagehide', () => {
  mutation.disconnect();
  instances.forEach(instance => instance.dispose());
  instances.clear();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { mutation.observe(document.body, { childList: true, subtree: true }); reconcile(); }
});
