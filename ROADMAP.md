# Roadmap

Where the siphonophore rig goes next. Ordered by leverage. This is a sibling of the
`fish/` project and borrows its philosophy: keep it real-time and game-like (one
hero colony in front of you), accurate where it's cheap to be, and beautiful — with
the deep-sea / blackwater look as the north star.

Legend: ⭐ recommended next · 🟢 cheap (infra exists) · 🟡 medium · 🔴 large

---

## Phase 1 — Life in the motion 🟡 ⭐
*The colony is anatomically right and pulses metachronally; now make it feel alive.*

- [ ] **Tentacle drift & lure flick.** Tentilla currently hang as static additive
      lines. Give them per-segment noise sway, and make *Erenna*/*Resomia* lures
      *flick* (the twitching prey-mimic motion that's their whole trick).
- [ ] **Per-bell subumbrella.** Bells read as shells; add the inner nectosac cavity
      + velar aperture so the jet opening is visible when a bell contracts.
- [ ] **Swim modes.** Toggle *cruise* (asynchronous metachronal wave) vs *escape*
      (all bells fire synchronously) — both are documented for *Nanomia*; the
      synchronous escape burst would be a great interaction.
- [ ] **Bell tuning to the numbers.** Default pulse ~3.9 Hz, jet:refill 1:1, offset
      ≈0.45 of a cycle (currently plausible but not calibrated).

## Phase 2 — Material & light 🟡
*The gel is good; push it toward the real glassy, iridescent, bioluminescent look.*

- [x] ✅ **Animated iridescent shimmer + cephalopod colour ripple** on the gel
      (spectral sheen + travelling colour bands). *(Still want real multilayer
      thin-film for Physalia's float / Gymnopraia's structural blue.)*
- [ ] **Hippopodius blanch.** Its signature: glassy → milky-white opaque flash when
      disturbed, with a blue luminescent pulse. A one-parameter animated defense.
- [ ] **Subsurface / volumetric glow** for the float and thick zooids.
- [x] ✅ **Bloom** post-processing — the deep-sea glow.
- [x] ✅ **Lazy spiralling drift** — the colony arcs and turns through the water.
- [x] ✅ **Richer black water** — hue-tinted gradient + dense twinkling marine snow.
- [ ] **A gentle directional current** that bends the stem and streams the snow.

## Phase 3 — The genome & sharing 🟢
*A colony already **is** its parameter tree — the fish project's trick ports directly.*

- [ ] **Serialize genome → shareable URL** (diff-vs-preset codec, like `fish/genome.js`).
- [ ] **Load from URL hash** on boot; live-update the address bar as you tune.
- [ ] **Breeding / mutation** — cross two colonies, mutate within plausible bounds.

## Phase 4 — More of the tree 🟡
*13 species span the three suborders; the family is far bigger.*

- [ ] Single-bell *Sphaeronectes* (the calycophore exception), heart-belled
      *Cordagalma*, scarlet *Marrus claudanielis*, green-lure *Resomia*, developmental
      model *Bargmannia*.
- [ ] **Eudoxid release** (calycophores shed free-living sexual cormidia) as an
      animated life-cycle toy.
- [ ] Named, human-readable "genes" (body plan, bell arrangement, lure, skirt) so
      the space is legible, not just numbers.

## Phase 5 — Deployment on exe.dev 🟢
*Reuses the fish pipeline verbatim.*

- [x] ✅ esbuild build step — `npm run build` bundles a self-contained `dist/` (~614 KB).
- [ ] Provision an exe.dev VM (`sipho`/`siphon`), deploy `dist/`, make public.
- [ ] Autodeploy timer (push `main` → rebuild + redeploy), mirroring `fish/deploy/`.

---

## Cross-cutting / tech debt
- [ ] **Bell interlock & bract shingling** are modelled plausibly but aren't
      literature-quantified — revisit if better morphometrics surface.
- [ ] **Camera framing** is tuned for tall/thin colonies; a *Physalia* (float-heavy)
      and a *Praya* (thread-thin, tens of metres) want slightly different defaults.
- [ ] **Instancing** for bells/bracts if colony counts grow (fine for one hero now).
- [ ] **Contact-sheet gallery** script (like `fish/scripts/gallery.mjs`) for the README.
