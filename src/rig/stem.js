import * as THREE from 'three';
import { TAU } from '../core/math.js';

// The central stem: a space curve the whole colony is threaded onto. Zooids are
// placed by arclength fraction s ∈ [0,1], apex (float end, top) → tip (bottom).
//
// The shape knobs compose: a gentle lateral `curve` bow, an optional helical
// `coil` (Apolemia winds into a spring), and a gravity `sag` that deepens toward
// the tip. Everything scales with the colony's nominal size.
export class StemCurve extends THREE.Curve {
  constructor(p) {
    super();
    const st = p.stem;
    this.scale = p.scale;
    this.len = st.length * p.scale * 6.0; // colonies are long relative to bell size
    this.curve = st.curve;
    this.coil = st.coil;
    this.coilTurns = st.coilTurns;
    this.sag = st.sag;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const L = this.len;
    // Base: straight column from top (t=0) to bottom (t=1).
    let x = 0;
    let y = (0.5 - t) * L;
    let z = 0;

    // Lateral bow — a single gentle S so it doesn't look rigid.
    x += Math.sin(t * Math.PI) * this.curve * L * 0.25;
    z += Math.sin(t * Math.PI * 2.0) * this.curve * L * 0.06;

    // Helical coil (Apolemia). Radius eases in so the top stays put.
    if (this.coil > 0.0001) {
      const r = this.coil * L * 0.18 * Math.sin(t * Math.PI); // fat in the middle
      const a = t * TAU * this.coilTurns;
      x += Math.cos(a) * r;
      z += Math.sin(a) * r;
    }

    // Gravity sag — pull the lower colony down and slightly in.
    y -= this.sag * L * 0.25 * t * t;

    return target.set(x, y, z);
  }

  // Orthonormal frame at s: tangent (down the stem) plus a stable "side" axis used
  // to place biserial nectophores left/right and to fan bracts around the stem.
  frameAt(s, out = {}) {
    const eps = 1e-3;
    const p0 = this.getPoint(Math.max(0, s - eps));
    const p1 = this.getPoint(Math.min(1, s + eps));
    const tangent = out.tangent || new THREE.Vector3();
    tangent.subVectors(p1, p0).normalize();
    // Side = tangent × world-up, kept stable when tangent ≈ up.
    const up = Math.abs(tangent.y) > 0.99 ? _X : _UP;
    const side = (out.side || new THREE.Vector3()).crossVectors(tangent, up).normalize();
    const normal = (out.normal || new THREE.Vector3()).crossVectors(side, tangent).normalize();
    out.pos = this.getPoint(s, out.pos || new THREE.Vector3());
    out.tangent = tangent;
    out.side = side;
    out.normal = normal;
    return out;
  }
}

const _UP = new THREE.Vector3(0, 1, 0);
const _X = new THREE.Vector3(1, 0, 0);

// A thin translucent tube for the stem itself (mostly hidden by zooids, but it
// reads as the through-line that makes the colony one animal).
export function buildStemTube(curve, p) {
  const r = p.stem.thickness * p.scale;
  const geo = new THREE.TubeGeometry(curve, 120, r, 6, false);
  return geo;
}
