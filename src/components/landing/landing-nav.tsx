'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/theme-toggle';
import { DURATION, EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Landing-page navigation.
 *
 * Sits transparent over the hero, then contracts into a floating glass island
 * once you scroll. A pill slides between links to mark the section you're in,
 * and a hairline along the island's bottom edge tracks page progress.
 */

type NavLink = { key: string; label: string; href: string };

const LINKS: NavLink[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'courses', label: 'Courses', href: '/courses' },
  { key: 'blog', label: 'Blog', href: '/blog' },
  { key: 'features', label: 'Features', href: '#features' },
  { key: 'about', label: 'About', href: '#about' },
  { key: 'contact', label: 'Contact', href: '#contact' },
];

/** Anchored sections the indicator tracks, in document order. */
const SECTIONS = ['features', 'about', 'contact'] as const;

export default function LandingNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [activeKey, setActiveKey] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const progressRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // The nav also renders on /courses and /blog if it's ever reused there, so
  // route matches win over scroll position.
  const routeKey =
    pathname?.startsWith('/courses') ? 'courses'
    : pathname?.startsWith('/blog') ? 'blog'
    : null;

  useEffect(() => {
    if (routeKey) setActiveKey(routeKey);
  }, [routeKey]);

  // One rAF-throttled listener drives all three scroll-derived pieces. Progress
  // is written straight to the DOM rather than through state — it changes every
  // frame and would otherwise re-render the whole bar on each one.
  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      if (progressRef.current) {
        const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        progressRef.current.style.transform = `scaleX(${ratio})`;
      }

      setScrolled(y > 16);

      if (routeKey) return;

      // A section stays active until the next one starts. Tracking intersection
      // alone would leave the pill homeless over the stretches of page that
      // carry no id, and would pick the wrong one when scrolling back up.
      const probe = y + window.innerHeight * 0.35;
      let next = 'home';
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + y <= probe) next = id;
      }
      setActiveKey(next);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [routeKey]);

  // Links keep their positions relative to the list while the island resizes,
  // so measuring against the list is stable through the whole transition.
  const measurePill = useCallback(() => {
    const el = itemRefs.current[activeKey];
    setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [activeKey]);

  useEffect(() => {
    measurePill();
    window.addEventListener('resize', measurePill);
    return () => window.removeEventListener('resize', measurePill);
  }, [measurePill]);

  // Webfont swap changes label widths after first paint.
  useEffect(() => {
    document.fonts?.ready.then(measurePill).catch(() => {});
  }, [measurePill]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleLinkClick = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    // Next won't scroll for a link to the route you're already on.
    if (href === '/' && pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: DURATION.fast, ease: EASE },
      };

  const panel = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
        transition: { duration: DURATION.fast, ease: EASE },
      };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <AnimatePresence>
        {menuOpen && (
          // Dismiss-on-tap only. Keyboard users close via Escape or the X,
          // both of which are in the tab order — so this stays out of it.
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-0 bg-charcoal-900/20 backdrop-blur-[2px] md:hidden"
            {...fade}
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          'relative z-10 mx-auto px-4 transition-[max-width,padding] duration-500 sm:px-6 lg:px-8',
          scrolled ? 'max-w-6xl pt-3' : 'max-w-7xl pt-0'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div
          className={cn(
            'relative flex items-center justify-between transition-[height,padding] duration-500',
            scrolled ? 'h-14 pl-4 pr-2' : 'h-20 px-0'
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {/* Glass surface on its own layer so it cross-fades in rather than
              snapping a background on the moment you cross the threshold.
              The blur is switched off outright while hidden — opacity alone
              should suppress it, but a stray blur band over the 3D hero is a
              bad enough failure to be worth not relying on that. */}
          <div
            aria-hidden="true"
            className={cn(
              'glass-panel shadow-depth absolute inset-0 z-0 rounded-full transition-opacity duration-500',
              scrolled ? 'opacity-100' : 'opacity-0'
            )}
            style={
              scrolled
                ? undefined
                : { backdropFilter: 'none', WebkitBackdropFilter: 'none' }
            }
          >
            {/* Inset from the edges so the track clears the pill's curve. */}
            <span className="absolute inset-x-6 bottom-[6px] block h-[3px] overflow-hidden rounded-full bg-primary/10">
              <span
                ref={progressRef}
                className="block h-full origin-left rounded-full bg-gradient-to-r from-primary to-primary-600"
                style={{ transform: 'scaleX(0)' }}
              />
            </span>
          </div>

          <Link
            href="/"
            onClick={handleLinkClick('/')}
            className="relative z-10 flex items-center gap-2.5 rounded-full"
          >
            <img
              src="/images/Logo.PNG"
              alt=""
              className={cn(
                'object-contain transition-all duration-500',
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              )}
            />
            <span className="text-lg font-bold tracking-tight text-charcoal-900 dark:text-gray-100">
              Learnify
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="relative z-10 hidden items-center md:flex"
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute top-1/2 h-9 rounded-full bg-primary/10 transition-[transform,width,opacity] duration-300 dark:bg-primary/25',
                pill ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                width: pill?.width ?? 0,
                transform: `translate3d(${pill?.left ?? 0}px, -50%, 0)`,
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
            {LINKS.map((link) => {
              const isActive = activeKey === link.key;
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  ref={(el) => {
                    itemRefs.current[link.key] = el;
                  }}
                  onClick={handleLinkClick(link.href)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors lg:px-4',
                    isActive
                      ? 'text-primary'
                      : 'text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative z-10 hidden items-center gap-1 md:flex">
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-primary px-4 text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-600 hover:shadow-md hover:shadow-primary/30"
            >
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-primary/10 hover:text-primary dark:text-gray-300 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <m.div
              key="menu"
              id="landing-mobile-menu"
              className="relative z-10 overflow-hidden md:hidden"
              {...panel}
            >
              <div className="glass-panel shadow-depth mt-2 rounded-2xl p-3">
                <div className="flex flex-col">
                  {LINKS.map((link) => {
                    const isActive = activeKey === link.key;
                    return (
                      <Link
                        key={link.key}
                        href={link.href}
                        onClick={handleLinkClick(link.href)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'rounded-xl px-4 py-3 text-base font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary dark:bg-primary/20'
                            : 'text-gray-700 hover:bg-gray-100/70 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800/60'
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-gray-200/70 pt-3 dark:border-gray-700/60">
                  <ThemeToggle />
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-full text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                  >
                    <Link href="/auth/signin" onClick={() => setMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 rounded-full bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-600"
                  >
                    <Link href="/auth/signup" onClick={() => setMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
