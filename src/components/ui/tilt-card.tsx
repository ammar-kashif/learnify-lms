'use client';

import {
  m,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import { useRef, type ReactNode, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees at the card's edge. */
  intensity?: number;
  /** Adds a light sheen that tracks the pointer. */
  glare?: boolean;
}

/**
 * Pointer-tracked 3D tilt using CSS transforms — no WebGL, no bundle cost.
 *
 * Disabled entirely under `prefers-reduced-motion`, and driven by pointer
 * events so it simply never engages on touch devices (where a tilt that
 * can't follow a cursor would just feel broken).
 */
export default function TiltCard({
  children,
  className,
  intensity = 8,
  glare = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // -0.5 .. 0.5, relative to card centre
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const springed = { stiffness: 300, damping: 30, mass: 0.6 };
  const rotateX = useSpring(
    useTransform(py, [-0.5, 0.5], [intensity, -intensity]),
    springed
  );
  const rotateY = useSpring(
    useTransform(px, [-0.5, 0.5], [-intensity, intensity]),
    springed
  );

  // Built with useMotionTemplate so the gradient stays reactive — reading
  // motion values with .get() inside a style string would freeze at mount.
  const glareX = useSpring(useTransform(px, [-0.5, 0.5], [0, 100]), springed);
  const glareY = useSpring(useTransform(py, [-0.5, 0.5], [0, 100]), springed);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.35), transparent 55%)`;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    // Coarse pointers (touch) don't hover, so tilting on tap reads as a glitch.
    if (event.pointerType !== 'mouse') return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function reset() {
    px.set(0);
    py.set(0);
  }

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('[perspective:1200px]', className)}>
      <m.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative h-full w-full will-change-transform"
      >
        {children}
        {glare && (
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [transform:translateZ(1px)] group-hover:opacity-100"
            style={{ background: glareBackground }}
          />
        )}
      </m.div>
    </div>
  );
}
