// THE parameter space.
//
// A siphonophore is a colony organised along a central stem, apex → end:
//
//   pneumatophore (gas float)  →  nectosome (column of swimming bells)  →
//   siphosome (a repeated series of cormidia: gastrozooid + tentacle,
//              palpons, bracts, gonophores)
//
// Every real species is a point in the tree below. `presets.js` overrides the
// leaves that make a species itself; anything it omits falls back to these
// defaults, so a preset only has to state what's distinctive.
//
// Three suborders differ mainly in which regions exist:
//   cystonect   — big float, NO nectosome, long siphosome (Portuguese man o' war)
//   physonect   — small float + nectosome + siphosome (the classic swimmers)
//   calycophore — NO float, 1–2 large nectophores, long trailing siphosome
//
// Refs live in README.md; numbers are baked here from the morphology literature.

import { clone, lerpTree } from './math.js';

export const SUBORDERS = ['cystonect', 'physonect', 'calycophore'];

// The canonical default colony — a generic physonect. Presets are diffs on this.
export function defaults() {
  return {
    id: 'generic',
    displayName: 'Generic physonect',
    suborder: 'physonect',
    scale: 0.18, // nominal long-axis size, metres (colonies span mm → tens of m)

    // The stem: a space curve the whole colony hangs along. All region spans are
    // fractions of arclength [0,1], apex(0) → tip(1).
    stem: {
      length: 1.0, // overall length multiplier
      curve: 0.15, // gentle lateral bow (0 = ramrod straight)
      coil: 0.0, // helical coiling amount (Apolemia)
      coilTurns: 1.5, // turns of the coil when coil > 0
      sag: 0.1, // droop toward the tip
      thickness: 0.006, // stem tube radius, rel to scale
    },

    // Pneumatophore — the apical gas float.
    float: {
      present: true,
      length: 0.05, // rel to colony
      width: 0.035,
      apex: 0.6, // 0 = blunt, 1 = pointed top
      crest: 0.0, // Physalia sail ridge (0 = none)
      color: '#b98fd0',
      gasCap: '#ff9a5a', // apical pigment cap colour
      capAmt: 0.0, // how much of the float the cap covers
    },

    // Nectosome — the column of swimming bells (nectophores).
    nectosome: {
      count: 10,
      arrangement: 'biserial', // biserial | spiral | single | none
      span: 0.28, // fraction of stem it occupies (just below the float)
      bell: {
        height: 0.075, // rel to colony
        radius: 0.045,
        apex: 0.65, // apex taper of the bell
        facets: 2.2, // superellipse exponent: 2 round → 6+ prismatic (calyco)
        mouth: 0.9, // ostium opening as fraction of bell radius
        tilt: 0.4, // radians the bell axis leans from the stem
        splay: 0.5, // how far bells stand out from the stem
      },
      pulse: {
        freq: 1.4, // Hz base contraction rate
        amp: 0.45, // radial contraction amplitude
        metachrony: 0.7, // phase lag down the column → travelling wave
        stagger: 0.5, // biserial left/right anti-phase
      },
    },

    // Siphosome — the repeated feeding region.
    siphosome: {
      span: 0.66, // fraction of stem
      cormidia: 9, // number of feeding segments
      gastrozooid: { size: 0.028, color: '#c25a30' },
      tentacle: {
        length: 0.45, // rel to colony
        tentilla: 7, // side branches per tentacle
        curl: 0.5, // how much the tentacle coils
        lure: 0.0, // bioluminescent lure intensity (Erenna/Resomia)
        lureColor: '#ff2a1a',
      },
      palpon: { count: 5, size: 0.018, skirt: 0.0, color: '#cf7a6b' }, // skirt: Physophora ring
      bract: { count: 16, size: 0.03, facets: 3.5, overlap: 0.5 },
    },

    // The gelatinous look — one shared translucent material, tuned per species.
    gel: {
      tint: '#9fe0ff',
      rim: 1.0, // fresnel edge glow strength
      interior: 0.22, // faint interior fill
      opacity: 0.5,
      iridescence: 0.3,
      shimmer: 0.35, // animated comb-jelly spectral sheen
      chroma: 0.18, // travelling cephalopod-style colour bands
    },

    // Bioluminescence: baseline glow + a slow pulse. Blackwater loves this.
    biolum: { intensity: 0.0, color: '#46e6ff', pulse: 0.0 },
  };
}

// Blend two colony trees. Structural counts (nectophores, cormidia) round to
// whole numbers via lerpTree so a morph rebuilds cleanly.
export function morphParams(a, b, t) {
  if (t <= 0) return clone(a);
  if (t >= 1) return clone(b);
  const m = lerpTree(a, b, t);
  // Suborder / arrangement / display are categorical: snap at halfway.
  m.suborder = t < 0.5 ? a.suborder : b.suborder;
  m.nectosome.arrangement = t < 0.5 ? a.nectosome.arrangement : b.nectosome.arrangement;
  m.float.present = t < 0.5 ? a.float.present : b.float.present;
  m.id = t < 0.5 ? a.id : b.id;
  m.displayName = t < 0.5 ? `${a.displayName} →` : `→ ${b.displayName}`;
  return m;
}
