'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useRef, useMemo, type ReactNode } from 'react';
import type { Group, Mesh } from 'three';

/**
 * The subjects Learnify teaches, orbiting a core.
 *
 * Physics as an atom, Chemistry as a molecule, Biology as a helix, Maths as a
 * polyhedron, Computer Science as a bracket pair, English as a book. Reads as
 * "an academy" rather than generic abstract 3D.
 *
 * Loaded only via `next/dynamic` from `<Hero3D>`; never import it directly, or
 * three.js ends up in the main bundle.
 */

const PRIMARY = '#DF6639';
const PRIMARY_LIGHT = '#F48D75';
const CHARCOAL = '#66625C';
const PAPER = '#F2EEE9';

/* ---------------------------------------------------------------- subjects */

function Atom({ color }: { color: string }) {
  const rings = useRef<Group>(null);
  useFrame((_, delta) => {
    if (rings.current) rings.current.rotation.z += delta * 0.6;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
      <group ref={rings}>
        {[0, Math.PI / 3, -Math.PI / 3].map((tilt, i) => (
          <mesh key={i} rotation={[Math.PI / 2, tilt, 0]}>
            <torusGeometry args={[0.46, 0.022, 8, 48]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Molecule({ color }: { color: string }) {
  // Tetrahedral-ish arrangement: a centre bonded to three outer atoms.
  const bonds: Array<[number, number, number]> = [
    [0.42, 0.28, 0],
    [-0.42, 0.24, 0.18],
    [0.05, -0.44, -0.22],
  ];
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.35} />
      </mesh>
      {bonds.map((position, i) => (
        <group key={i}>
          <mesh position={position}>
            <sphereGeometry args={[0.13, 14, 14]} />
            <meshStandardMaterial color={PAPER} roughness={0.5} />
          </mesh>
          {/* Bond: a thin box stretched from centre to the outer atom */}
          <mesh
            position={[position[0] / 2, position[1] / 2, position[2] / 2]}
            scale={[
              Math.hypot(...position),
              0.035,
              0.035,
            ]}
            rotation={[0, Math.atan2(-position[2], position[0]), Math.atan2(position[1], Math.hypot(position[0], position[2]))]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={CHARCOAL} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Helix({ color }: { color: string }) {
  const beads = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const t = (i / 13) * Math.PI * 2.2;
        const y = (i / 13 - 0.5) * 1.0;
        return { t, y };
      }),
    []
  );
  return (
    <group>
      {beads.map(({ t, y }, i) => (
        <group key={i}>
          <mesh position={[Math.cos(t) * 0.26, y, Math.sin(t) * 0.26]}>
            <sphereGeometry args={[0.062, 10, 10]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[-Math.cos(t) * 0.26, y, -Math.sin(t) * 0.26]}>
            <sphereGeometry args={[0.062, 10, 10]} />
            <meshStandardMaterial color={PAPER} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Polyhedron({ color }: { color: string }) {
  return (
    <mesh>
      <icosahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial color={color} roughness={0.25} metalness={0.55} flatShading />
    </mesh>
  );
}

/** Angle brackets — `{ }` rendered as chunky geometry. */
function Brackets({ color }: { color: string }) {
  const bar = (
    key: string,
    position: [number, number, number],
    rotation: number
  ) => (
    <mesh key={key} position={position} rotation={[0, 0, rotation]}>
      <boxGeometry args={[0.34, 0.07, 0.07]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.35} />
    </mesh>
  );
  return (
    <group>
      {bar('lt', [-0.26, 0.16, 0], -0.9)}
      {bar('lb', [-0.26, -0.16, 0], 0.9)}
      {bar('rt', [0.26, 0.16, 0], 0.9)}
      {bar('rb', [0.26, -0.16, 0], -0.9)}
    </group>
  );
}

function Book({ color }: { color: string }) {
  return (
    <group rotation={[0.2, 0.4, 0]}>
      <mesh>
        <boxGeometry args={[0.62, 0.82, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
      </mesh>
      {/* Pages peeking out of the cover */}
      <mesh position={[0.02, 0, 0.055]}>
        <boxGeometry args={[0.56, 0.76, 0.02]} />
        <meshStandardMaterial color={PAPER} roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------- scene */

const SUBJECTS: Array<{ node: (color: string) => ReactNode; color: string }> = [
  { node: c => <Atom color={c} />, color: PRIMARY },
  { node: c => <Molecule color={c} />, color: PRIMARY_LIGHT },
  { node: c => <Helix color={c} />, color: PRIMARY },
  { node: c => <Polyhedron color={c} />, color: CHARCOAL },
  { node: c => <Brackets color={c} />, color: PRIMARY_LIGHT },
  { node: c => <Book color={c} />, color: PRIMARY },
];

function Orbiter({
  children,
  angle,
  radius,
  height,
  speed,
}: {
  children: ReactNode;
  angle: number;
  radius: number;
  height: number;
  speed: number;
}) {
  const spin = useRef<Mesh | Group | null>(null);
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * speed;
  });
  return (
    <group
      position={[Math.cos(angle) * radius, height, Math.sin(angle) * radius]}
    >
      <Float speed={1.1} rotationIntensity={0.3} floatIntensity={0.7}>
        <group ref={spin as never}>{children}</group>
      </Float>
    </group>
  );
}

function Core() {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.2;
    mesh.current.rotation.x += delta * 0.08;
  });
  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial
          color={PRIMARY}
          emissive={PRIMARY}
          emissiveIntensity={0.35}
          roughness={0.2}
          metalness={0.7}
          flatShading
        />
      </mesh>
    </Float>
  );
}

function System() {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.14;
    // Ease toward the pointer for parallax rather than snapping
    const { x, y } = state.pointer;
    group.current.rotation.x += (y * 0.18 - group.current.rotation.x) * 0.04;
    group.current.position.x += (x * 0.25 - group.current.position.x) * 0.03;
  });

  return (
    <group ref={group}>
      <Core />
      {SUBJECTS.map((subject, i) => (
        <Orbiter
          key={i}
          angle={(i / SUBJECTS.length) * Math.PI * 2}
          radius={1.95}
          height={i % 2 === 0 ? 0.32 : -0.34}
          speed={0.3 + (i % 3) * 0.15}
        >
          {subject.node(subject.color)}
        </Orbiter>
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      // Cap DPR: retina phones would otherwise render at 3x and tank framerate.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.3, 5.4], fov: 45 }}
      // `default` power preference lets laptops stay on the integrated GPU,
      // which keeps fans quiet on a marketing page.
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.9} color="#FFF6F0" />
      <directionalLight position={[-4, -1, 2]} intensity={0.8} color={PRIMARY} />
      <pointLight position={[0, 0, 1.5]} intensity={2.4} color={PRIMARY} distance={6} />
      <System />
    </Canvas>
  );
}
