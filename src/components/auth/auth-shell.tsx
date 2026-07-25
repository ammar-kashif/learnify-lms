'use client';

import Link from 'next/link';
import { ArrowLeft, GraduationCap, Sparkles, Star, Users } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Shared split layout for every auth screen.
 *
 * Desktop gets a brand panel beside the form; on mobile the panel collapses to
 * a compact header so the form is reachable without scrolling. All four auth
 * pages use this so they stay visually consistent.
 */

const HIGHLIGHTS = [
  { icon: Users, label: 'Small groups of 10-12 students' },
  { icon: Star, label: '4.9/5 from 100+ students' },
  { icon: Sparkles, label: 'Past paper mastery every week' },
];

interface AuthShellProps {
  children: ReactNode;
  /** Shown under the logo on the brand panel. */
  title: string;
  subtitle: string;
  /** Set false on nested steps (2FA, backup codes) that shouldn't re-pitch. */
  showHighlights?: boolean;
}

export default function AuthShell({
  children,
  title,
  subtitle,
  showHighlights = true,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative isolate overflow-hidden bg-charcoal-800 px-6 py-10 text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        {/* Aurora wash in brand colours */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="animate-aurora absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
          <div
            className="animate-aurora absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-primary-700/40 blur-3xl"
            style={{ animationDelay: '-8s' }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mt-8 flex items-center gap-3 lg:mt-12">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <GraduationCap className="h-6 w-6 text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight">Learnify</span>
          </div>

          <h1 className="mt-6 text-3xl font-bold leading-tight lg:mt-10 lg:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-white/70">
            {subtitle}
          </p>
        </div>

        {showHighlights && (
          <ul className="mt-8 hidden space-y-4 lg:block">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-white/80">
                <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm">{label}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12 lg:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
