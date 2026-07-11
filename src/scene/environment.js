import * as THREE from 'three';

// Black water — but not *dead* black. A siphonophore lives in the deep, so the
// world stays dark, yet it's tinted and textured: a downwelling gradient from
// faint blue-teal at the top into indigo below, a slow large-scale hue drift, and
// a soft central haze — enough that the void reads as *water*, not a black card.
// The darkness still sells the additive gel + bloom; it's just no longer boring.
export function buildEnvironment(scene, renderer) {
  const top = new THREE.Color(0x0c2236); // faint downwelling light
  const bottom = new THREE.Color(0x01030a); // the abyss

  const domeGeo = new THREE.SphereGeometry(1, 48, 32);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTop: { value: top }, uBottom: { value: bottom }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uTop, uBottom;
      uniform float uTime;
      void main(){
        vec3 nd = normalize(vDir);
        float h = nd.y;
        float a = atan(nd.z, nd.x);
        vec3 col = mix(uBottom, uTop, smoothstep(-0.45, 0.95, h));
        // Slow large-scale hue drift — teal and indigo cells breathing through the dark.
        float cells = 0.5 + 0.5 * sin(a * 2.0 + h * 3.0 + uTime * 0.05)
                          * cos(a * 3.0 - h * 2.0 - uTime * 0.03);
        col += vec3(0.010, 0.028, 0.045) * cells;
        col += vec3(0.020, 0.012, 0.038) * smoothstep(0.1, -0.8, h); // indigo depths
        // Soft downwelling glow up top (surface impossibly far above).
        col += uTop * 0.5 * smoothstep(0.25, 1.0, h);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);

  scene.fog = new THREE.FogExp2(bottom.getHex(), 0.05);
  scene.environmentIntensity = 0.3;

  const key = new THREE.DirectionalLight(0xd6efff, 1.15);
  key.position.set(0.3, 4, 1.5);
  scene.add(key);
  const fill = new THREE.HemisphereLight(0x244f66, 0x01030a, 0.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x3f86ba, 0.75);
  rim.position.set(-2, -0.5, -2.5);
  scene.add(rim);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(domeGeo, domeMat.clone());
  envDome.scale.setScalar(10);
  envScene.add(envDome);
  envScene.add(new THREE.HemisphereLight(0x2c5c78, 0x01030a, 1.0));
  scene.environment = pmrem.fromScene(envScene).texture;

  return {
    setScale(s) {
      scene.fog.density = 0.42 / (s + 0.5);
      key.position.set(s * 0.3, s * 4, s * 1.5);
      rim.position.set(-s * 2, -s * 0.5, -s * 2.5);
    },
    update(t, camera) {
      domeMat.uniforms.uTime.value = t;
      if (camera) {
        dome.position.copy(camera.position);
        dome.scale.setScalar((camera.far - camera.near) * 0.45);
      }
    },
  };
}

// Marine snow — the rich particulate of black water. A dense field of soft, round,
// gently twinkling motes at varied sizes and depths; under bloom they glow and
// sparkle, giving the water body and scale. One custom point shader (per-particle
// size + twinkle, soft sprite) rather than flat squares.
export function buildMarineSnow(scene, count = 1400) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * 2 - 1;
    pos[i * 3 + 1] = Math.random() * 2 - 1;
    pos[i * 3 + 2] = Math.random() * 2 - 1;
    // Mostly fine dust with a small scatter of bigger flecks.
    const big = Math.random() < 0.08;
    size[i] = big ? 1.6 + Math.random() * 2.2 : 0.35 + Math.random() * 0.9;
    phase[i] = Math.random();
    spd[i] = 0.2 + Math.random() * 0.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPxScale: { value: 30 }, // world→pixel size factor (scaled with the colony)
      uColor: { value: new THREE.Color(0x5f86a6) },
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime, uPxScale;
      varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = 0.5 + 0.5 * sin(uTime * 1.3 + aPhase * 6.2831);
        gl_PointSize = clamp(aSize * uPxScale / max(0.05, -mv.z), 0.0, 14.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColor;
      varying float vTw;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(uColor * vTw, a * vTw * 0.4);
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  let box = 1;
  return {
    points,
    setScale(s) {
      box = s * 2.6;
      points.scale.setScalar(box);
      mat.uniforms.uPxScale.value = s * 16 + 6;
    },
    update(dt) {
      mat.uniforms.uTime.value += dt;
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] -= spd[i] * dt * 0.03;
        p[i * 3] += Math.sin((p[i * 3 + 1] + i) * 1.5) * dt * 0.006; // lazy lateral drift
        if (p[i * 3 + 1] < -1) { p[i * 3 + 1] = 1; p[i * 3] = Math.random() * 2 - 1; }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
