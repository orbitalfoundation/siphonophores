import * as THREE from 'three';
import { StemCurve, buildStemTube } from './stem.js';
import { buildBellGeometry } from './nectophore.js';
import { buildFloat, buildCrest, buildGastrozooid, buildBract, buildTentacle } from './zooids.js';
import { makeGelMaterial, makeFloatMaterial, makeLureMaterial, makeOrganMaterial } from '../shading/GelMaterial.js';
import { rng, TAU, clamp } from '../core/math.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // spiral phyllotaxis angle

// Assembles a whole colony from the parameter tree and animates it. One StemCurve
// threads every zooid; nectophores pulse in a metachronal wave; the whole thing
// sways as it hangs. THREE.Group so the scene can add/remove it wholesale.
export class SiphonophoreRig extends THREE.Group {
  constructor(p) {
    super();
    this.p = p;
    this.t = 0;
    this.bells = []; // { mesh, phase }
    this.curve = new StemCurve(p);
    this.rand = rng(hashId(p.id));

    // Shared materials for this colony.
    this.gelMat = makeGelMaterial(p.gel, p.biolum);
    this.floatMat = makeFloatMaterial(p.float);
    this.lureMat = makeLureMaterial(p.siphosome.tentacle.lureColor, p.scale * 0.14);

    this._buildStem();
    this._buildFloat();
    this._buildNectosome();
    this._buildSiphosome();

    // Vertical extent + centre for camera framing, measured from the real curve
    // (plus the float sitting above the top) rather than a nominal guess.
    const top = this.curve.getPoint(0);
    const tip = this.curve.getPoint(1);
    const floatRise = p.float.present ? p.float.length * p.scale * 6.0 : 0;
    const yHi = top.y + floatRise;
    const yLo = tip.y;
    this.span = Math.max(yHi - yLo, this.curve.len * 0.5);
    this.centreY = (yHi + yLo) * 0.5;

    // Size-independent shimmer/ripple band spacing.
    const invSpan = 1 / this.span;
    this.gelMat.uniforms.uInvSpan.value = invSpan;
    if (this._stemMat) this._stemMat.uniforms.uInvSpan.value = invSpan;
  }

  _buildStem() {
    const geo = buildStemTube(this.curve, this.p);
    const mat = this.gelMat.clone();
    mat.uniforms.uRim.value *= 0.4;
    mat.uniforms.uInterior.value *= 0.6;
    this.add(new THREE.Mesh(geo, mat));
    this._stemMat = mat;
  }

