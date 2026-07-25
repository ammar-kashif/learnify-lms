'use client';

import { m, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp, staggerContainer, VIEWPORT } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before animating. Use for hand-tuned sequences. */
  delay?: number;
  variants?: Variants;
  /** Render as a stagger parent — direct `<Reveal.Item>` children animate in sequence. */
  stagger?: number;
  as?: 'div' | 'section' | 'ul' | 'li' | 'span';
}

/**
 * Scroll-triggered entrance.
 *
 * Under `prefers-reduced-motion` this renders the content plainly with no
 * transform and no opacity animation — never a degraded animation, just none.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variants = fadeUp,
  stagger,
  as = 'div',
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = m[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={stagger !== undefined ? staggerContainer(stagger, delay) : variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Component>
  );
}

/** A child of a `<Reveal stagger>` parent. */
export function RevealItem({
  children,
  className,
  variants = fadeUp,
  as = 'div',
}: Omit<RevealProps, 'delay' | 'stagger'>) {
  const reduceMotion = useReducedMotion();
  const Component = m[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Component className={className} variants={variants}>
      {children}
    </Component>
  );
}
