import * as THREE from 'three';

// The gelatinous look, tuned for black water.
//
// Everything is ADDITIVE, which on a near-black background gives order-independent
// transparency for free — overlapping bells and bracts just accumulate light, no
// depth sorting, no z-fighting between two dozen translucent shells. The look is
// three stacked terms:
//   • interior  — a faint volumetric fill so a bell reads as a body, not a wire
//   • rim       — a fresnel edge that lights up the silhouette (the jelly glow)
//   • biolum    — an emissive term that can pulse (bioluminescence)
// A cheap fresnel-driven hue shift stands in for thin-film iridescence.
export function makeGelMaterial(gel, biolum) {
  const tint = new THREE.Color(gel.tint);
  const bcol = new THREE.Color(biolum.color);
  // Iridescent second hue: a rotated, cooler companion to the tint.
  const irid = tint.clone().offsetHSL(0.12, 0.15, 0.05);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTint: { value: tint },
      uIrid: { value: irid },
      uRim: { value: gel.rim },
      uRimPow: { value: 3.0 },
      uInterior: { value: gel.interior },
      uOpacity: { value: gel.opacity },
      uIridAmt: { value: gel.iridescence },
      uShimmer: { value: gel.shimmer ?? 0.35 },
      uChroma: { value: gel.chroma ?? 0.18 },
      uInvSpan: { value: 1.0 }, // 1/colony-height, set by the rig for size-independent bands
      uBiolum: { value: biolum.intensity },
      uBiolumColor: { value: bcol },
      uPulse: { value: 0.0 }, // 0..1 breathing glow, driven per frame
      uTime: { value: 0.0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vWorld;
      varying float vContract;
      attribute float aContract;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vContract = aContract;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vWorld;
      varying float vContract;
      uniform vec3 uTint, uIrid, uBiolumColor;
      uniform float uRim, uRimPow, uInterior, uOpacity, uIridAmt, uShimmer, uChroma, uInvSpan, uBiolum, uPulse, uTime;

      // A smooth rainbow — the diffraction/ctenophore palette.
      vec3 spectral(float t){
        return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
      }

      void main(){
        vec3 N = normalize(vN);
        float ndv = abs(dot(N, normalize(vView)));
        float fres = pow(1.0 - ndv, uRimPow);
        // Position along the colony's long axis, normalised so band spacing looks
        // the same on a 2 cm Diphyes and a 4 m Praya.
        float axis = vWorld.y * uInvSpan;

        // Iridescent tint: slide between the base and companion hue by view angle.
        vec3 hue = mix(uTint, uIrid, uIridAmt * fres);

        vec3 col = hue * uInterior;              // volumetric fill
        col += hue * fres * uRim;                // fresnel rim glow
        col += hue * pow(1.0 - ndv, 1.2) * uRim * 0.35; // inner-margin lobe

        // Comb-jelly shimmer: a spectral sheen riding the fresnel edge that drifts
        // over the surface and in time — light diffracting along the gel.
        float sh = pow(1.0 - ndv, 1.6);
        col += spectral(axis * 3.0 + uTime * 0.22 + sh * 1.5) * sh * uShimmer;

        // Cephalopod colour ripple: travelling bands of glowing colour sweeping
        // down the body (chromatophore flashes / comb-row rainbows).
        float w = sin(axis * 26.0 - uTime * 1.8 + vContract * 3.0);
        float band = smoothstep(0.35, 1.0, w);
        col += spectral(uTime * 0.12 + axis * 2.0) * band * uChroma;

        // Bioluminescence, strongest toward the bell margin, breathing with pulse.
        float glow = uBiolum * (0.4 + 0.6 * vContract) * (0.7 + 0.6 * uPulse);
        col += uBiolumColor * glow;

        col *= 0.75; // keep the body's additive sum in the coloured range; bloom
                     // then adds the glow on the bright edges/lures without blowing
                     // the whole colony out to white. The alpha cap keeps densely
                     // overlapping shells (stacked calycophore bells) from summing
                     // to a featureless white core.
        float a = clamp((uInterior + fres * uRim + glow + band * uChroma * 0.6) * uOpacity * 1.5, 0.04, 0.55);
        gl_FragColor = vec4(col, a);
      }`,
  });
  return mat;
}

// Small emissive sprites for bioluminescent lures / photophores — the red-glowing
// tips of Erenna/Resomia tentilla and any point highlights.
export function makeLureMaterial(color, size) {
  return new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
}

// Pigmented feeding/reproductive zooids — gastrozooids, palpons. Opaque-ish and
// coloured (the "orange internal organs" seen through the transparent colony),
// self-lit so they glow warmly on black instead of reading as flat dots.
export function makeOrganMaterial(color) {
  const col = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: col,
    emissive: col.clone().multiplyScalar(0.55),
    roughness: 0.5,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });
}

// The pneumatophore float — more opaque and pigmented than the gel zooids, with a
// soft physical sheen. Kept a standard PBR material so it catches the key light.
export function makeFloatMaterial(float) {
  const col = new THREE.Color(float.color);
  return new THREE.MeshPhysicalMaterial({
    color: col,
    roughness: 0.28,
    metalness: 0.0,
    transmission: 0.55,
    thickness: 0.4,
    ior: 1.35,
    // A faint self-glow so the float reads as a lit gas balloon on black water
    // instead of a dark silhouette.
    emissive: col.clone().multiplyScalar(0.35),
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
}
