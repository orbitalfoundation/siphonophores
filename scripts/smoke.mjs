// Node-only smoke test: build every species' colony geometry and pose it a few
// times, checking for NaNs in positions and transforms. No WebGL needed — THREE
// builds BufferGeometry and ShaderMaterial fine headless.
import { SPECIES_ORDER, makeSpecies } from '../src/species/presets.js';
import { SiphonophoreRig } from '../src/rig/SiphonophoreRig.js';

function firstNaN(arr) {
  for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) return i;
  return -1;
}

let fail = 0;
for (const id of SPECIES_ORDER) {
  const p = makeSpecies(id);
  let rig, verts = 0, meshes = 0, geoNaN = -1;
  try {
    rig = new SiphonophoreRig(p);
    rig.traverse((o) => {
      if (o.geometry?.attributes?.position) {
        meshes++;
        const a = o.geometry.attributes.position.array;
        verts += a.length / 3;
        if (geoNaN < 0) geoNaN = firstNaN(a);
      }
    });
    // Pose a few frames; confirm bell transforms stay finite.
    let poseNaN = false;
    for (let f = 0; f < 6; f++) {
      rig.update(0.016);
      for (const b of rig.bells) {
        const s = b.mesh.scale;
        if (![s.x, s.y, s.z].every(Number.isFinite)) poseNaN = true;
      }
    }
    const ok = geoNaN < 0 && !poseNaN && verts > 0;
    if (!ok) fail++;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(12)} ${p.suborder.padEnd(11)} ` +
      `meshes=${String(meshes).padStart(4)} verts=${String(verts | 0).padStart(6)} ` +
      `bells=${rig.bells.length} ${geoNaN < 0 ? '' : 'geoNaN@' + geoNaN} ${poseNaN ? 'POSE-NaN' : ''}`
    );
  } catch (e) {
    fail++;
    console.log(`FAIL ${id.padEnd(12)} threw: ${e.message}`);
  }
}
console.log(`\n${fail === 0 ? 'ALL PASS' : fail + ' FAILURES'}`);
process.exit(fail === 0 ? 0 : 1);
