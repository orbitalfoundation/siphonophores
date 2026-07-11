import * as THREE from 'three';
import { TAU, superRadius, lerp } from '../core/math.js';

// The non-bell zooids and structures, each returned as a BufferGeometry in a local
// frame (long axis +Z, apex at origin) so the rig can seat it on the stem with a
// single quaternion. Contraction attribute `aContract` is written where relevant
// so the shared gel material's pulse term has something to grab; static parts set
// it to a constant.

// Pneumatophore — a gas float. An ellipsoid, optionally drawn to a point at the
// apex (apex→1) and given a Physalia sail crest.
export function buildFloat(float, scale) {
  const L = float.length * scale * 6.0;
  const W = float.width * scale * 6.0;
  const segU = 24, segA = 24;
  const geo = new THREE.SphereGeometry(1, segA, segU);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Sphere → prolate ellipsoid along Y (the float long axis), tapered to a
    // point at the top by `apex`.
    const t = (y + 1) * 0.5; // 0 bottom .. 1 top
    const taper = lerp(1.0, 1.0 - float.apex * 0.85, t);
    pos.setXYZ(i, x * W * 0.5 * taper, y * L * 0.5, z * W * 0.5 * taper);
  }
  geo.computeVertexNormals();
  return geo;
}

// Physalia's sail: a tall thin crest riding the top of the float, an arc with a
// scalloped upper edge.
export function buildCrest(float, scale) {
  const L = float.length * scale * 6.0;
  const H = float.crest * L * 0.55;
  const seg = 40;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const x = (u - 0.5) * L * 0.9;
    const base = Math.sin(u * Math.PI) * 0.12 * L; // sit on the float dome
    const top = base + Math.sin(u * Math.PI) * H * (0.7 + 0.3 * Math.sin(u * Math.PI * 5.0));
    pos.push(x, base, 0, x, top, 0);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Gastrozooid — a feeding polyp: a teardrop (rounded top, tapered mouth) along +Z.
export function buildGastrozooid(size, scale) {
  const r = size * scale * 6.0;
  const segU = 12, segA = 12;
  const geo = new THREE.SphereGeometry(1, segA, segU);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (y + 1) * 0.5;
    const taper = lerp(0.35, 1.0, t); // narrow at the mouth (bottom)
    pos.setXYZ(i, x * r * taper, (y * 0.5 + 0.5) * r * 3.0, z * r * taper);
  }
  geo.computeVertexNormals();
  return geo;
}

// Bract — a transparent protective scale: a flattened, pointed gel shard that
// shingles over the stem. Superellipse outline, thin in Z, tapered to a tip.
export function buildBract(size, facets, scale) {
  const r = size * scale * 6.0;
  const segA = 16, segL = 6;
  const pos = [];
  const contract = [];
  const idx = [];
  // A leaf: a spine from base (z=0) to tip (z=len), with a superelliptical width
  // profile, given slight thickness in the local Y.
  const len = r * 2.4;
  for (let iu = 0; iu <= segL; iu++) {
    const u = iu / segL;
    const width = r * Math.sin(u * Math.PI) * superRadius(Math.PI * 0.5, facets);
    for (let it = 0; it < segA; it++) {
      const a = (it / segA) * TAU;
      pos.push(Math.cos(a) * width, Math.sin(a) * width * 0.28, u * len);
      contract.push(u);
    }
  }
  for (let iu = 0; iu < segL; iu++) {
    const r0 = iu * segA, r1 = (iu + 1) * segA;
    for (let it = 0; it < segA; it++) {
      const a = r0 + it, b = r0 + ((it + 1) % segA);
      const c = r1 + it, d = r1 + ((it + 1) % segA);
      idx.push(a, d, b, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('aContract', new THREE.BufferAttribute(new Float32Array(contract), 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// A tentacle with side-branch tentilla, built as a single line geometry (cheap,
// and additive lines read as glowing threads). Returns { line: positions for a
// LineSegments, lures: Vector3[] terminal lure points }.
export function buildTentacle(tent, scale, rand) {
  const L = tent.length * scale * 6.0;
  const segs = 60;
  const main = [];
  const lures = [];
  // The main filament droops and curls.
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const droop = u * L;
    const curl = Math.sin(u * Math.PI * (1 + tent.curl * 4)) * tent.curl * L * 0.12;
    const sway = Math.cos(u * Math.PI * 2.5) * tent.curl * L * 0.05;
    pts.push(new THREE.Vector3(curl, -droop, sway));
  }
  for (let i = 0; i < segs; i++) { main.push(pts[i], pts[i + 1]); }

  // Tentilla: short side branches at intervals, each tipped with a lure point.
  const n = tent.tentilla;
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n;
    const i = Math.floor(u * segs);
    const base = pts[i];
    const dir = (k % 2 === 0 ? 1 : -1);
    const bl = L * 0.06 * (0.6 + rand());
    const tip = base.clone().add(new THREE.Vector3(dir * bl, -bl * 0.4, (rand() - 0.5) * bl));
    main.push(base, tip);
    if (tent.lure > 0) lures.push(tip);
  }
  return { segments: main, lures };
}
