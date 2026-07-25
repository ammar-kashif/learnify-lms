'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  ShaderMaterial,
  type Points as ThreePoints,
} from 'three';

/**
 * GPU particle morph.
 *
 * ~7000 points in a single draw call, morphing between shapes that mean
 * something here: a star (the A* everything on this page is aimed at), an open
 * book, an atom, and a sphere. The morph and the cursor repulsion both run in
 * the vertex shader, so the CPU only uploads a buffer when the target shape
 * changes — roughly once every four seconds.
 *
 * Loaded only via `next/dynamic` from `<Hero3D>`; never import it directly, or
 * three.js ends up in the main bundle.
 */

const COUNT = 7000;
const HOLD = 2.6; // seconds a shape rests before morphing
const MORPH = 1.6; // seconds the morph itself takes

/** Deterministic PRNG — Math.random would differ between renders. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/* ------------------------------------------------------------ shape fields */

/** Evenly distributed points on a sphere. */
function sphereShape(count: number, radius: number, random: () => number) {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    // Slight jitter stops it reading as a perfect wireframe
    const jitter = 0.94 + random() * 0.12;
    out[i * 3] = Math.cos(theta) * r * radius * jitter;
    out[i * 3 + 1] = y * radius * jitter;
    out[i * 3 + 2] = Math.sin(theta) * r * radius * jitter;
  }
  return out;
}

