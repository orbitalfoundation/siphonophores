import * as THREE from 'three';
import { StemCurve } from './stem.js';
import { buildBellGeometry } from './nectophore.js';
import { buildFloat, buildCrest, buildGastrozooid, buildBract, buildTentacle } from './zooids.js';
import { makeGelMaterial, makeFloatMaterial, makeLureMaterial, makeOrganMaterial } from '../shading/GelMaterial.js';
import { rng, TAU, clamp, smoothstep } from '../core/math.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // spiral phyllotaxis angle

// Assembles a whole colony from the parameter tree and ANIMATES IT AS A BODY.
//
// The stem isn't rigid: a travelling helical wave `flow(s,t)` runs down it, and
// every zooid is re-posed each frame from its arclength `s` plus that wave — so
// the colony undulates and curls in place, the stem snakes, and the tentacles
// drift and wave. On top of that the nectophores pulse metachronally and the whole
// colony drifts and turns slowly. THREE.Group so the scene can add/remove it whole.
export class SiphonophoreRig extends THREE.Group {
  constructor(p) {
    super();
    this.p = p;
    this.t = 0;
    this.bells = []; // { mesh, phase, s, base }
    this.posed = []; // every rigid zooid: { mesh, s, base }
    this.curve = new StemCurve(p);
    this.rand = rng(hashId(p.id));
    this._v = new THREE.Vector3(); // scratch

    this.gelMat = makeGelMaterial(p.gel, p.biolum);
    this.floatMat = makeFloatMaterial(p.float);
    this.lureMat = makeLureMaterial(p.siphosome.tentacle.lureColor, p.scale * 0.14);

    this._buildStem();
    this._buildFloat();
    this._buildNectosome();
    this._buildSiphosome();

    // Vertical extent + centre for camera framing.
    const top = this.curve.getPoint(0);
    const tip = this.curve.getPoint(1);
    const floatRise = p.float.present ? p.float.length * p.scale * 6.0 : 0;
    this.span = Math.max(top.y + floatRise - tip.y, this.curve.len * 0.5);
    this.centreY = (top.y + floatRise + tip.y) * 0.5;

    const invSpan = 1 / this.span;
    this.gelMat.uniforms.uInvSpan.value = invSpan;
    if (this._stemMat) this._stemMat.uniforms.uInvSpan.value = invSpan;

    this._pose(0); // seat everything at t=0 so the first frame isn't the rest pose
  }

  // The body wave: a rig-local displacement for a point at arclength s at time t.
  // A travelling helical writhe whose amplitude grows toward the tip (the float end
  // is the anchor), plus a slow large-scale bend that reorients over time (the curl)
  // and a faint length-wise breathing.
  flow(s, t, out) {
    const m = this.p.motion;
    const env = 0.12 + 0.88 * smoothstep(0.0, 0.85, s);
    const amp = m.amp * this.span * env;
    const ph = s * m.waves * TAU - t * m.speed;
    const bx = Math.sin(t * 0.26 + s * 1.7) * amp * 1.3;
    const bz = Math.cos(t * 0.21 + s * 1.7) * amp * 1.3;
    return out.set(
      Math.cos(ph) * amp * 0.7 + bx,
      Math.sin(s * 3.0 - t * m.speed * 0.7) * amp * 0.28,
      Math.sin(ph) * amp * 0.7 + bz
    );
  }

