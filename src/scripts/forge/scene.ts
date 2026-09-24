import {refineObject,weatherArchitecture} from '../rendering/surfaces';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import {cinematicOutput} from '../rendering/finish';

const mount = document.querySelector<HTMLDivElement>('#forge-canvas')!;
const status = document.querySelector<HTMLElement>('#render-status')!;
const loading = document.querySelector<HTMLElement>('#loading')!;
const label = document.querySelector<HTMLElement>('#load-label')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Forge model. Drag to orbit, pinch or scroll to zoom.');
  renderer.domElement.tabIndex = 0;
  const scene = new THREE.Scene();
  const dayBackground = new THREE.Color('#c5c7b6');
  const duskBackground = new THREE.Color('#535f65');
  scene.background = dayBackground.clone();
  scene.fog = new THREE.Fog(dayBackground, 75, 160);
  const camera = new THREE.PerspectiveCamera(36, mount.clientWidth / mount.clientHeight, .1, 180);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.minDistance = 3;
  controls.maxDistance = 75;
  controls.maxPolarAngle = Math.PI * .485;
  controls.minPolarAngle = .16;
  controls.enablePan = true;
  controls.maxTargetRadius = 9;
  controls.cursor.set(0, 1, 0);
  controls.zoomSpeed = .7;
  const hemi = new THREE.HemisphereLight('#e5edf1', '#5b5438', 1.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d5', 3.3);
  sun.position.set(-3, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 12, bottom: -12, near: .5, far: 38 });
  sun.shadow.normalBias = .025;
  sun.shadow.bias = -.0001;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#c6d9e7', 1.15);
  fill.position.set(3, 7, -8);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#b9bfaa', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.55;
  floor.receiveShadow = true;
  scene.add(floor);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // The AO depth pass must not treat transparent smoke billboards as solid walls.
  camera.layers.enable(1);
  const aoCamera = camera.clone();
  aoCamera.layers.set(0);
  const ao = new GTAOPass(scene, aoCamera, mount.clientWidth, mount.clientHeight);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.blendIntensity = .75;
  ao.updateGtaoMaterial({ radius: .32, distanceExponent: 1.8, thickness: .7, scale: 1 });
  composer.addPass(ao);
  composer.addPass(cinematicOutput());

  const fireMaterials: THREE.MeshStandardMaterial[] = [];
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/forge/mushroom-green-forge.glb', (progress) => {
    label.textContent = progress.total ? `Opening the workshop… ${Math.round(progress.loaded / progress.total * 100)}%` : 'Bringing the workshop into view…';
  });
  gltf.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      if (/Leaf|Meadow|Seed/.test(material.name)) material.side = THREE.DoubleSide;
      if (/Live embers/.test(material.name)) fireMaterials.push(material);
      if (material.map) material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (material.normalMap) material.normalMap.anisotropy = 4;
    }
  });
  weatherArchitecture(gltf.scene,0);refineObject(gltf.scene);
  scene.add(gltf.scene);
  const hearthLights = [-3, 0, 3].map(x => {
    const light = new THREE.PointLight('#ff781f', 30, 4.8, 2);
    light.position.set(x, 1.25, 1.35);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.normalBias = .015;
    light.shadow.bias = -.001;
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    scene.add(light);
    return light;
  });

  // Soft smoke sprites: translucent radial falloff, never opaque polygon clumps.
  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = smokeCanvas.height = 128;
  const ctx = smokeCanvas.getContext('2d')!;
  // Overlapping soft wisps make an irregular coal-smoke silhouette.
  for (let i = 0; i < 19; i++) {
    const x = 64 + Math.sin(i * 12.7) * 28;
    const y = 64 + Math.cos(i * 8.3) * 26;
    const radius = 20 + (i % 5) * 3;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(120,119,107,.13)');
    gradient.addColorStop(.45, 'rgba(138,137,124,.06)');
    gradient.addColorStop(1, 'rgba(145,143,130,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const smokeTexture = new THREE.CanvasTexture(smokeCanvas);
  const smoke = Array.from({ length: 60 }, (_, i) => {
    const material = new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, opacity: 0, depthWrite: false, color: '#b8b5a6' });
    const sprite = new THREE.Sprite(material);
    sprite.layers.set(1);
    scene.add(sprite);
    return { sprite, chimney: [-3, 0, 3][i % 3], phase: (i / 60) * 9 };
  });
  // Sparks stay inside the open hearths; restrained motion keeps the scene calm.
  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(36 * 3);
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ color: '#ffbb52', size: .025, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.layers.set(1);
  scene.add(sparks);

  // Always start in play; reduced motion runs at half speed (as in the village). Pause stops it.
  let paused = false;
  let dusk = false;
  let lightAmount = 0;
  let activeView = 'overview';
  let tween: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; target: THREE.Vector3; elapsed: number } | null = null;
  const presets = {
    overview: { position: new THREE.Vector3(14, 11, 18), target: new THREE.Vector3(0, 1.25, 0) },
    roof: { position: new THREE.Vector3(6.8, 8.1, 8.4), target: new THREE.Vector3(0, 3.1, .8) },
    detail: { position: new THREE.Vector3(-7.2, 3.9, 8.8), target: new THREE.Vector3(-1.6, 1.45, 1.6) },
  };
  function view(name: keyof typeof presets, immediate = false) {
    activeView = name;
    document.querySelector<HTMLElement>('#forge-app')!.dataset.view = name;
    const preset = presets[name];
    const pos = preset.position.clone();
    if (name === 'overview' && camera.aspect < 1.15) pos.sub(preset.target).multiplyScalar(1.15 / camera.aspect).add(preset.target);
    if (immediate || reducedMotion) {
      camera.position.copy(pos);
      controls.target.copy(preset.target);
      controls.update();
      tween = null;
    } else tween = { from: camera.position.clone(), to: pos, fromTarget: controls.target.clone(), target: preset.target, elapsed: 0 };
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
  }
  view('overview', true);
  controls.addEventListener('start', () => { tween = null; });
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => view(button.dataset.view as keyof typeof presets)));
  document.querySelector('#reset')!.addEventListener('click', () => { view('overview'); });
  document.querySelector('#light')!.addEventListener('click', () => {
    dusk = !dusk;
    document.querySelector<HTMLElement>('#forge-app')!.dataset.light = dusk ? 'dusk' : 'day';
    document.querySelector('#light')!.setAttribute('aria-pressed', String(dusk));
    document.querySelector('#light span:last-child')!.textContent = dusk ? 'Dusk' : 'Daylight';
  });
  function updatePause() {
    document.querySelector('#motion')!.setAttribute('aria-pressed', String(paused));
    document.querySelector('#motion span:first-child')!.textContent = paused ? '▷' : 'Ⅱ';
    document.querySelector('#motion span:last-child')!.textContent = paused ? 'Play' : 'Pause';
  }
  document.querySelector('#motion')!.addEventListener('click', () => { paused = !paused; updatePause(); });
  updatePause();
  const notes = document.querySelector<HTMLElement>('#note')!;
  function showNotes(open: boolean) {
    notes.hidden = !open;
    document.querySelector('#notes')!.setAttribute('aria-expanded', String(open));
    if (open) document.querySelector<HTMLButtonElement>('#close-note')!.focus();
  }
  document.querySelector('#notes')!.addEventListener('click', () => showNotes(notes.hidden));
  document.querySelector('#close-note')!.addEventListener('click', () => { showNotes(false); document.querySelector<HTMLButtonElement>('#notes')!.focus(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') showNotes(false);
  });
  renderer.domElement.addEventListener('keydown', (event) => {
    if (event.key === 'Home') { event.preventDefault(); view('overview'); }
    if (event.key === '+' || event.key === '=') camera.position.lerp(controls.target, .12);
    if (event.key === '-') camera.position.sub(controls.target).multiplyScalar(1.12).add(controls.target);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), event.key === 'ArrowLeft' ? -.13 : .13);
      camera.position.copy(controls.target).add(delta);
    }
  });
  const resize = () => {
    const width = mount.clientWidth; const height = mount.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
  };
  new ResizeObserver(resize).observe(mount);
  loading.hidden = true;
  status.textContent = 'Forge loaded. Drag to orbit. Use the view buttons to explore.';
  document.documentElement.dataset.forgeReady = 'true';
  let last = performance.now();
  let time = 0;
  let frameCount = 0;
  let elapsed = 0;
  function animate(now: number) {
    const realDelta = (now - last) / 1000;
    const dt = Math.min(realDelta, .05);
    last = now;
    if (!document.hidden) {
      if (!paused) time += dt * (reducedMotion ? .5 : 1);
      if (tween) {
        tween.elapsed += dt;
        const raw = Math.min(tween.elapsed / 1.25, 1); const t = raw * raw * (3 - 2 * raw);
        camera.position.lerpVectors(tween.from, tween.to, t);
        controls.target.lerpVectors(tween.fromTarget, tween.target, t);
        if (raw === 1) tween = null;
      }
      lightAmount = THREE.MathUtils.damp(lightAmount, dusk ? 1 : 0, 3, dt);
      sun.intensity = THREE.MathUtils.lerp(3.3, .45, lightAmount);
      hemi.intensity = THREE.MathUtils.lerp(1.9, .85, lightAmount);
      fill.intensity = THREE.MathUtils.lerp(1.15, .65, lightAmount);
      (scene.background as THREE.Color).lerpColors(dayBackground, duskBackground, lightAmount);
      (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
      for (const [i, light] of hearthLights.entries()) light.intensity = (30 + lightAmount * 22) * (1 + .09 * Math.sin(time * 7 + i) + .045 * Math.sin(time * 13));
      fireMaterials.forEach(material => { material.emissiveIntensity = 4.5 + Math.sin(time * 6) * .7; });
      smoke.forEach(({ sprite, chimney, phase }) => {
        const age = (time * .45 + phase) % 9;
        sprite.position.set(chimney + age * .23 + Math.sin(age * 1.1 + time * .18) * .16, 5.13 + age * .32, 1.3 - age * .08);
        const size = .25 + age * .22;
        sprite.scale.set(size, size * 1.18, 1);
        sprite.material.opacity = Math.sin(age / 9 * Math.PI) * .48;
        sprite.material.rotation = age * .05 + phase;
      });
      for (let i = 0; i < 36; i++) {
        const age = (time * .5 + i * .073) % 1;
        sparkPositions[i * 3] = [-3, 0, 3][i % 3] + Math.sin(i * 7.1) * .26 + age * .07;
        sparkPositions[i * 3 + 1] = 1.07 + age * .5;
        sparkPositions[i * 3 + 2] = 1.56 + Math.cos(i * 3.2) * .13;
      }
      sparkGeometry.attributes.position.needsUpdate = true;
      controls.update();
      aoCamera.copy(camera);
      aoCamera.layers.set(0);
      composer.render();
      frameCount++; elapsed += realDelta;
      if (frameCount % 180 === 0) {
        // Compact local QA signal; no telemetry leaves the page.
        mount.dataset.fps = String(Math.round(frameCount / elapsed));
        mount.dataset.view = activeView;
      }
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    loading.hidden = false;
    label.textContent = 'The graphics context was lost. Reload this page to reopen the forge.';
  });
}
start().catch((error: unknown) => {
  console.error('Could not open the forge', error);
  loading.hidden = false;
  label.textContent = 'The forge could not load. Check WebGL support, then reload this page.';
  loading.querySelector('.loader')?.remove();
  status.textContent = 'Forge loading failed.';
});
