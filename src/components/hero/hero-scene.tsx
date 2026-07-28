'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
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
 * Nodes drift inside a box and are joined by a line whenever two come within
 * range, so the mesh continuously forms and dissolves. The cursor shoves nodes
 * aside and lights them up; they spring back once it leaves.
 *
 * Loaded only via `next/dynamic` from `<Hero3D>`; never import it directly, or
 * three.js ends up in the main bundle.
 */

const NODES = 135;
/** Nodes closer than this get joined. */
const LINK_DIST = 1.12;
/** Upper bound on segments so a dense frame cannot overflow the buffer. */
const MAX_LINKS = 1800;

const BOUNDS = { x: 3.9, y: 2.4, z: 1.9 };

/** Cursor influence radius, how far a node is shoved at the centre of it, and
 *  how fast a node chases its target. Higher RESPONSE = snappier. */
const CURSOR_RADIUS = 2.6;
const PUSH_DISTANCE = 1.15;
const RESPONSE = 16;

/** Two palettes: lines fade toward the *background*, not to alpha, so the far
 *  colour has to match whichever ground the mesh is sitting on. */
const PALETTE = {
  dark: {
    pale: new Color('#E6EAF2'),
    accent: new Color('#DF6639'),
    hot: new Color('#FF9E6B'),
    lineNear: new Color('#8A8F98'),
    lineFar: new Color('#0E1220'),
  },
  light: {
    pale: new Color('#7A828F'),
    accent: new Color('#DF6639'),
    hot: new Color('#B03A1A'),
    lineNear: new Color('#9AA1AC'),
    lineFar: new Color('#F1F2F5'),
  },
} as const;

