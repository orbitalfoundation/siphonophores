import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

import { makeSpecies, SPECIES_ORDER, SPECIES_LABELS } from './species/presets.js';
import { SiphonophoreRig } from './rig/SiphonophoreRig.js';
import { buildEnvironment, buildMarineSnow } from './scene/environment.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.001, 4000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotateSpeed = 0.5;
controls.minDistance = 0.02;
controls.maxDistance = 2000;

const env = buildEnvironment(scene, renderer);
const snow = buildMarineSnow(scene);

let params = makeSpecies('nanomia');
let rig = null;
let currentSpecies = 'nanomia';

function frameCamera(preserve = false) {
  // A colony is tall and thin: frame so its full vertical extent fits with margin.
  // rig.span is the stem length ≈ vertical extent; centre the view on its middle.
  const s = rig.span;
  const centreY = rig.centreY ?? 0;
  const halfV = Math.tan((camera.fov * Math.PI) / 180 / 2);
  const dist = (s * 0.5) / halfV * 1.18 + s * 0.05;
  if (!preserve) {
    camera.position.set(s * 0.28, centreY + s * 0.04, dist);
    controls.target.set(0, centreY, 0);
  } else {
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1);
    dir.normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
  }
  camera.near = Math.max(0.001, s * 0.004);
  camera.far = s * 200 + 50;
  camera.updateProjectionMatrix();
  env.setScale(s);
  snow.setScale(s);
}

function rebuild(preserveCamera = true) {
  if (rig) { scene.remove(rig); rig.dispose(); }
  rig = new SiphonophoreRig(params);
  scene.add(rig);
  frameCamera(preserveCamera);
  updateLabels();
}

function updateLabels() {
  document.getElementById('species-name').textContent = params.displayName;
  document.getElementById('mode-line').textContent =
    `${params.suborder} · ${params.nectosome.arrangement === 'none' ? 'no bells' : params.nectosome.count + ' bells'}`;
}

// ---- GUI ---------------------------------------------------------------------
const ui = { blendTo: 'physophora', autoRotate: false, paused: false, showSnow: true };

const gui = new GUI({ title: '🪼 siphonophore' });
gui.domElement.id = 'gui-panel';
if (gui.$title) gui.$title.style.display = 'none';

function setSpecies(id) {
  currentSpecies = id;
  params = makeSpecies(id);
  rebuild(false);
  highlightSpecies(id);
  refreshControllers();
}

const fExplore = gui.addFolder('explore');
const speciesChips = {};
function highlightSpecies(id) {
  for (const k in speciesChips) speciesChips[k].classList.toggle('active', k === id);
}
(function buildSpeciesChips() {
  const bar = document.createElement('div');
  bar.className = 'species-chips';
  for (const id of SPECIES_ORDER) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = SPECIES_LABELS[id] || id;
    b.addEventListener('click', () => setSpecies(id));
    speciesChips[id] = b;
    bar.appendChild(b);
  }
  const container = fExplore.$children || fExplore.domElement;
  container.insertBefore(bar, container.firstChild);
})();

// -- Colony structure (rebuilds)
const fCol = gui.addFolder('colony');
const rb = () => rebuild(true);
fCol.add(params, 'scale', 0.01, 6, 0.01).name('size (m)').listen().onChange(rb);
fCol.add(params.stem, 'length', 0.3, 2.0, 0.01).name('stem length').listen().onChange(rb);
fCol.add(params.stem, 'curve', 0, 0.5, 0.01).name('stem bow').listen().onChange(rb);
fCol.add(params.stem, 'coil', 0, 1.2, 0.01).name('coil (Apolemia)').listen().onChange(rb);
fCol.add(params.stem, 'sag', 0, 0.6, 0.01).name('sag').listen().onChange(rb);
fCol.close();

