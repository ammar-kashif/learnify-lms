'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Loads Framer Motion's feature set lazily.
 *
 * Importing the full `motion` component pulls the whole animation engine into
 * the entry bundle (~35 kB). With `LazyMotion` + the lightweight `m` component,
 * only a small shim ships up front and `domAnimation` (animations, variants,
 * hover/tap gestures, whileInView) streams in separately.
 *
 * Components under this provider must use `m.*`, never `motion.*` — mixing them
 * defeats the split, because importing `motion` re-bundles everything.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