/** Solid five-pointed star with a little depth — the A*. */
function starShape(count: number, outer: number, random: () => number) {
  const out = new Float32Array(count * 3);
  const inner = outer * 0.42;
  const points = 5;
  for (let i = 0; i < count; i++) {
    // Pick a triangle of the star fan, then a random point inside it
    const segment = Math.floor(random() * points * 2);
    const a0 = (segment / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((segment + 1) / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r0 = segment % 2 === 0 ? outer : inner;
    const r1 = segment % 2 === 0 ? inner : outer;

    // Barycentric sample across centre, p0, p1
    let u = random();
    let v = random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const x = u * Math.cos(a0) * r0 + v * Math.cos(a1) * r1;
    const y = u * Math.sin(a0) * r0 + v * Math.sin(a1) * r1;

    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (random() - 0.5) * 0.28;
  }
  return out;
}

/** Open book: two pages angled from a spine. */
function bookShape(count: number, size: number, random: () => number) {
  const out = new Float32Array(count * 3);
  const tilt = 0.42;
  for (let i = 0; i < count; i++) {
    const side = random() > 0.5 ? 1 : -1;
    const across = random(); // 0 at spine, 1 at outer edge
    const along = random() - 0.5;
    // Pages sag slightly toward the outer edge
    const sag = Math.sin(across * Math.PI * 0.5) * 0.34;

    out[i * 3] = side * across * size * 1.15;
    out[i * 3 + 1] = along * size * 1.35 - sag + 0.1;
    out[i * 3 + 2] = -across * size * tilt + (random() - 0.5) * 0.08;
  }
  return out;
}

/** Atom: a small nucleus inside three tilted electron rings. */
function atomShape(count: number, radius: number, random: () => number) {
  const out = new Float32Array(count * 3);
  const tilts = [0, Math.PI / 3, -Math.PI / 3];
  for (let i = 0; i < count; i++) {
    if (random() < 0.18) {
      // Nucleus
      const t = random() * Math.PI * 2;
      const p = Math.acos(2 * random() - 1);
      const r = radius * 0.22 * Math.cbrt(random());
      out[i * 3] = r * Math.sin(p) * Math.cos(t);
      out[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      out[i * 3 + 2] = r * Math.cos(p);
    } else {
      const tilt = tilts[Math.floor(random() * tilts.length)];
      const angle = random() * Math.PI * 2;
      const r = radius * (0.97 + random() * 0.06);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.42;
      // Rotate the ring around Z by its tilt
      out[i * 3] = x * Math.cos(tilt) - y * Math.sin(tilt);
      out[i * 3 + 1] = x * Math.sin(tilt) + y * Math.cos(tilt);
      out[i * 3 + 2] = (random() - 0.5) * 0.1;
    }
  }
  return out;
}

/* ---------------------------------------------------------------- material */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform vec2  uPointer;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute vec3  aFrom;
  attribute vec3  aTo;
  attribute float aScale;
  attribute float aSeed;

  varying float vMix;
  varying float vSeed;

  void main() {
    // Ease the morph, and stagger it per particle so the shape assembles
    // rather than snapping all at once.
    float staggered = clamp(uProgress * 1.35 - aSeed * 0.35, 0.0, 1.0);
    float eased = staggered * staggered * (3.0 - 2.0 * staggered);

    vec3 pos = mix(aFrom, aTo, eased);

    // Particles bow outward mid-morph, so the transition reads as a burst
    float burst = sin(eased * 3.14159);
    pos += normalize(pos + 0.001) * burst * (0.5 + aSeed * 0.8);

    // Gentle idle drift
    pos.x += sin(uTime * 0.5 + aSeed * 6.28) * 0.045;
    pos.y += cos(uTime * 0.42 + aSeed * 5.13) * 0.045;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Cursor repulsion in view space — falls off quickly so it feels local
    vec2 toPointer = mvPosition.xy - uPointer * 3.2;
    float dist = length(toPointer);
    float push = smoothstep(1.7, 0.0, dist) * 0.9;
    mvPosition.xy += normalize(toPointer + 0.001) * push;

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / -mvPosition.z);

    vMix = burst;
    vSeed = aSeed;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  varying float vMix;
  varying float vSeed;

  void main() {
    // Round, soft-edged point
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.12, d);

    // Two-stage brand ramp, hottest mid-morph
    vec3 base = mix(uColorA, uColorB, vSeed);
    vec3 color = mix(base, uColorC, vMix * 0.65);

    gl_FragColor = vec4(color, alpha * (0.55 + vMix * 0.45));
  }
`;

/* ------------------------------------------------------------------- scene */

function ParticleMorph() {
  const points = useRef<ThreePoints>(null);
  const state = useRef({ shape: 0, elapsed: 0 });

  const { geometry, material, shapes } = useMemo(() => {
    const random = makeRandom(20260726);
    const shapes = [
      starShape(COUNT, 2.15, random),
      bookShape(COUNT, 1.65, random),
      atomShape(COUNT, 2.0, random),
      sphereShape(COUNT, 1.85, random),
    ];

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(shapes[0].slice(), 3));
    geometry.setAttribute('aFrom', new BufferAttribute(shapes[0].slice(), 3));
    geometry.setAttribute('aTo', new BufferAttribute(shapes[1].slice(), 3));

    const scale = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      scale[i] = 0.6 + random() * 0.9;
      seed[i] = random();
    }
    geometry.setAttribute('aScale', new BufferAttribute(scale, 1));
    geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));

    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      // Normal blending: additive would blow out to white on the light hero.
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uPointer: { value: [0, 0] },
        uSize: { value: 260 },
        uPixelRatio: { value: 1 },
        uColorA: { value: new Color('#DF6639') },
        uColorB: { value: new Color('#F48D75') },
        uColorC: { value: new Color('#B03A1A') },
      },
    });

    return { geometry, material, shapes };
  }, []);

  useFrame(({ clock, pointer, viewport }, delta) => {
    const uniforms = material.uniforms;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixelRatio.value = Math.min(viewport.dpr ?? 1, 2);

    // Ease the pointer so the repulsion trails rather than snaps
    const p = uniforms.uPointer.value as number[];
    p[0] += (pointer.x - p[0]) * 0.08;
    p[1] += (pointer.y - p[1]) * 0.08;

    const s = state.current;
    s.elapsed += delta;

    if (s.elapsed < HOLD) {
      uniforms.uProgress.value = 0;
    } else if (s.elapsed < HOLD + MORPH) {
      uniforms.uProgress.value = (s.elapsed - HOLD) / MORPH;
    } else {
      // Morph finished: current target becomes the new source, pick the next.
      const next = (s.shape + 1) % shapes.length;
      const from = geometry.getAttribute('aFrom') as BufferAttribute;
      const to = geometry.getAttribute('aTo') as BufferAttribute;
      from.copyArray(shapes[next]);
      to.copyArray(shapes[(next + 1) % shapes.length]);
      from.needsUpdate = true;
      to.needsUpdate = true;
      s.shape = next;
      s.elapsed = 0;
      uniforms.uProgress.value = 0;
    }

    if (points.current) points.current.rotation.y += delta * 0.11;
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

export default function HeroScene() {
  return (
    <Canvas
      // Cap DPR: retina phones would otherwise render at 3x and tank framerate.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ background: 'transparent' }}
    >
      <ParticleMorph />
    </Canvas>
  );
}
