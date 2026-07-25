import type { Variants, Transition, Easing } from 'framer-motion';

/**
 * Shared motion language.
 *
 * One easing curve and one spring across the app so everything feels like it
 * belongs to the same system. Every consumer must gate these behind
 * framer-motion's `useReducedMotion` — see `<Reveal>` for the pattern.
 */

/** Custom ease-out. Fast start, soft landing — reads as "confident", not bouncy. */
export const EASE: Easing = [0.22, 1, 0.36, 1];

export const SPRING: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 0.8,
};

export const DURATION = {
  fast: 0.25,
  base: 0.5,
  slow: 0.8,
} as const;

/** Fade up — the default entrance for sections and cards. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
};

/** Scale in from slightly back in Z — pairs with a perspective parent. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE },
  },
};

/** Parent that staggers its children. Pair with `fadeUp` on each child. */
export function staggerContainer(stagger = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/** Viewport config for scroll reveals — fire once, slightly before fully in view. */
export const VIEWPORT = { once: true, margin: '-80px' } as const;
