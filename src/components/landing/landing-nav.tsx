'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
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

/**
 * Order is load-bearing, not just taste.
 *
 * The pill tracks scroll position across `home` and the three anchored
 * sections, so those four are kept together and the indicator only ever steps
 * between neighbours. Wedging the route links back into that run — the old
 * order put Courses, Free Trial and Blog between Home and Features — drags the
 * pill the full width of the bar every time you scroll out of the hero, and
 * lights up three links that have nothing to do with where the page is.
 *
 * It also reads better: this page's own sections first, then everywhere else.
 *
 * Free Trial is deliberately not here. It is the top of the funnel — booking
 * needs no account and no payment — so it sits in the action cluster next to
 * Sign In and Get Started rather than being the sixth item in a link list.
 * `routeKey` still resolves /book-trial, which parks the pill (no link matches
 * that key) and stops the scroll-spy claiming Home on a page with no sections.
 */
const LINKS: NavLink[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'features', label: 'Features', href: '#features' },
  { key: 'about', label: 'About', href: '#about' },
  { key: 'contact', label: 'Contact', href: '#contact' },
  { key: 'courses', label: 'Courses', href: '/courses' },
  { key: 'blog', label: 'Blog', href: '/blog' },
];

/** Anchored sections the indicator tracks, in document order. */
const SECTIONS = ['features', 'about', 'contact'] as const;