const fNect = gui.addFolder('nectosome (swimming bells)');
fNect.add(params.nectosome, 'count', 0, 24, 1).name('bell count').listen().onChange(rb);
fNect.add(params.nectosome, 'arrangement', ['biserial', 'spiral', 'single', 'none']).name('arrangement').listen().onChange(rb);
fNect.add(params.nectosome, 'span', 0.05, 0.6, 0.01).name('column length').listen().onChange(rb);
fNect.add(params.nectosome.bell, 'facets', 2, 7, 0.1).name('bell facets (round↔prism)').listen().onChange(rb);
fNect.add(params.nectosome.bell, 'apex', 0.3, 1.0, 0.01).name('bell apex').listen().onChange(rb);
fNect.add(params.nectosome.bell, 'tilt', 0, 1.2, 0.01).name('bell tilt').listen().onChange(rb);
fNect.add(params.nectosome.pulse, 'freq', 0.2, 3, 0.05).name('pulse rate (Hz)').listen();
fNect.add(params.nectosome.pulse, 'amp', 0, 0.8, 0.01).name('pulse depth').listen();
fNect.add(params.nectosome.pulse, 'metachrony', 0, 1.5, 0.01).name('metachronal wave').listen();
fNect.close();

const fSiph = gui.addFolder('siphosome (feeding)');
fSiph.add(params.siphosome, 'cormidia', 1, 50, 1).name('cormidia').listen().onChange(rb);
fSiph.add(params.siphosome.tentacle, 'length', 0, 2, 0.01).name('tentacle length').listen().onChange(rb);
fSiph.add(params.siphosome.tentacle, 'tentilla', 0, 16, 1).name('tentilla').listen().onChange(rb);
fSiph.add(params.siphosome.tentacle, 'lure', 0, 1, 0.01).name('bioluminescent lure').listen().onChange(rb);
fSiph.add(params.siphosome.palpon, 'skirt', 0, 1, 0.01).name('palpon skirt').listen().onChange(rb);
fSiph.add(params.siphosome.bract, 'count', 0, 44, 1).name('bracts').listen().onChange(rb);
fSiph.close();

const fFloat = gui.addFolder('float');
fFloat.add(params.float, 'present').name('has float').listen().onChange(rb);
fFloat.add(params.float, 'length', 0.02, 0.6, 0.01).name('float length').listen().onChange(rb);
fFloat.add(params.float, 'crest', 0, 1, 0.01).name('sail crest').listen().onChange(rb);
fFloat.addColor(params.float, 'color').name('float colour').listen().onChange(rb);
fFloat.close();

const fLook = gui.addFolder('appearance');
fLook.addColor(params.gel, 'tint').name('gel tint').listen().onChange(rb);
fLook.add(params.gel, 'rim', 0, 2, 0.01).name('rim glow').listen().onChange(rb);
fLook.add(params.gel, 'interior', 0, 0.6, 0.01).name('interior fill').listen().onChange(rb);
fLook.add(params.gel, 'iridescence', 0, 1, 0.01).name('iridescence').listen().onChange(rb);
fLook.add(params.biolum, 'intensity', 0, 0.5, 0.01).name('bioluminescence').listen().onChange(rb);
fLook.addColor(params.biolum, 'color').name('biolum colour').listen().onChange(rb);
fLook.close();

const fScene = gui.addFolder('scene');
fScene.add(ui, 'autoRotate').name('auto-rotate').onChange((v) => (controls.autoRotate = v));
fScene.add(ui, 'paused').name('pause');
fScene.add(ui, 'showSnow').name('marine snow').onChange((v) => (snow.points.visible = v));
fScene.add({ reset: () => frameCamera(false) }, 'reset').name('reset camera');
fScene.close();

function refreshControllers() {
  for (const c of gui.controllersRecursive()) c.updateDisplay();
}

// Pull-up panel (same pattern as the fish project).
const panelTab = document.getElementById('panel-tab');
gui.domElement.addEventListener('click', (e) => e.stopPropagation());
panelTab?.addEventListener('click', () => document.body.classList.toggle('panel-open'));
if (innerWidth > 560) document.body.classList.add('panel-open');

// ---- boot --------------------------------------------------------------------
rebuild(false);
highlightSpecies(currentSpecies);
refreshControllers();
document.getElementById('loader').style.opacity = '0';
setTimeout(() => document.getElementById('loader')?.remove(), 700);

const clock = new THREE.Clock();
const hud = document.getElementById('hud');
let frames = 0, fpsT = 0, fps = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!ui.paused) rig.update(dt);
  snow.update(dt);
  env.update(clock.elapsedTime, camera);
  controls.update();
  renderer.render(scene, camera);

  frames++; fpsT += dt;
  if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
  hud.textContent = `${params.id}  ·  ${params.suborder}  ·  ${fps} fps`;
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.SIPHO = { get params() { return params; }, rig: () => rig, setSpecies };
