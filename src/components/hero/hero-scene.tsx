'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import { CanvasTexture, DoubleSide, type Group, type Mesh } from 'three';

/**
 * Floating past papers.
 *
 * Sheets of exam paper tumbling slowly through depth with warm light raking
 * across them — a nod to the "Past Paper Mastery System" on the page.
 *
 * Loaded only via `next/dynamic` from `<Hero3D>`; never import it directly or
 * three.js ends up in the main bundle.
 */

const PAPER = '#FAFAF8';
const INK = '#C9C9C4';
const INK_DARK = '#9A9A94';
const PRIMARY = '#DF6639';

/** Deterministic PRNG — Math.random would differ between renders. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Draws a sheet of exam paper to a canvas: a heading, ruled text lines of
 * varying length, and an orange mark in the margin. Cheaper and sharper than
 * loading an image, and it scales with devicePixelRatio for free.
 */
function makePaperTexture(seed: number): CanvasTexture {
  const width = 384;
  const height = 543; // A4-ish
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const random = makeRandom(seed);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  const margin = 40;

  // Heading
  ctx.fillStyle = INK_DARK;
  ctx.fillRect(margin, 52, width * 0.42, 11);
  ctx.fillRect(margin, 76, width * 0.26, 7);

  // Question blocks
  let y = 122;
  while (y < height - 70) {
    // Question number
    ctx.fillStyle = INK_DARK;
    ctx.fillRect(margin, y, 12, 7);

    const lines = 2 + Math.floor(random() * 3);
    ctx.fillStyle = INK;
    for (let i = 0; i < lines && y < height - 70; i++) {
      const indent = margin + 22;
      const lineWidth = (width - indent - margin) * (0.55 + random() * 0.45);
      ctx.fillRect(indent, y, lineWidth, 6);
      y += 16;
    }

    // Occasional marks bracket in the right margin, in brand orange
    if (random() > 0.55) {
      ctx.fillStyle = PRIMARY;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(width - margin - 18, y - 14, 16, 6);
      ctx.globalAlpha = 1;
    }

    y += 18;
  }

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

interface SheetProps {
  texture: CanvasTexture;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  spin: [number, number];
  floatSpeed: number;
}

function Sheet({ texture, position, rotation, scale, spin, floatSpeed }: SheetProps) {
  const mesh = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * spin[0];
    mesh.current.rotation.x += delta * spin[1];
  });

  return (
    <Float speed={floatSpeed} rotationIntensity={0.25} floatIntensity={0.8}>
      <mesh ref={mesh} position={position} rotation={rotation} scale={scale}>
        {/* A4 aspect */}
        <planeGeometry args={[1, 1.414]} />
        <meshStandardMaterial
          map={texture}
          side={DoubleSide}
          roughness={0.85}
          metalness={0.02}
        />
      </mesh>
    </Float>
  );
}

function Papers() {
  const group = useRef<Group>(null);

  // Three texture variants shared across the sheets — one per sheet would be
  // needless memory for a decorative background.
  const textures = useMemo(() => [1, 2, 3].map(s => makePaperTexture(s * 9973)), []);

  const sheets = useMemo(() => {
    const random = makeRandom(20260725);
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 2.1 + random() * 1.5;
      return {
        texture: textures[i % textures.length],
        position: [
          Math.cos(angle) * radius,
          (random() - 0.5) * 3.2,
          Math.sin(angle) * radius - 0.5,
        ] as [number, number, number],
        rotation: [
          (random() - 0.5) * 1.2,
          (random() - 0.5) * 2,
          (random() - 0.5) * 0.7,
        ] as [number, number, number],
        scale: 0.85 + random() * 0.5,
        spin: [0.05 + random() * 0.12, 0.02 + random() * 0.05] as [number, number],
        floatSpeed: 0.9 + random() * 0.8,
      };
    });
  }, [textures]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.06;
    // Ease the whole stack toward the pointer for parallax
    const { x, y } = state.pointer;
    group.current.position.x += (x * 0.4 - group.current.position.x) * 0.02;
    group.current.position.y += (y * 0.3 - group.current.position.y) * 0.02;
  });

  return (
    <group ref={group}>
      {sheets.map((sheet, i) => (
        <Sheet key={i} {...sheet} />
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      // Cap DPR: retina phones would otherwise render at 3x and tank framerate.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      // `default` power preference lets laptops stay on the integrated GPU,
      // which keeps fans quiet on a marketing page.
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.1} />
      {/* Warm key light rakes across the sheets as they turn */}
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#FFF6F0" />
      <directionalLight position={[-4, -1, 2]} intensity={0.7} color={PRIMARY} />
      <Papers />
    </Canvas>
  );
}