/** Deterministic PRNG — Math.random would differ between renders. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function Constellation({ dark }: { dark: boolean }) {
  const pointsRef = useRef<ThreePoints>(null);
  const linesRef = useRef<ThreeLineSegments>(null);
  const cursor = useRef({ x: 0, y: 0 });
  /** Pointer in normalised device coords, tracked on window. */
  const ndc = useRef({ x: 0, y: 0, seen: false });
  const gl = useThree(state => state.gl);
  const theme = dark ? PALETTE.dark : PALETTE.light;

  // R3F derives state.pointer from its own listeners on the canvas, but the
  // canvas is pointer-events-none so it lives behind the copy and never
  // receives them. Track the pointer on window instead and map it through the
  // canvas rect ourselves.
  useEffect(() => {
    const el = gl.domElement;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      ndc.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.current.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      ndc.current.seen = true;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [gl]);

  // The cloud is authored in world units, so at a fixed camera it would look
  // huge on a laptop and lost on an ultrawide. Scale it against viewport width
  // instead, and place it as a fraction of that width, so it holds the same
  // position and proportion on every screen.
  const { viewport } = useThree();
  const REFERENCE_WIDTH = 10.2; // world units across a 16:9 frame at this camera
  const scale = Math.min(Math.max(viewport.width / REFERENCE_WIDTH, 0.62), 1.4);
  const offsetX = viewport.width * 0.2;

  const {
    positions,
    homes,
    velocities,
    baseColors,
    pointGeom,
    lineGeom,
    pointMat,
    lineMat,
  } = useMemo(() => {
    const random = makeRandom(20260727);

    const positions = new Float32Array(NODES * 3);
    const homes = new Float32Array(NODES * 3);
    const velocities = new Float32Array(NODES * 3);
    const baseColors = new Float32Array(NODES * 3);
    const colors = new Float32Array(NODES * 3);

    for (let i = 0; i < NODES; i++) {
      const ix = i * 3;
      homes[ix] = (random() * 2 - 1) * BOUNDS.x;
      homes[ix + 1] = (random() * 2 - 1) * BOUNDS.y;
      homes[ix + 2] = (random() * 2 - 1) * BOUNDS.z;
      positions[ix] = homes[ix];
      positions[ix + 1] = homes[ix + 1];
      positions[ix + 2] = homes[ix + 2];

      velocities[ix] = (random() - 0.5) * 0.06;
      velocities[ix + 1] = (random() - 0.5) * 0.06;
      velocities[ix + 2] = (random() - 0.5) * 0.04;

      // Every seventh node picks up the brand orange
      const c = i % 7 === 0 ? theme.accent : theme.pale;
      baseColors[ix] = colors[ix] = c.r;
      baseColors[ix + 1] = colors[ix + 1] = c.g;
      baseColors[ix + 2] = colors[ix + 2] = c.b;
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
      size: 0.045,
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

    return {
      positions,
      homes,
      velocities,
      baseColors,
      pointGeom,
      lineGeom,
      pointMat,
      lineMat,
    };
  }, [theme]);

  useFrame((_, delta) => {
    // Clamp: a backgrounded tab hands back a huge delta on return and would
    // fling every node out of bounds at once.
    const step = Math.min(delta, 0.05);

    const rot = pointsRef.current?.rotation.y ?? 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Screen pointer -> world -> this group's local space. Ignoring the group
    // offset, scale and yaw is what made the cursor push in the wrong place.
    // Parked far away until the pointer has actually moved, so nothing is
    // displaced on load.
    const worldX = (ndc.current.x * viewport.width) / 2;
    const worldY = (ndc.current.y * viewport.height) / 2;
    cursor.current.x = ndc.current.seen ? (worldX - offsetX) / scale : 1e6;
    cursor.current.y = ndc.current.seen ? worldY / scale : 1e6;

    const colorAttr = pointGeom.getAttribute('color') as BufferAttribute;
    const colorArr = colorAttr.array as Float32Array;
    const radius2 = CURSOR_RADIUS * CURSOR_RADIUS;

    for (let i = 0; i < NODES; i++) {
      const ix = i * 3;

      // Home drifts; the node springs toward it, so any displacement decays on
      // its own once the cursor moves away.
      homes[ix] += velocities[ix] * step;
      homes[ix + 1] += velocities[ix + 1] * step;
      homes[ix + 2] += velocities[ix + 2] * step;
      if (Math.abs(homes[ix]) > BOUNDS.x) velocities[ix] *= -1;
      if (Math.abs(homes[ix + 1]) > BOUNDS.y) velocities[ix + 1] *= -1;
      if (Math.abs(homes[ix + 2]) > BOUNDS.z) velocities[ix + 2] *= -1;

      // Compare against where the node's home actually *appears*: the mesh
      // spins, so local x and z are mixed by the yaw before reaching the screen.
      const homeVisualX = homes[ix] * cos + homes[ix + 2] * sin;
      const dx = homeVisualX - cursor.current.x;
      const dy = homes[ix + 1] - cursor.current.y;
      const d2 = dx * dx + dy * dy;

      // Solve for a target position each frame rather than accumulating force.
      // Accumulating took several frames to build up and several more to decay,
      // which is what read as lag.
      let targetX = homes[ix];
      let targetY = homes[ix + 1];
      let targetZ = homes[ix + 2];
      let heat = 0;
      if (d2 < radius2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const falloff = 1 - d / CURSOR_RADIUS;
        heat = falloff;
        const shiftX = (dx / d) * falloff * PUSH_DISTANCE;
        targetX += shiftX * cos;
        targetZ += shiftX * sin;
        targetY += (dy / d) * falloff * PUSH_DISTANCE;
      }

      // Frame-rate independent chase toward the target
      const k = 1 - Math.exp(-RESPONSE * step);
      positions[ix] += (targetX - positions[ix]) * k;
      positions[ix + 1] += (targetY - positions[ix + 1]) * k;
      positions[ix + 2] += (targetZ - positions[ix + 2]) * k;

      // Nodes light up as the cursor nears them
      colorArr[ix] = baseColors[ix] + (theme.hot.r - baseColors[ix]) * heat;
      colorArr[ix + 1] =
        baseColors[ix + 1] + (theme.hot.g - baseColors[ix + 1]) * heat;
      colorArr[ix + 2] =
        baseColors[ix + 2] + (theme.hot.b - baseColors[ix + 2]) * heat;
    }
    pointGeom.getAttribute('position').needsUpdate = true;
    colorAttr.needsUpdate = true;

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
        const r = theme.lineFar.r + (theme.lineNear.r - theme.lineFar.r) * t;
        const g = theme.lineFar.g + (theme.lineNear.g - theme.lineFar.g) * t;
        const b = theme.lineFar.b + (theme.lineNear.b - theme.lineFar.b) * t;
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
    <group position={[offsetX, 0, 0]} scale={scale}>
      <points ref={pointsRef} geometry={pointGeom} material={pointMat} />
      <lineSegments ref={linesRef} geometry={lineGeom} material={lineMat} />
    </group>
  );
}

export default function HeroScene({ dark = true }: { dark?: boolean }) {
  return (
    <Canvas
      // Cap DPR: retina phones would otherwise render at 3x and tank framerate.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ background: 'transparent' }}
    >
      <Constellation dark={dark} />
    </Canvas>
  );
}
