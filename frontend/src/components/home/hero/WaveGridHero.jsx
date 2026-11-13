import React from "react";
import * as THREE from "three";

const MAX_TRAIL_POINTS = 96;

function createWaveVertexShader(vertexShader) {
  return vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      varying float vHeight;
      attribute vec2 aOffset;
      uniform sampler2D uTrailTexture;
      uniform int uTrailCount;
      uniform float uWaveSpeed;
      uniform float uWaveFreq;
      uniform float uWaveWidth;
      uniform float uFadeTime;
      uniform float uAmplitude;
      uniform float uJitter;
      uniform float uMaxHeight;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453123) - 0.5;
      }`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>

      vHeight = 0.0;

      if (position.y > 0.0) {
        vec2 jitter = hash2(aOffset) * uJitter;
        vec2 worldXZ = aOffset + jitter;
        float waveHeight = 0.0;
        float totalWeight = 0.0;

        for (int i = 0; i < ${MAX_TRAIL_POINTS}; i++) {
          if (i >= uTrailCount) break;

          vec4 td = texture2D(
            uTrailTexture,
            vec2((float(i) + 0.5) / ${MAX_TRAIL_POINTS}.0, 0.5)
          );
          float dist = length(worldXZ - td.rg);
          float wavefront = uWaveSpeed * td.b;
          float relDist = dist - wavefront;
          float window = exp(-(relDist * relDist) / (uWaveWidth * uWaveWidth));
          float fade = exp(-td.b / uFadeTime);
          float atten = 1.0 / (1.0 + dist * 0.1);
          float weight = fade * window * atten * td.a;

          waveHeight += weight * cos(uWaveFreq * relDist);
          totalWeight += weight;
        }

        waveHeight /= max(totalWeight, 1.0);
        float displacement = clamp(waveHeight * uAmplitude, -uMaxHeight, uMaxHeight);
        transformed.y += displacement;
        vHeight = displacement;
      }`,
    );
}