  _buildStem() {
    // A glowing polyline (not a rigid tube) so the stem snakes with the body wave.
    const N = 96;
    const sVals = new Float32Array(N);
    const base = [];
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      sVals[i] = s;
      base.push(this.curve.getPoint(s));
    }
    const positions = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.p.gel.tint), transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._stemLineMat = mat;
    this.stem = { line: new THREE.Line(geo, mat), sVals, base, positions };
    this.add(this.stem.line);
  }

  _buildFloat() {
    const f = this.p.float;
    if (!f.present) return;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(buildFloat(f, this.p.scale), this.floatMat));
    if (f.capAmt > 0) {
      const capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(f.gasCap), transparent: true, opacity: 0.85 });
      const capGeo = buildFloat({ ...f, length: f.length * f.capAmt, width: f.width * 0.95 }, this.p.scale);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = f.length * this.p.scale * 6.0 * (0.5 - f.capAmt * 0.5);
      g.add(cap);
    }
    if (f.crest > 0) {
      const crestMat = this.floatMat.clone();
      crestMat.color = new THREE.Color(f.color).offsetHSL(-0.05, 0.1, 0.1);
      g.add(new THREE.Mesh(buildCrest(f, this.p.scale), crestMat));
    }
    const top = this.curve.getPoint(0);
    g.position.copy(top);
    g.position.y += f.length * this.p.scale * 6.0 * 0.5;
    this.floatBase = g.position.clone();
    this.add(g);
    this.floatGroup = g;
  }

  _buildNectosome() {
    const n = this.p.nectosome;
    if (n.arrangement === 'none' || n.count <= 0) return;
    const geo = buildBellGeometry(n.bell);
    const bellR = n.bell.radius * this.p.scale * 6.0;
    const frame = {};
    for (let i = 0; i < n.count; i++) {
      const u = (i + 0.5) / n.count;
      const s = clamp(u * n.span, 0, 1);
      this.curve.frameAt(s, frame);
      let outward = frame.side.clone();
      if (n.arrangement === 'spiral') outward.applyAxisAngle(frame.tangent, i * GOLDEN);
      else if (n.arrangement === 'biserial') {
        if (i % 2 === 1) outward.negate();
        outward.applyAxisAngle(frame.tangent, (i % 2 === 0 ? 1 : -1) * 0.25);
      } else if (n.arrangement === 'single') outward.applyAxisAngle(frame.tangent, i * 0.6);
      outward.normalize();
      const axis = frame.tangent.clone().multiplyScalar(Math.cos(n.bell.tilt))
        .addScaledVector(outward, Math.sin(n.bell.tilt)).normalize();
      const mesh = new THREE.Mesh(geo, this.gelMat);
      const base = frame.pos.clone().addScaledVector(outward, bellR * n.bell.splay);
      mesh.position.copy(base);
      mesh.quaternion.setFromUnitVectors(_Z, axis);
      const phase = -u * n.pulse.metachrony * TAU + (i % 2) * n.pulse.stagger * Math.PI;
      const rec = { mesh, phase, s, base, baseQuat: mesh.quaternion.clone() };
      this.bells.push(rec);
      this.posed.push(rec);
      this.add(mesh);
    }
  }

  _buildSiphosome() {
    const sp = this.p.siphosome;
    const noNect = this.p.nectosome.arrangement === 'none' || this.p.nectosome.count <= 0;
    const start = clamp(noNect ? 0.02 : this.p.nectosome.span, 0, 0.98);
    const gastroGeo = buildGastrozooid(sp.gastrozooid.size, this.p.scale);
    const gastroMat = makeOrganMaterial(sp.gastrozooid.color);
    const bractGeo = buildBract(sp.bract.size, sp.bract.facets, this.p.scale);
    const frame = {};
    const strands = [];
    let palponGeo, palponMat;
    if (sp.palpon.skirt > 0 && sp.palpon.count > 0) {
      palponMat = makeOrganMaterial(sp.palpon.color);
      palponGeo = buildGastrozooid(sp.palpon.size, this.p.scale);
    }

    for (let c = 0; c < sp.cormidia; c++) {
      const u = (c + 0.5) / sp.cormidia;
      const s = clamp(start + u * (1 - start), 0, 1);
      this.curve.frameAt(s, frame);
      const outward = frame.side;

      const gm = new THREE.Mesh(gastroGeo, gastroMat);
      gm.position.copy(frame.pos);
      gm.quaternion.setFromUnitVectors(_Z, frame.tangent);
      this.posed.push({ mesh: gm, s, base: frame.pos.clone() });
      this.add(gm);

      const nb = Math.max(1, Math.round(sp.bract.count / sp.cormidia));
      for (let b = 0; b < nb; b++) {
        const ang = (b / nb) * TAU + c * 0.5;
        const dir = outward.clone().applyAxisAngle(frame.tangent, ang).normalize();
        const bm = new THREE.Mesh(bractGeo, this.gelMat);
        const base = frame.pos.clone().addScaledVector(dir, this.p.scale * 0.05);
        bm.position.copy(base);
        bm.quaternion.setFromUnitVectors(_Z, frame.tangent.clone().multiplyScalar(0.6).addScaledVector(dir, 0.8).normalize());
        this.posed.push({ mesh: bm, s, base });
        this.add(bm);
      }

      if (palponGeo) {
        for (let k = 0; k < sp.palpon.count; k++) {
          const ang = (k / sp.palpon.count) * TAU;
          const dir = outward.clone().applyAxisAngle(frame.tangent, ang).normalize();
          const mesh = new THREE.Mesh(palponGeo, palponMat);
          const base = frame.pos.clone().addScaledVector(dir, this.p.scale * 0.08 * sp.palpon.skirt);
          mesh.position.copy(base);
          mesh.quaternion.setFromUnitVectors(_Z, dir.clone().multiplyScalar(0.7).addScaledVector(frame.tangent, 0.7).normalize());
          this.posed.push({ mesh, s, base });
          this.add(mesh);
        }
      }

      // Tentacle: keep the rest-pose data + attach frame so it re-poses each frame.
      const t = buildTentacle(sp.tentacle, this.p.scale, this.rand);
      strands.push({ s, q: new THREE.Quaternion().setFromUnitVectors(_Yneg, frame.tangent.clone()), ...t, seed: c * 1.7 });
    }

    // Merged, re-posed line for all tentacle filaments + tentilla.
    let segCount = 0, lureCount = 0;
    for (const st of strands) {
      segCount += (st.main.length - 1) + st.branches.length;
      for (const br of st.branches) if (br.lure) lureCount++;
    }
    if (segCount) {
      const positions = new Float32Array(segCount * 2 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(this.p.gel.tint), transparent: true, opacity: 0.32,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      this._tent = { strands, positions, geo, line: new THREE.LineSegments(geo, mat) };
      this.add(this._tent.line);
    }
    if (lureCount) {
      const lp = new Float32Array(lureCount * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(lp, 3));
      this.lures = new THREE.Points(g, this.lureMat);
      this._lurePos = lp;
      this.add(this.lures);
    }
  }

  // Re-pose the whole body for time t: stem line, rigid zooids, float, tentacles.
  _pose(t) {
    const f = this._v;
    // Stem line follows the wave.
    if (this.stem) {
      const { sVals, base, positions, line } = this.stem;
      for (let i = 0; i < sVals.length; i++) {
        this.flow(sVals[i], t, f);
        positions[i * 3] = base[i].x + f.x;
        positions[i * 3 + 1] = base[i].y + f.y;
        positions[i * 3 + 2] = base[i].z + f.z;
      }
      line.geometry.attributes.position.needsUpdate = true;
    }
    // Float rides the very top of the wave (anchor, small motion).
    if (this.floatGroup) {
      this.flow(0, t, f);
      this.floatGroup.position.copy(this.floatBase).add(f);
    }
    // Every rigid zooid = base + wave at its arclength.
    for (const z of this.posed) {
      this.flow(z.s, t, f);
      z.mesh.position.copy(z.base).add(f);
    }
    // Tentacles: attach follows the wave, plus a travelling wave along each filament.
    if (this._tent) this._poseTentacles(t);
  }

  _poseTentacles(t) {
    const { strands, positions, geo } = this._tent;
    const m = this.p.motion;
    const attach = _t1, local = _t2, world = _t3, prev = _t4, f = this._v;
    let vi = 0; // vertex write cursor (x of each vertex)
    let li = 0;
    const write = (v) => { positions[vi++] = v.x; positions[vi++] = v.y; positions[vi++] = v.z; };
    // Local travelling wave along a filament param u (0 root → 1 tip).
    const tw = (u, seed, L, out) => out.set(
      Math.sin(u * 5.0 - t * 1.4 + seed) * m.tentacle * L * 0.16 * u,
      0,
      Math.cos(u * 4.0 - t * 1.15 + seed * 1.3) * m.tentacle * L * 0.16 * u
    );
    for (const st of strands) {
      // Attachment point = the cormidium's stem point + body wave.
      this.curve.getPoint(st.s, attach);
      this.flow(st.s, t, f);
      attach.add(f);
      const segs = st.main.length - 1;
      // Main filament.
      for (let i = 0; i < st.main.length; i++) {
        const u = i / segs;
        tw(u, st.seed, st.L, local).add(st.main[i]);
        world.copy(local).applyQuaternion(st.q).add(attach);
        if (i > 0) { write(prev); write(world); }
        prev.copy(world);
      }
      // Tentilla branches off posed main points.
      for (const br of st.branches) {
        const u = br.i / segs;
        tw(u, st.seed, st.L, local).add(st.main[br.i]);
        world.copy(local).applyQuaternion(st.q).add(attach); // base of branch
        write(world);
        prev.copy(br.off).applyQuaternion(st.q).add(world); // tip
        write(prev);
        if (br.lure && this._lurePos) {
          this._lurePos[li++] = prev.x; this._lurePos[li++] = prev.y; this._lurePos[li++] = prev.z;
        }
      }
    }
    geo.attributes.position.needsUpdate = true;
    if (this.lures) this.lures.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const n = this.p.nectosome;
    const w = n.pulse.freq * TAU;

    // Metachronal pulsing (scale) — layered on top of the wave re-pose.
    let globalPulse = 0;
    for (const b of this.bells) {
      const contract = Math.max(0, Math.sin(t * w + b.phase)) ** 1.6;
      const sc = 1 - n.pulse.amp * contract;
      b.mesh.scale.set(sc, sc, 1 + n.pulse.amp * contract * 0.4);
      globalPulse += contract;
    }
    globalPulse = this.bells.length ? globalPulse / this.bells.length : 0;

    const biolumPulse = clamp(0.5 + 0.5 * Math.sin(t * 0.7) + this.p.biolum.pulse * globalPulse, 0, 1);
    this.gelMat.uniforms.uPulse.value = biolumPulse;
    this.gelMat.uniforms.uTime.value = t;

    // The body wave — the main source of life.
    this._pose(t);

    // A gentle whole-colony drift + slow turn so we see it from every side. Kept
    // small now that the body itself moves.
    const A = this.span;
    this.position.set(
      Math.sin(t * 0.11) * A * 0.03,
      Math.sin(t * 0.08) * A * 0.02,
      Math.cos(t * 0.09) * A * 0.03
    );
    this.rotation.y = t * 0.07 + Math.sin(t * 0.05) * 0.3;
    this.rotation.z = Math.sin(t * 0.19) * 0.03;
  }

  dispose() {
    this.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose();
    });
  }
}

const _Z = new THREE.Vector3(0, 0, 1);
const _Yneg = new THREE.Vector3(0, -1, 0);
const _t1 = new THREE.Vector3();
const _t2 = new THREE.Vector3();
const _t3 = new THREE.Vector3();
const _t4 = new THREE.Vector3();

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
