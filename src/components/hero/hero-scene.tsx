'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  PointsMaterial,
  type LineSegments as ThreeLineSegments,
  type Points as ThreePoints,
} from 'three';

/**
 * Network constellation.
 *
 * Drifting nodes joined by a line whenever two come within range, so the mesh
 * continuously forms and dissolves. Nodes ease away from the cursor.
 *
 * Loaded only via `next/dynamic` from `<Hero3D>`; never import it directly, or
 * three.js ends up in the main bundle.
 */

const NODES = 120;
/** Nodes closer than this get joined. */
const LINK_DIST = 1.02;
/** Upper bound on segments so a dense frame cannot overflow the buffer. */
const MAX_LINKS = 1500;

const BOUNDS = { x: 3.4, y: 2.1, z: 1.7 };

const NODE_PALE = new Color('#E6EAF2');
const NODE_ACCENT = new Color('#DF6639');
const LINE_NEAR = new Color('#8A8F98');
const LINE_FAR = new Color('#0E1220');

/** Deterministic PRNG — Math.random would differ between renders. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function Constellation() {
  const pointsRef = useRef<ThreePoints>(null);
  const linesRef = useRef<ThreeLineSegments>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const { positions, velocities, pointGeom, lineGeom, pointMat, lineMat } =
    useMemo(() => {
      const random = makeRandom(20260727);

      const positions = new Float32Array(NODES * 3);
      const velocities = new Float32Array(NODES * 3);
      const colors = new Float32Array(NODES * 3);

      for (let i = 0; i < NODES; i++) {
        // Weighted to the right: the copy sits on the left, so bias the cloud
        // away from it rather than masking it out afterwards.
        positions[i * 3] = (random() * 2 - 1) * BOUNDS.x;
        positions[i * 3 + 1] = (random() * 2 - 1) * BOUNDS.y;
        positions[i * 3 + 2] = (random() * 2 - 1) * BOUNDS.z;

        velocities[i * 3] = (random() - 0.5) * 0.06;
        velocities[i * 3 + 1] = (random() - 0.5) * 0.06;
        velocities[i * 3 + 2] = (random() - 0.5) * 0.04;

        // Every seventh node picks up the brand orange
        const c = i % 7 === 0 ? NODE_ACCENT : NODE_PALE;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const pointGeom = new BufferGeometry();
      pointGeom.setAttribute('position', new BufferAttribute(positions, 3));
      pointGeom.setAttribute('color', new BufferAttribute(colors, 3));

      const lineGeom = new BufferGeometry();
      lineGeom.setAttribute(
        'position',
        new BufferAttribute(new Float32Array(MAX_LINKS * 6), 3)
      );
      lineGeom.setAttribute(
        'color',
        new BufferAttribute(new Float32Array(MAX_LINKS * 6), 3)
      );

      const pointMat = new PointsMaterial({
        size: 0.04,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });

      // LineBasicMaterial has no per-vertex alpha, so distance is expressed by
      // darkening toward the background colour instead.
      const lineMat = new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });

      return { positions, velocities, pointGeom, lineGeom, pointMat, lineMat };
    }, []);

  useFrame((state, delta) => {
    // Clamp: a backgrounded tab hands back a huge delta on return and would
    // fling every node out of bounds at once.
    const step = Math.min(delta, 0.05);

    pointer.current.x += (state.pointer.x * BOUNDS.x - pointer.current.x) * 0.05;
    pointer.current.y += (state.pointer.y * BOUNDS.y - pointer.current.y) * 0.05;

    // --- drift, bounce, ease away from the cursor
    for (let i = 0; i < NODES; i++) {
      const ix = i * 3;
      positions[ix] += velocities[ix] * step;
      positions[ix + 1] += velocities[ix + 1] * step;
      positions[ix + 2] += velocities[ix + 2] * step;

      if (Math.abs(positions[ix]) > BOUNDS.x) velocities[ix] *= -1;
      if (Math.abs(positions[ix + 1]) > BOUNDS.y) velocities[ix + 1] *= -1;
      if (Math.abs(positions[ix + 2]) > BOUNDS.z) velocities[ix + 2] *= -1;

      const dx = positions[ix] - pointer.current.x;
      const dy = positions[ix + 1] - pointer.current.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 2.6 && d2 > 0.0001) {
        const push = (1 - d2 / 2.6) * 0.9 * step;
        const inv = 1 / Math.sqrt(d2);
        positions[ix] += dx * inv * push;
        positions[ix + 1] += dy * inv * push;
      }
    }
    pointGeom.getAttribute('position').needsUpdate = true;

    // --- rebuild the links
    const linePos = lineGeom.getAttribute('position') as BufferAttribute;
    const lineCol = lineGeom.getAttribute('color') as BufferAttribute;
    const posArr = linePos.array as Float32Array;
    const colArr = lineCol.array as Float32Array;

    let link = 0;
    for (let i = 0; i < NODES && link < MAX_LINKS; i++) {
      const ix = i * 3;
      for (let j = i + 1; j < NODES && link < MAX_LINKS; j++) {
        const jx = j * 3;
        const dx = positions[ix] - positions[jx];
        const dy = positions[ix + 1] - positions[jx + 1];
        const dz = positions[ix + 2] - positions[jx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > LINK_DIST) continue;

        const o = link * 6;
        posArr[o] = positions[ix];
        posArr[o + 1] = positions[ix + 1];
        posArr[o + 2] = positions[ix + 2];
        posArr[o + 3] = positions[jx];
        posArr[o + 4] = positions[jx + 1];
        posArr[o + 5] = positions[jx + 2];

        // Fade toward the background as the pair separates
        const t = 1 - dist / LINK_DIST;
        const r = LINE_FAR.r + (LINE_NEAR.r - LINE_FAR.r) * t;
        const g = LINE_FAR.g + (LINE_NEAR.g - LINE_FAR.g) * t;
        const b = LINE_FAR.b + (LINE_NEAR.b - LINE_FAR.b) * t;
        colArr[o] = colArr[o + 3] = r;
        colArr[o + 1] = colArr[o + 4] = g;
        colArr[o + 2] = colArr[o + 5] = b;

        link++;
      }
    }

    // Collapse unused slots to a degenerate segment so they render as nothing
    if (link < MAX_LINKS) posArr.fill(0, link * 6);

    linePos.needsUpdate = true;
    lineCol.needsUpdate = true;

    // Very slow yaw so the mesh reads as volumetric rather than flat
    if (pointsRef.current && linesRef.current) {
      pointsRef.current.rotation.y += step * 0.025;
      linesRef.current.rotation.y = pointsRef.current.rotation.y;
    }
  });

  return (
    // Offset right rather than skewing the spread, so the cloud still
    // rotates about its own centre.
    <group position={[2.35, 0, 0]}>
      <points ref={pointsRef} geometry={pointGeom} material={pointMat} />
      <lineSegments ref={linesRef} geometry={lineGeom} material={lineMat} />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      // Cap DPR: retina phones would otherwise render at 3x and tank framerate.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ background: 'transparent' }}
    >
      <Constellation />
    </Canvas>
  );
}