export function createWaveGridExperience(canvas) {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return { destroy: () => {} };

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    canvas,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160);
  camera.up.set(0, 0, -1);
  scene.add(camera);

  const ambientLight = new THREE.AmbientLight(0x9ffcff, 0.9);
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-12, 14, 8);
  const fillLight = new THREE.DirectionalLight(0x8b5cf6, 1.6);
  fillLight.position.set(9, 8, -6);
  scene.add(ambientLight, keyLight, fillLight);

  const width = canvas.clientWidth || 1;
  const useLightweightGrid = width < 768
    || (navigator.deviceMemory || 8) < 4
    || (navigator.hardwareConcurrency || 8) < 4;
  const gridSize = useLightweightGrid ? 18 : width < 960 ? 24 : width < 1440 ? 30 : 34;
  const cubeWidth = width < 640 ? 0.72 : 0.76;
  const cubeHeight = width < 640 ? 2.2 : 2.7;
  const gap = 0.035;
  const bounds = gridSize * (cubeWidth + gap);
  const count = gridSize * gridSize;

  const geometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeWidth);
  const offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  geometry.setAttribute("aOffset", offsetAttribute);

  const trailData = new Float32Array(MAX_TRAIL_POINTS * 4);
  const trailTexture = new THREE.DataTexture(
    trailData,
    MAX_TRAIL_POINTS,
    1,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  trailTexture.needsUpdate = true;

  const waveUniforms = {
    uTrailTexture: { value: trailTexture },
    uTrailCount: { value: 0 },
    uFadeTime: { value: 2.6 },
    uWaveSpeed: { value: 6.2 },
    uWaveFreq: { value: 1.35 },
    uWaveWidth: { value: 3.2 },
    uAmplitude: { value: 0.82 },
    uJitter: { value: 0.16 },
    uMaxHeight: { value: 1.05 },
    uColorBase: { value: new THREE.Color("#0f766e") },
    uColorHigh: { value: new THREE.Color("#a5f3fc") },
  };

  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: new THREE.Color("#0f766e"),
    emissiveIntensity: 0.22,
    shininess: 90,
    specular: new THREE.Color("#7dd3fc"),
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waveUniforms);
    shader.vertexShader = createWaveVertexShader(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vHeight;
        uniform vec3 uColorBase;
        uniform vec3 uColorHigh;
        uniform float uMaxHeight;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float waveMix = clamp((vHeight / uMaxHeight) * 0.82, 0.0, 1.0);
        diffuseColor.rgb = mix(uColorBase, uColorHigh, waveMix);`,
      );
  };

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const spacing = cubeWidth + gap;
  const offset = ((gridSize - 1) * spacing) / 2;

  for (let i = 0; i < gridSize; i += 1) {
    for (let j = 0; j < gridSize; j += 1) {
      const index = i * gridSize + j;
      const x = i * spacing - offset;
      const z = j * spacing - offset;
      dummy.position.set(x, 0, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      offsetAttribute.setXY(index, x, z);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  offsetAttribute.needsUpdate = true;
  mesh.position.set(width < 760 ? 0 : 4.2, -1.15, width < 760 ? 0 : -0.6);
  mesh.rotation.z = width < 760 ? -0.06 : -0.14;
  scene.add(mesh);

  const trail = [];
  let lastPoint = null;
  let timeSincePointer = 0;
  let randomPointTimer = 0;
  let rafId = 0;
  let isVisible = true;
  let lastTime = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let pointerClientX = 0;
  let pointerClientY = 0;
  let hasPendingPointer = false;
  let renderWidth = 0;
  let renderHeight = 0;
  let renderPixelRatio = renderer.getPixelRatio();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const rayPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds * 1.4, bounds * 1.4),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  rayPlane.rotation.x = -Math.PI / 2;
  rayPlane.position.copy(mesh.position);
  scene.add(rayPlane);

  function addTrailPoint(x, z, strength = 0.9) {
    let distDelta = strength;
    if (lastPoint) {
      const dx = x - lastPoint.x;
      const dz = z - lastPoint.z;
      distDelta = Math.sqrt(dx * dx + dz * dz);
      if (distDelta < 0.18) return;
    }

    if (trail.length >= MAX_TRAIL_POINTS) trail.shift();
    trail.push({ x, z, age: 0, distDelta: Math.max(0.2, Math.min(distDelta, 1.25)) });
    lastPoint = { x, z };
  }

  function addRandomPoint() {
    const x = mesh.position.x + (Math.random() - 0.5) * bounds * 0.72;
    const z = mesh.position.z + (Math.random() - 0.5) * bounds * 0.72;
    addTrailPoint(x, z, 0.8 + Math.random() * 0.25);
  }

  function syncTrailTexture(delta) {
    const expiry = waveUniforms.uFadeTime.value * 4;
    for (let i = trail.length - 1; i >= 0; i -= 1) {
      trail[i].age += delta;
      if (trail[i].age > expiry) trail.splice(i, 1);
    }

    const trailCount = Math.min(trail.length, MAX_TRAIL_POINTS);
    for (let i = 0; i < trailCount; i += 1) {
      const ti = i * 4;
      trailData[ti] = trail[i].x;
      trailData[ti + 1] = trail[i].z;
      trailData[ti + 2] = trail[i].age;
      trailData[ti + 3] = trail[i].distDelta;
    }
    waveUniforms.uTrailCount.value = trailCount;
    trailTexture.needsUpdate = true;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width);
    const nextHeight = Math.max(1, rect.height);
    const pixelRatio = Math.min(devicePixelRatio || 1, useLightweightGrid ? 1 : 1.25);
    const sizeChanged = nextWidth !== renderWidth || nextHeight !== renderHeight;
    const pixelRatioChanged = pixelRatio !== renderPixelRatio;
    if (!sizeChanged && !pixelRatioChanged) return;

    if (pixelRatioChanged) {
      renderer.setPixelRatio(pixelRatio);
      renderPixelRatio = pixelRatio;
    }
    if (!sizeChanged) return;
    renderer.setSize(nextWidth, nextHeight, false);
    renderWidth = nextWidth;
    renderHeight = nextHeight;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  }

  function updateCamera() {
    const radius = width < 760 ? 21 : 19;
    const alpha = pointerY * Math.PI * 0.025 + (width < 760 ? 0.08 : 0.02);
    const beta = pointerX * Math.PI * 0.045 + (width < 760 ? 0 : -0.13);
    camera.position.set(
      -radius * Math.cos(alpha) * Math.sin(beta) + (width < 760 ? 0 : 2.4),
      radius * Math.cos(alpha) * Math.cos(beta),
      radius * Math.sin(alpha) + (width < 760 ? 5.2 : 2.6),
    );
    camera.lookAt(width < 760 ? 0 : 3.2, 0, width < 760 ? 0 : -0.8);
  }

  function onPointerMove(event) {
    if (!isVisible || document.hidden) return;
    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    hasPendingPointer = true;
  }

  function updatePointer() {
    if (!hasPendingPointer) return;
    hasPendingPointer = false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    targetPointerX = ((pointerClientX - rect.left) / rect.width) * 2 - 1;
    targetPointerY = -((pointerClientY - rect.top) / rect.height) * 2 + 1;

    pointer.set(targetPointerX, targetPointerY);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(rayPlane);
    if (!hits.length) return;

    addTrailPoint(hits[0].point.x, hits[0].point.z);
    timeSincePointer = 0;
    randomPointTimer = 0;
  }

  function animate(now) {
    rafId = 0;
    if (!isVisible || document.hidden) return;
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    updatePointer();
    pointerX += (targetPointerX - pointerX) * 0.045;
    pointerY += (targetPointerY - pointerY) * 0.045;

    timeSincePointer += delta;
    randomPointTimer += delta;
    if (timeSincePointer > 1.2 && randomPointTimer > 1.05) {
      addRandomPoint();
      randomPointTimer = 0;
    }

    updateCamera();
    syncTrailTexture(delta);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }

  resize();
  updateCamera();
  for (let i = 0; i < 7; i += 1) addRandomPoint();

  function syncAnimation() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    hasPendingPointer = false;
    if (isVisible && !document.hidden) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    }
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    syncAnimation();
  });
  visibilityObserver.observe(canvas);
  document.addEventListener("visibilitychange", syncAnimation);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  addEventListener("pointermove", onPointerMove, { passive: true });
  rafId = requestAnimationFrame(animate);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      scene.remove(mesh, rayPlane);
      geometry.dispose();
      material.dispose();
      rayPlane.geometry.dispose();
      rayPlane.material.dispose();
      trailTexture.dispose();
      renderer.dispose();
    },
  };
}

export default function WaveGridHero() {
  const canvasRef = React.useRef(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (!canvasRef.current) return undefined;
    let experience;
    let readyFrame;

    try {
      experience = createWaveGridExperience(canvasRef.current);
      readyFrame = requestAnimationFrame(() => setIsReady(true));
    } catch (error) {
      canvasRef.current.dataset.waveGridError = "true";
      return undefined;
    }

    return () => {
      cancelAnimationFrame(readyFrame);
      experience?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`hero-stage__wave-grid-canvas${isReady ? " is-ready" : ""}`}
    />
  );
}
