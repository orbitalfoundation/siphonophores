import * as THREE from 'three';

// Black water. Unlike the fish project's sunlit shallows, a siphonophore lives in
// the deep — so the world is near-black with only a faint downwelling gradient, a
// soft key from above to model the gel, and drifting particulate. The darkness is
// the point: it's what makes the additive gel and bioluminescence read.
export function buildEnvironment(scene, renderer) {
  const top = new THREE.Color(0x0a1c2e); // faintest downwelling light
  const bottom = new THREE.Color(0x01030a); // the abyss

  const domeGeo = new THREE.SphereGeometry(1, 32, 24);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTop: { value: top }, uBottom: { value: bottom } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uTop, uBottom;
      void main(){
        float h = normalize(vDir).y;
        vec3 col = mix(uBottom, uTop, smoothstep(-0.35, 0.9, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);

  scene.fog = new THREE.FogExp2(bottom.getHex(), 0.06);
  scene.environmentIntensity = 0.25;

  // A soft cool key from above (a hint of surface light filtering down) plus a
  // dim blue fill. Kept low so the gel's own fresnel/emissive dominates.
  const key = new THREE.DirectionalLight(0xcfeaff, 1.1);
  key.position.set(0.3, 4, 1.5);
  scene.add(key);

  const fill = new THREE.HemisphereLight(0x22485f, 0x01030a, 0.35);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x3a7fb0, 0.7);
  rim.position.set(-2, -0.5, -2.5);
  scene.add(rim);

  // Environment reflections from the dark gradient (keeps the float PBR grounded).
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(domeGeo, domeMat.clone());
  envDome.scale.setScalar(10);
  envScene.add(envDome);
  envScene.add(new THREE.HemisphereLight(0x2a5570, 0x01030a, 1.0));
  scene.environment = pmrem.fromScene(envScene).texture;

  return {
    setScale(s) {
      scene.fog.density = 0.5 / (s + 0.5);
      key.position.set(s * 0.3, s * 4, s * 1.5);
      rim.position.set(-s * 2, -s * 0.5, -s * 2.5);
    },
    update(t, camera) {
      if (camera) {
        dome.position.copy(camera.position);
        dome.scale.setScalar((camera.far - camera.near) * 0.45);
      }
    },
  };
}

// Marine snow: slow-drifting motes, dimmer than the shallow-water version, giving
// the black water depth and a sense of scale.
export function buildMarineSnow(scene, count = 700) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * 2 - 1;
    pos[i * 3 + 1] = Math.random() * 2 - 1;
    pos[i * 3 + 2] = Math.random() * 2 - 1;
    spd[i] = 0.2 + Math.random() * 0.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x9fc4de, size: 0.01, transparent: true, opacity: 0.35,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    setScale(s) { points.scale.setScalar(s * 2.2); mat.size = s * 0.005; },
    update(dt) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] -= spd[i] * dt * 0.03;
        if (p[i * 3 + 1] < -1) p[i * 3 + 1] = 1;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