  _buildFloat() {
    const f = this.p.float;
    if (!f.present) return;
    const g = new THREE.Group();
    const floatGeo = buildFloat(f, this.p.scale);
    const m = new THREE.Mesh(floatGeo, this.floatMat);
    g.add(m);
    // Apical pigment cap (Marrus orange, Agalma red) as a small emissive dome.
    if (f.capAmt > 0) {
      const capMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(f.gasCap), transparent: true, opacity: 0.85,
      });
      const capGeo = buildFloat({ ...f, length: f.length * f.capAmt, width: f.width * 0.95 }, this.p.scale);
      const cap = new THREE.Mesh(capGeo, capMat);
      const fl = f.length * this.p.scale * 6.0;
      cap.position.y = fl * (0.5 - f.capAmt * 0.5);
      g.add(cap);
    }
    if (f.crest > 0) {
      const crestMat = this.floatMat.clone();
      crestMat.color = new THREE.Color(f.color).offsetHSL(-0.05, 0.1, 0.1);
      g.add(new THREE.Mesh(buildCrest(f, this.p.scale), crestMat));
    }
    // Seat the float at the apex (top of the stem).
    const top = this.curve.getPoint(0);
    const fl = f.length * this.p.scale * 6.0;
    g.position.copy(top);
    g.position.y += fl * 0.5;
    this.add(g);
    this.floatGroup = g;
  }

  _buildNectosome() {
    const n = this.p.nectosome;
    if (n.arrangement === 'none' || n.count <= 0) return;
    // The float sits ABOVE the stem apex — it doesn't consume stem arclength — so
    // the nectosome starts right at the top (s=0).
    const floatEnd = 0.0;
    const geo = buildBellGeometry(n.bell);
    const bellR = n.bell.radius * this.p.scale * 6.0;

    const frame = {};
    for (let i = 0; i < n.count; i++) {
      const u = (i + 0.5) / n.count;
      const s = clamp(floatEnd + u * n.span, 0, 1);
      this.curve.frameAt(s, frame);

      // Direction the bell stands out from the stem.
      let outward = frame.side.clone();
      if (n.arrangement === 'spiral') {
        outward.applyAxisAngle(frame.tangent, i * GOLDEN);
      } else if (n.arrangement === 'biserial') {
        if (i % 2 === 1) outward.negate();
        // Alternate rows sit slightly fore/aft too.
        outward.applyAxisAngle(frame.tangent, (i % 2 === 0 ? 1 : -1) * 0.25);
      } else if (n.arrangement === 'single') {
        outward.applyAxisAngle(frame.tangent, i * 0.6);
      }
      outward.normalize();

      // Bell axis (apex→mouth) points down the stem (thrust backward) and out.
      const axis = frame.tangent.clone().multiplyScalar(Math.cos(n.bell.tilt))
        .addScaledVector(outward, Math.sin(n.bell.tilt)).normalize();

      const mesh = new THREE.Mesh(geo, this.gelMat);
      mesh.position.copy(frame.pos).addScaledVector(outward, bellR * n.bell.splay);
      mesh.quaternion.setFromUnitVectors(_Z, axis);
      mesh.userData.base = mesh.position.clone();
      // Metachronal phase: a wave travelling down the column, with biserial
      // left/right stagger.
      const phase = -u * n.pulse.metachrony * TAU + (i % 2) * n.pulse.stagger * Math.PI;
      this.bells.push({ mesh, phase, axis: axis.clone() });
      this.add(mesh);
    }
  }

  _buildSiphosome() {
    const sp = this.p.siphosome;
    const noNect = this.p.nectosome.arrangement === 'none' || this.p.nectosome.count <= 0;
    const nectEnd = noNect ? 0.02 : this.p.nectosome.span;
    const start = clamp(nectEnd, 0, 0.98);
    const gastroGeo = buildGastrozooid(sp.gastrozooid.size, this.p.scale);
    const gastroMat = makeOrganMaterial(sp.gastrozooid.color);
    this._gastroMat = gastroMat;
    const bractGeo = buildBract(sp.bract.size, sp.bract.facets, this.p.scale);

    const frame = {};
    const lurePts = [];
    const tentSegments = [];

    for (let c = 0; c < sp.cormidia; c++) {
      const u = (c + 0.5) / sp.cormidia;
      const s = clamp(start + u * (1 - start), 0, 1);
      this.curve.frameAt(s, frame);
      const outward = frame.side;

      // Gastrozooid hanging below the stem.
      const gm = new THREE.Mesh(gastroGeo, gastroMat);
      gm.position.copy(frame.pos);
      gm.quaternion.setFromUnitVectors(_Z, frame.tangent);
      this.add(gm);

      // A couple of bracts shingling around the stem at this cormidium.
      const nb = Math.max(1, Math.round(sp.bract.count / sp.cormidia));
      for (let b = 0; b < nb; b++) {
        const ang = (b / nb) * TAU + c * 0.5;
        const dir = outward.clone().applyAxisAngle(frame.tangent, ang).normalize();
        const bm = new THREE.Mesh(bractGeo, this.gelMat);
        bm.position.copy(frame.pos).addScaledVector(dir, this.p.scale * 0.05);
        const axis = frame.tangent.clone().multiplyScalar(0.6).addScaledVector(dir, 0.8).normalize();
        bm.quaternion.setFromUnitVectors(_Z, axis);
        this.add(bm);
      }

      // Palpon whorl (Physophora "hula skirt"): a ring of palpons standing out.
      if (sp.palpon.skirt > 0 && sp.palpon.count > 0) {
        const pm = makeOrganMaterial(sp.palpon.color);
        this._palponMat = pm;
        const pg = buildGastrozooid(sp.palpon.size, this.p.scale);
        for (let k = 0; k < sp.palpon.count; k++) {
          const ang = (k / sp.palpon.count) * TAU;
          const dir = outward.clone().applyAxisAngle(frame.tangent, ang).normalize();
          const mesh = new THREE.Mesh(pg, pm);
          mesh.position.copy(frame.pos).addScaledVector(dir, this.p.scale * 0.08 * sp.palpon.skirt);
          const axis = dir.clone().multiplyScalar(0.7).addScaledVector(frame.tangent, 0.7).normalize();
          mesh.quaternion.setFromUnitVectors(_Z, axis);
          this.add(mesh);
        }
      }

      // Feeding tentacle from this cormidium.
      const t = buildTentacle(sp.tentacle, this.p.scale, this.rand);
      const q = new THREE.Quaternion().setFromUnitVectors(_Yneg, frame.tangent);
      for (const v of t.segments) {
        const w = v.clone().applyQuaternion(q).add(frame.pos);
        tentSegments.push(w.x, w.y, w.z);
      }
      for (const v of t.lures) {
        const w = v.clone().applyQuaternion(q).add(frame.pos);
        lurePts.push(w.x, w.y, w.z);
      }
    }

    // One LineSegments for every tentacle filament (cheap, additive → glowing).
    if (tentSegments.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tentSegments), 3));
      const m = new THREE.LineBasicMaterial({
        color: new THREE.Color(this.p.gel.tint), transparent: true, opacity: 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      this._tentMat = m;
      this.add(new THREE.LineSegments(g, m));
    }
    // Bioluminescent lure points.
    if (lurePts.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lurePts), 3));
      this.lures = new THREE.Points(g, this.lureMat);
      this.add(this.lures);
    }
  }

  update(dt) {
    this.t += dt;
    const n = this.p.nectosome;
    const w = n.pulse.freq * TAU;

    // Metachronal pulsing: each bell contracts on its own phase. Contraction is a
    // fast squeeze (jet) followed by a slow refill — an asymmetric wave.
    let globalPulse = 0;
    for (const b of this.bells) {
      const ph = this.t * w + b.phase;
      // Asymmetric: sharp contract, gentle relax.
      const s = Math.sin(ph);
      const contract = Math.max(0, s) ** 1.6;
      const sc = 1 - n.pulse.amp * contract;
      b.mesh.scale.set(sc, sc, 1 + n.pulse.amp * contract * 0.4);
      globalPulse += contract;
    }
    globalPulse = this.bells.length ? globalPulse / this.bells.length : 0;

    // Bioluminescence breathes with the aggregate pulse plus a slow wander.
    const biolumPulse = clamp(0.5 + 0.5 * Math.sin(this.t * 0.7) + this.p.biolum.pulse * globalPulse, 0, 1);
    this.gelMat.uniforms.uPulse.value = biolumPulse;
    this.gelMat.uniforms.uTime.value = this.t;
    this._stemMat.uniforms.uPulse.value = biolumPulse;

    // Whole-colony life: a lazy spiralling drift through the water, a slow turn so
    // it's seen from every side, and a pendulum sway of the hanging stem — the
    // unhurried arcing motion these have when you swim with them.
    const A = this.span;
    this.position.set(
      Math.sin(this.t * 0.13) * A * 0.05 + Math.sin(this.t * 0.05) * A * 0.03,
      Math.sin(this.t * 0.09) * A * 0.03,
      Math.cos(this.t * 0.11) * A * 0.05
    );
    this.rotation.y = this.t * 0.09 + Math.sin(this.t * 0.06) * 0.35;
    this.rotation.z = Math.sin(this.t * 0.3) * 0.06 + Math.sin(this.t * 0.13) * 0.03;
    this.rotation.x = Math.cos(this.t * 0.23) * 0.045;
  }

  dispose() {
    this.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
}

const _Z = new THREE.Vector3(0, 0, 1);
const _Yneg = new THREE.Vector3(0, -1, 0);

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
