import * as THREE from 'three';
import { TAU, superRadius, smoothstep, lerp } from '../core/math.js';

// A nectophore (swimming bell): a hollow medusoid thimble, closed at the apex and
// open at the mouth (ostium/velum). It's a parametric surface of revolution whose
// cross-section is a superellipse — round (facets≈2, physonects) through prismatic
// (facets≈6, calycophore Diphyids) — with subtle longitudinal ridges.
//
// Local frame: apex at the origin, bell axis along +Z, mouth ring at z=height.
// A per-vertex `aContract` attribute (0 at apex → 1 at mouth) lets the vertex
// shader squeeze the mouth more than the apex when the bell pulses, so it jets
// like the real thing instead of scaling uniformly.
export function buildBellGeometry(bell, segU = 20, segA = 28) {
  const { height, radius, apex, facets, mouth } = bell;
  const rings = segU + 1;
  const cols = segA;
  const vertCount = rings * cols + 1; // +1 apex pole

  const pos = new Float32Array(vertCount * 3);
  const contract = new Float32Array(vertCount);
  const uv = new Float32Array(vertCount * 2);

  // Apex pole vertex.
  pos[0] = 0; pos[1] = 0; pos[2] = 0;
  contract[0] = 0;
  uv[0] = 0.5; uv[1] = 0;

  let v = 1;
  for (let iu = 0; iu <= segU; iu++) {
    const u = iu / segU; // 0 apex .. 1 mouth
    const z = height * radius * 3.0 * u; // height expressed relative to radius
    // Radius profile: rounded shoulder near apex, widening to the margin, then a
    // slight inward curl at the mouth (the velar constriction).
    let r = radius * Math.pow(u, apex);
    r *= lerp(1.0, mouth, smoothstep(0.72, 1.0, u));
    for (let it = 0; it < cols; it++) {
      const theta = (it / cols) * TAU;
      // Superellipse cross-section + faint ridges for faceted bells.
      let sr = superRadius(theta, facets);
      if (facets > 2.2) sr *= 1 + 0.06 * Math.cos(theta * Math.round(facets));
      const rr = r * sr;
      pos[v * 3] = rr * Math.cos(theta);
      pos[v * 3 + 1] = rr * Math.sin(theta);
      pos[v * 3 + 2] = z;
      contract[v] = u;
      uv[v * 2] = it / cols;
      uv[v * 2 + 1] = u;
      v++;
    }
  }

  // Indices. Apex fan, then quad grid between rings.
  const idx = [];
  for (let it = 0; it < cols; it++) {
    const a = 1 + it;
    const b = 1 + ((it + 1) % cols);
    idx.push(0, b, a);
  }
  for (let iu = 0; iu < segU; iu++) {
    const row0 = 1 + iu * cols;
    const row1 = 1 + (iu + 1) * cols;
    for (let it = 0; it < cols; it++) {
      const a = row0 + it;
      const b = row0 + ((it + 1) % cols);
      const c = row1 + it;
      const d = row1 + ((it + 1) % cols);
      idx.push(a, d, b);
      idx.push(a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aContract', new THREE.BufferAttribute(contract, 1));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
