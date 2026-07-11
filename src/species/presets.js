// Real specimens as points in the parameter space. Each entry overrides only the
// leaves that make the species itself; everything else falls back to defaults().
// Morphology + colour are sourced in README.md — the three suborders and their
// signature features are all represented so the space spans the real diversity.

import { defaults } from '../core/params.js';
import { clone } from '../core/math.js';

// Deep-merge an override tree onto a base (objects merge, everything else replaces).
function merge(base, over) {
  for (const k in over) {
    const ov = over[k];
    if (ov && typeof ov === 'object' && !Array.isArray(ov) && base[k] && typeof base[k] === 'object') {
      merge(base[k], ov);
    } else {
      base[k] = clone(ov);
    }
  }
  return base;
}

// Overrides, apex → tip. Ordered so the chip bar reads cystonect → physonects →
// calycophores.
const OVERRIDES = {
  // ---- Cystonectae: big float, NO swimming bells --------------------------------
  physalia: {
    displayName: 'Portuguese man o’ war', suborder: 'cystonect', scale: 0.28,
    stem: { length: 1.4, curve: 0.05, sag: 0.5, thickness: 0.004 },
    float: { present: true, length: 0.5, width: 0.24, apex: 0.35, crest: 0.85,
      color: '#7d8fe0', gasCap: '#ff9ec8', capAmt: 0.18 },
    nectosome: { arrangement: 'none', count: 0, span: 0.0 },
    siphosome: { span: 0.95, cormidia: 14,
      gastrozooid: { color: '#5f7fd8' },
      tentacle: { length: 1.6, tentilla: 3, curl: 0.25, lure: 0 },
      palpon: { count: 0 }, bract: { count: 0 } },
    gel: { tint: '#8fb0ff', rim: 1.0, interior: 0.2, opacity: 0.6, iridescence: 0.35 },
  },

  // ---- Physonectae: float + nectosome + siphosome -------------------------------
  nanomia: {
    displayName: 'Nanomia bijuga', suborder: 'physonect', scale: 0.16,
    stem: { length: 1.0, curve: 0.16, sag: 0.15 },
    float: { length: 0.045, width: 0.03, apex: 0.6, color: '#c77a5a', gasCap: '#ff6a30', capAmt: 0.4 },
    nectosome: { count: 9, arrangement: 'spiral', span: 0.24,
      bell: { height: 0.08, radius: 0.05, apex: 0.6, facets: 2.2, tilt: 0.5, splay: 0.7 },
      pulse: { freq: 1.5, amp: 0.5, metachrony: 0.9 } },
    siphosome: { span: 0.7, cormidia: 10,
      gastrozooid: { size: 0.03, color: '#c25a30' },
      tentacle: { length: 0.5, tentilla: 8, curl: 0.5 } },
    gel: { tint: '#9fe0ff', rim: 1.1, interior: 0.22, iridescence: 0.4 },
    biolum: { intensity: 0.06, color: '#6fe0ff', pulse: 0.3 },
  },

  agalma: {
    displayName: 'Agalma okenii', suborder: 'physonect', scale: 0.3,
    stem: { length: 1.2, curve: 0.14, sag: 0.2 },
    float: { length: 0.04, width: 0.028, apex: 0.65, color: '#c98a5a', gasCap: '#ff7a2a', capAmt: 0.45 },
    nectosome: { count: 12, arrangement: 'biserial', span: 0.26,
      bell: { height: 0.07, radius: 0.045, apex: 0.6, facets: 2.4, tilt: 0.45, splay: 0.8 },
      pulse: { freq: 1.4, amp: 0.45, metachrony: 0.8, stagger: 0.6 } },
    siphosome: { span: 0.68, cormidia: 12,
      gastrozooid: { size: 0.026, color: '#d83a2a' },
      tentacle: { length: 0.55, tentilla: 9, curl: 0.5 },
      bract: { count: 22, size: 0.03, facets: 3.5 } },
    gel: { tint: '#6fd0ff', rim: 1.2, interior: 0.25, iridescence: 0.55 },
    biolum: { intensity: 0.05, color: '#8affff', pulse: 0.25 },
  },

  marrus: {
    displayName: 'Marrus orthocanna', suborder: 'physonect', scale: 1.4,
    stem: { length: 1.3, curve: 0.12, sag: 0.25, thickness: 0.005 },
    float: { length: 0.06, width: 0.05, apex: 0.5, color: '#ff8a3a', gasCap: '#ff5a1a', capAmt: 0.5 },
    nectosome: { count: 11, arrangement: 'biserial', span: 0.28,
      bell: { height: 0.075, radius: 0.05, apex: 0.6, facets: 2.3, tilt: 0.4, splay: 0.75 },
      pulse: { freq: 1.1, amp: 0.42, metachrony: 0.85, stagger: 0.5 } },
    siphosome: { span: 0.66, cormidia: 14,
      gastrozooid: { size: 0.03, color: '#ff5a2a' },
      tentacle: { length: 0.6, tentilla: 7, curl: 0.35 },
      bract: { count: 18, size: 0.032 } },
    gel: { tint: '#ffb37a', rim: 1.0, interior: 0.28, iridescence: 0.25 },
    biolum: { intensity: 0.03, color: '#ff9a5a', pulse: 0.2 },
  },

  physophora: {
    displayName: 'Physophora hydrostatica', suborder: 'physonect', scale: 0.1,
    stem: { length: 0.55, curve: 0.08, sag: 0.05, thickness: 0.008 },
    float: { length: 0.12, width: 0.05, apex: 0.55, color: '#d9d0ee', gasCap: '#cc2626', capAmt: 0.3 },
    nectosome: { count: 12, arrangement: 'biserial', span: 0.4,
      bell: { height: 0.08, radius: 0.05, apex: 0.6, facets: 2.4, tilt: 0.5, splay: 0.85 },
      pulse: { freq: 1.3, amp: 0.5, metachrony: 0.7, stagger: 0.6 } },
    siphosome: { span: 0.5, cormidia: 2,
      gastrozooid: { size: 0.04, color: '#ff8a6a' },
      tentacle: { length: 0.35, tentilla: 5, curl: 0.4 },
      palpon: { count: 13, size: 0.085, skirt: 1.0, color: '#ff9ec2' },
      bract: { count: 0 } },
    gel: { tint: '#bfe0ff', rim: 1.2, interior: 0.24, iridescence: 0.5 },
    biolum: { intensity: 0.18, color: '#7fffe0', pulse: 0.5 },
  },

  forskalia: {
    displayName: 'Forskalia', suborder: 'physonect', scale: 0.22,
    stem: { length: 1.0, curve: 0.22, coil: 0.15, coilTurns: 1.2, sag: 0.15 },
    float: { length: 0.035, width: 0.025, apex: 0.6, color: '#cfe0ee', capAmt: 0.0 },
    nectosome: { count: 16, arrangement: 'spiral', span: 0.4,
      bell: { height: 0.06, radius: 0.035, apex: 0.65, facets: 2.2, tilt: 0.6, splay: 0.9 },
      pulse: { freq: 1.6, amp: 0.45, metachrony: 1.1 } },
    siphosome: { span: 0.55, cormidia: 12,
      gastrozooid: { size: 0.022, color: '#c9a24a' },
      tentacle: { length: 0.45, tentilla: 10, curl: 0.6 },
      bract: { count: 26, size: 0.026 } },
    gel: { tint: '#cfeaff', rim: 1.1, interior: 0.2, iridescence: 0.45 },
  },

  apolemia: {
    displayName: 'Apolemia (string siphonophore)', suborder: 'physonect', scale: 2.4,
    stem: { length: 1.6, curve: 0.1, coil: 1.0, coilTurns: 2.6, sag: 0.1, thickness: 0.003 },
    float: { length: 0.03, width: 0.02, apex: 0.6, color: '#e0d6ee', capAmt: 0.0 },
    nectosome: { count: 18, arrangement: 'biserial', span: 0.16,
      bell: { height: 0.045, radius: 0.03, apex: 0.6, facets: 2.2, tilt: 0.4, splay: 0.7 },
      pulse: { freq: 1.3, amp: 0.4, metachrony: 1.0, stagger: 0.5 } },
    siphosome: { span: 0.82, cormidia: 40,
      gastrozooid: { size: 0.012, color: '#f0b8cc' },
      tentacle: { length: 0.28, tentilla: 6, curl: 0.5 },
      bract: { count: 40, size: 0.014 } },
    gel: { tint: '#eaf2ff', rim: 1.0, interior: 0.18, iridescence: 0.3 },
    biolum: { intensity: 0.04, color: '#bfe0ff', pulse: 0.2 },
  },

  erenna: {
    displayName: 'Erenna (angler siphonophore)', suborder: 'physonect', scale: 0.55,
    stem: { length: 1.2, curve: 0.12, sag: 0.3, thickness: 0.005 },
    float: { length: 0.035, width: 0.028, apex: 0.55, color: '#cfe0ee', capAmt: 0.0 },
    nectosome: { count: 10, arrangement: 'biserial', span: 0.4,
      bell: { height: 0.09, radius: 0.05, apex: 0.55, facets: 2.6, tilt: 0.45, splay: 0.75 },
      pulse: { freq: 1.0, amp: 0.4, metachrony: 0.8, stagger: 0.5 } },
    siphosome: { span: 0.55, cormidia: 12,
      gastrozooid: { size: 0.022, color: '#d8d0c8' },
      tentacle: { length: 0.7, tentilla: 12, curl: 0.55, lure: 1.0, lureColor: '#ff1a10' },
      bract: { count: 10, size: 0.024 } },
    gel: { tint: '#cfe0ff', rim: 1.0, interior: 0.18, iridescence: 0.3 },
    biolum: { intensity: 0.05, color: '#ff2a1a', pulse: 0.6 },
  },

  // ---- Calycophorae: NO float, 1–2 (or stacked) nectophores ---------------------
  praya: {
    displayName: 'Praya dubia (giant)', suborder: 'calycophore', scale: 4.0,
    stem: { length: 1.8, curve: 0.06, sag: 0.15, thickness: 0.003 },
    float: { present: false },
    nectosome: { count: 2, arrangement: 'single', span: 0.06,
      bell: { height: 0.06, radius: 0.05, apex: 0.55, facets: 2.6, tilt: 0.35, splay: 0.5 },
      pulse: { freq: 0.9, amp: 0.5, metachrony: 0.5 } },
    siphosome: { span: 0.94, cormidia: 34,
      gastrozooid: { size: 0.012, color: '#dfeeff' },
      tentacle: { length: 0.3, tentilla: 6, curl: 0.5 },
      bract: { count: 34, size: 0.016 } },
    gel: { tint: '#eaf6ff', rim: 1.1, interior: 0.18, iridescence: 0.35 },
    biolum: { intensity: 0.05, color: '#8fd0ff', pulse: 0.3 },
  },

  diphyes: {
    displayName: 'Diphyes dispar', suborder: 'calycophore', scale: 0.05,
    stem: { length: 1.4, curve: 0.05, sag: 0.1, thickness: 0.006 },
    float: { present: false },
    nectosome: { count: 2, arrangement: 'single', span: 0.18,
      bell: { height: 0.12, radius: 0.055, apex: 0.4, facets: 5.0, mouth: 0.85, tilt: 0.2, splay: 0.35 },
      pulse: { freq: 1.4, amp: 0.5, metachrony: 0.5 } },
    siphosome: { span: 0.82, cormidia: 8,
      gastrozooid: { size: 0.03, color: '#cfe0ee' },
      tentacle: { length: 0.4, tentilla: 5, curl: 0.4 },
      bract: { count: 8, size: 0.03, facets: 5.0 } },
    gel: { tint: '#dff0ff', rim: 1.2, interior: 0.16, iridescence: 0.4 },
  },

  chelophyes: {
    displayName: 'Chelophyes appendiculata', suborder: 'calycophore', scale: 0.05,
    stem: { length: 1.3, curve: 0.04, sag: 0.08, thickness: 0.006 },
    float: { present: false },
    nectosome: { count: 2, arrangement: 'single', span: 0.2,
      bell: { height: 0.16, radius: 0.05, apex: 0.32, facets: 4.0, mouth: 0.8, tilt: 0.15, splay: 0.3 },
      pulse: { freq: 1.6, amp: 0.55, metachrony: 0.5 } },
    siphosome: { span: 0.8, cormidia: 7,
      gastrozooid: { size: 0.028, color: '#cfe0ee' },
      tentacle: { length: 0.4, tentilla: 5, curl: 0.35 },
      bract: { count: 7, size: 0.028, facets: 4.0 } },
    gel: { tint: '#e0f2ff', rim: 1.2, interior: 0.15, iridescence: 0.4 },
  },

  abylopsis: {
    displayName: 'Abylopsis tetragona', suborder: 'calycophore', scale: 0.04,
    stem: { length: 1.2, curve: 0.05, sag: 0.08, thickness: 0.006 },
    float: { present: false },
    nectosome: { count: 2, arrangement: 'single', span: 0.22,
      bell: { height: 0.13, radius: 0.055, apex: 0.4, facets: 6.5, mouth: 0.85, tilt: 0.18, splay: 0.32 },
      pulse: { freq: 1.5, amp: 0.5, metachrony: 0.5 } },
    siphosome: { span: 0.78, cormidia: 6,
      gastrozooid: { size: 0.03, color: '#cfe0ee' },
      tentacle: { length: 0.35, tentilla: 4, curl: 0.35 },
      bract: { count: 6, size: 0.03, facets: 6.0 } },
    gel: { tint: '#dfeeff', rim: 1.3, interior: 0.16, iridescence: 0.45 },
  },

  hippopodius: {
    displayName: 'Hippopodius hippopus (glass)', suborder: 'calycophore', scale: 0.04,
    stem: { length: 0.7, curve: 0.06, sag: 0.05, thickness: 0.008 },
    float: { present: false },
    nectosome: { count: 8, arrangement: 'single', span: 0.5,
      bell: { height: 0.07, radius: 0.06, apex: 0.7, facets: 2.6, mouth: 0.9, tilt: 0.25, splay: 0.4 },
      pulse: { freq: 1.2, amp: 0.35, metachrony: 0.6 } },
    siphosome: { span: 0.4, cormidia: 5,
      gastrozooid: { size: 0.03, color: '#dfeeff' },
      tentacle: { length: 0.35, tentilla: 5, curl: 0.4 },
      bract: { count: 6, size: 0.028 } },
    gel: { tint: '#dfeeff', rim: 1.3, interior: 0.2, iridescence: 0.5 },
    biolum: { intensity: 0.14, color: '#6fb0ff', pulse: 0.6 }, // blanch + blue glow
  },
};

export const SPECIES_ORDER = [
  'physalia', 'nanomia', 'agalma', 'marrus', 'physophora', 'forskalia', 'apolemia',
  'erenna', 'praya', 'diphyes', 'chelophyes', 'abylopsis', 'hippopodius',
];

export const SPECIES_LABELS = {
  physalia: 'Man o’ war', nanomia: 'Nanomia', agalma: 'Agalma', marrus: 'Marrus',
  physophora: 'Physophora', forskalia: 'Forskalia', apolemia: 'Apolemia', erenna: 'Erenna',
  praya: 'Praya', diphyes: 'Diphyes', chelophyes: 'Chelophyes', abylopsis: 'Abylopsis',
  hippopodius: 'Hippopodius',
};

export function makeSpecies(id) {
  const p = defaults();
  const over = OVERRIDES[id];
  if (!over) throw new Error(`unknown species: ${id}`);
  merge(p, over);
  p.id = id;
  return p;
}

export const SPECIES = OVERRIDES;
