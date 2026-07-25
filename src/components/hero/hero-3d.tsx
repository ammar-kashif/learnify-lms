'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Gatekeeper for the 3D hero.
 *
 * three.js is ~170 kB, so it is code-split behind `next/dynamic` with
 * `ssr: false` and only requested once we've decided the device should have
 * it. Everyone else gets `<HeroFallback>`, which is what renders first
 * regardless — so first paint never waits on WebGL.
 *
 * Bailing out entirely on:
 *   - prefers-reduced-motion
 *   - small viewports (phones: the scene is decorative and costs battery)
 *   - no WebGL context available
 *   - low core count, a decent proxy for a low-power device
 */

const HeroScene = dynamic(() => import('./hero-scene'), {
  ssr: false,
  loading: () => <HeroFallback />,
});

/**
 * Static brand-coloured aurora. Always rendered; the canvas layers over it.
 * Sized in percentages so it fills whatever container it is dropped into —
 * a square column on desktop, a shorter band on mobile.
 */
export function HeroFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      data-testid="hero-fallback"
    >
      <div className="animate-aurora absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl" />
      <div
        className="animate-aurora absolute left-[18%] top-[20%] h-[45%] w-[45%] rounded-full bg-primary-300/30 blur-3xl"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="animate-aurora absolute bottom-[15%] right-[15%] h-[40%] w-[40%] rounded-full bg-charcoal-300/25 blur-3xl dark:bg-charcoal-600/25"
        style={{ animationDelay: '-12s' }}
      />
    </div>
  );
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default function Hero3D({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;

    const media = window.matchMedia('(min-width: 768px)');
    const decide = () => {
      const capable =
        media.matches &&
        supportsWebGL() &&
        (navigator.hardwareConcurrency ?? 4) >= 4;
      setEnabled(capable);
    };

    decide();
    media.addEventListener('change', decide);
    return () => media.removeEventListener('change', decide);
  }, [reduceMotion]);

  return (
    <div className={className}>
      {/* Painted immediately; the canvas fades in on top when it's ready. */}
      <HeroFallback />
      {enabled && (
        <div className="absolute inset-0 animate-[fade-in_1.2s_ease-out_forwards] opacity-0">
          <HeroScene />
        </div>
      )}
    </div>
  );
}
