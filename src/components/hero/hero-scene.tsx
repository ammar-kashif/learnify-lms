'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import type { Mesh, Group } from 'three';

/**
 * The 3D hero scene. Loaded only via `next/dynamic` from `<Hero3D>` — never
 * import this directly, or three.js lands in the main bundle.
 *
 * Brand palette only: primary #DF6639, charcoal #3E3E3C.
 */

const PRIMARY = '#DF6639';
const PRIMARY_LIGHT = '#F48D75';
const CHARCOAL = '#3E3E3C';

/** Centrepiece: a slowly distorting sphere that drifts with the pointer. */
function Knot() {
  const mesh = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.15;
    mesh.current.rotation.x += delta * 0.05;
    // Ease toward the pointer rather than snapping — pointer is -1..1.
    const { x, y } = state.pointer;
    mesh.current.position.x += (x * 0.35 - mesh.current.position.x) * 0.03;
    mesh.current.position.y += (y * 0.25 - mesh.current.position.y) * 0.03;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.9}>
      <mesh ref={mesh} scale={1.35}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshDistortMaterial
          color={PRIMARY}
          distort={0.32}
          speed={1.6}
          roughness={0.25}
          metalness={0.65}
        />
      </mesh>
    </Float>
  );
}

/** Orbiting shapes that give the scene parallax and depth. */
function Orbiters() {
  const group = useRef<Group>(null);

  // Deterministic — Math.random() here would differ per render and, more
  // importantly, mismatch between server and client on any future SSR path.
  const shapes = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        const radius = 2.6 + (i % 3) * 0.45;
        return {
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle * 1.7) * 1.2,
            Math.sin(angle) * radius,
          ] as [number, number, number],
          scale: 0.13 + (i % 4) * 0.045,
          color: i % 3 === 0 ? PRIMARY_LIGHT : i % 3 === 1 ? PRIMARY : CHARCOAL,
          kind: i % 2,
        };
      }),
    []
  );

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={group}>
      {shapes.map((shape, i) => (
        <Float
          key={i}
          speed={1 + (i % 3) * 0.35}
          rotationIntensity={0.7}
          floatIntensity={1.1}
        >
          <mesh position={shape.position} scale={shape.scale}>
            {shape.kind === 0 ? (
              <octahedronGeometry args={[1, 0]} />
            ) : (
              <torusGeometry args={[1, 0.38, 12, 32]} />
            )}
            <meshStandardMaterial
              color={shape.color}
              roughness={0.3}
              metalness={0.55}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      // Cap DPR: retina phones would otherwise render 3x and tank the framerate.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      // `powerPreference: default` lets the browser pick the integrated GPU on
      // laptops, which keeps fans quiet on a marketing page.
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 3]} intensity={1.5} color="#FFFFFF" />
      <pointLight position={[-4, -2, -3]} intensity={2.2} color={PRIMARY} />
      <Knot />
      <Orbiters />
      <Environment preset="city" />
    </Canvas>
  );
}