export default function LandingNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [activeKey, setActiveKey] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  /**
   * `slide` travels with the position rather than living in its own state, so
   * a single render carries both where the pill goes and whether it animates
   * getting there. Split across two states, React would paint the new position
   * with the old flag still applied and the animation would run anyway.
   */
  const [pill, setPill] = useState<{
    left: number;
    width: number;
    slide: boolean;
  } | null>(null);

  const progressRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  /** Which link the pill is currently on, to measure how far the next move is. */
  const pillKeyRef = useRef<string | null>(null);

  // The nav also renders on /courses and /blog if it's ever reused there, so
  // route matches win over scroll position.
  const routeKey =
    pathname?.startsWith('/courses') ? 'courses'
    : pathname?.startsWith('/book-trial') ? 'trial'
    : pathname?.startsWith('/blog') ? 'blog'
    : null;

  useEffect(() => {
    if (routeKey) setActiveKey(routeKey);
  }, [routeKey]);

  // The anchored sections only exist on the landing page. Left as bare hashes
  // they resolve against whatever page the nav is on — `#features` on
  // /book-trial becomes /book-trial#features, which matches nothing and makes
  // the link do nothing at all. Off the landing page they have to go home first.
  const isHome = pathname === '/';
  const hrefFor = (link: NavLink) =>
    !isHome && link.href.startsWith('#') ? `/${link.href}` : link.href;

  // Free Trial is a button, not one of LINKS, so the pill can't mark it — it
  // carries its own active state instead.
  const onTrial = routeKey === 'trial';

  // One rAF-throttled listener drives all three scroll-derived pieces. Progress
  // is written straight to the DOM rather than through state — it changes every
  // frame and would otherwise re-render the whole bar on each one.
  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;

      // Every layout read happens before the one write below. Interleaving them
      // would force a synchronous reflow on each scroll frame.
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      // A section stays active until the next one starts. Tracking intersection
      // alone would leave the pill homeless over the stretches of page that
      // carry no id, and would pick the wrong one when scrolling back up.
      let next: string | null = null;
      if (!routeKey) {
        const probe = y + window.innerHeight * 0.35;
        next = 'home';
        for (const id of SECTIONS) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top + y <= probe) next = id;
        }
      }

      if (progressRef.current) {
        const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        progressRef.current.style.transform = `scaleX(${ratio})`;
      }

      // Hysteresis. A single threshold makes the island flip between its two
      // sizes when a scroll settles right on the boundary, and each flip runs
      // a 300ms resize — so it visibly wobbles. Contracting and expanding at
      // different points means a small jitter can't cross both.
      setScrolled(prev => (prev ? y > 8 : y > 24));

      if (next !== null) setActiveKey(next);
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
  //
  // The pill only slides when it steps to a neighbouring link. Home and the
  // three anchored sections are adjacent now (see LINKS), so every ordinary
  // scroll-driven move animates. Everything else snaps, because none of it is
  // the pill walking to the next section: the first placement, a re-measure of
  // the link it is already on after a resize or webfont swap, and the long
  // hops — a fast flick past several sections, or landing on a route link.
  // Animating those drags it across the bar for no reason.
  const measurePill = useCallback(() => {
    const el = itemRefs.current[activeKey];
    if (!el) {
      pillKeyRef.current = null;
      setPill(null);
      return;
    }

    const from = pillKeyRef.current;
    const fromIndex = from ? LINKS.findIndex(l => l.key === from) : -1;
    const toIndex = LINKS.findIndex(l => l.key === activeKey);
    // No previous position means this is the first placement, which must not
    // animate either — the pill would otherwise fly in from the left corner.
    // A re-measure of the same link (resize, webfont swap) is a layout
    // correction, not a move, so that snaps as well.
    const slide = fromIndex >= 0 && Math.abs(toIndex - fromIndex) === 1;

    pillKeyRef.current = activeKey;
    setPill({ left: el.offsetLeft, width: el.offsetWidth, slide });
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
          'relative z-10 mx-auto px-4 transition-[max-width,padding] duration-300 sm:px-6 lg:px-8',
          scrolled ? 'max-w-6xl pt-3' : 'max-w-7xl pt-0'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div
          className={cn(
            'relative flex items-center justify-between transition-[height,padding] duration-300',
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
              'glass-panel shadow-depth absolute inset-0 z-0 rounded-full transition-opacity duration-300',
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
              src="/images/logo-mark.png"
              alt=""
              className={cn(
                'object-contain transition-[height,width] duration-300',
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              )}
            />
            <span
              className={cn(
                'text-lg font-bold tracking-tight transition-colors duration-300',
                scrolled
                  ? 'text-charcoal-900 dark:text-gray-100'
                  : 'text-charcoal-900 dark:text-white'
              )}
            >
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
                'pointer-events-none absolute top-1/2 h-9 rounded-full bg-primary/10 dark:bg-primary/25',
                pill ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                width: pill?.width ?? 0,
                transform: `translate3d(${pill?.left ?? 0}px, -50%, 0)`,
                // Declared here rather than as a class so the sliding and
                // snapping cases can't collide as competing utilities. Opacity
                // always eases, so the pill still fades in on first paint.
                transitionProperty:
                  pill?.slide && !reduceMotion
                    ? 'transform, width, opacity'
                    : 'opacity',
                transitionDuration:
                  pill?.slide && !reduceMotion ? '300ms' : '200ms',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
            {LINKS.map((link) => {
              const isActive = activeKey === link.key;
              return (
                <Link
                  key={link.key}
                  href={hrefFor(link)}
                  ref={(el) => {
                    itemRefs.current[link.key] = el;
                  }}
                  onClick={handleLinkClick(link.href)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors lg:px-4',
                    isActive
                      ? scrolled
                        ? 'text-primary'
                        : 'text-primary dark:text-primary-300'
                      : scrolled
                        ? 'text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary'
                        : 'text-gray-700 hover:text-primary dark:text-white/75 dark:hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* One segmented pill rather than three loose buttons.

              Sign in stays transparent and quiet; Free Trial takes the right
              half as the bar's only filled CTA. Sharing a single bordered
              container means the boundary between them does the separating, so
              neither needs its own chrome to compete with — which is what made
              three pill buttons in a row read as one mushy blob.

              `overflow-hidden` is what clips the fill into the container's
              rounded end, so the focus rings have to be `ring-inset` or they
              get clipped away with it. */}
          <div className="relative z-10 hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <div
              className={cn(
                'flex items-center overflow-hidden rounded-full border shadow-sm transition-colors',
                scrolled
                  ? 'border-gray-200 dark:border-white/15'
                  : 'border-gray-300/80 dark:border-white/20'
              )}
            >
              <Link
                href="/auth/signin"
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  scrolled
                    ? 'text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                    : 'text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white'
                )}
              >
                Sign in
              </Link>
              <Link
                href="/book-trial"
                aria-current={onTrial ? 'page' : undefined}
                className={cn(
                  'group inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                  onTrial ? 'bg-primary-600' : 'bg-primary hover:bg-primary-600'
                )}
              >
                Free Trial
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={cn(
              'relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden',
              scrolled
                ? 'text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300'
                : 'text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white'
            )}
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
                        href={hrefFor(link)}
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

                {/* The same segmented pill as the bar, stretched across the
                    panel so both halves stay comfortable tap targets. */}
                <div className="mt-3 flex items-center gap-2 border-t border-gray-200/70 pt-3 dark:border-gray-700/60">
                  <ThemeToggle />
                  <div className="flex flex-1 items-center overflow-hidden rounded-full border border-gray-200 dark:border-white/15">
                    <Link
                      href="/auth/signin"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/book-trial"
                      onClick={() => setMenuOpen(false)}
                      aria-current={onTrial ? 'page' : undefined}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                        onTrial ? 'bg-primary-600' : 'bg-primary hover:bg-primary-600'
                      )}
                    >
                      Free Trial
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
