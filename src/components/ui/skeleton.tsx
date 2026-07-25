import { cn } from '@/lib/utils';

/**
 * Content-shaped loading placeholders.
 *
 * A skeleton that matches the shape of what's coming reads as "almost there";
 * a centred spinner reads as "stuck". These replace the spinner-plus-caption
 * pattern used across the app.
 *
 * The shimmer is a background animation, so it degrades to a flat grey block
 * under `prefers-reduced-motion` (handled in animations.css) rather than
 * pulsing.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded-md bg-gray-200/80 dark:bg-gray-800', className)}
      {...props}
    />
  );
}

/** Paragraph placeholder. The last line is short, like real text. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

/** Mirrors the course card: icon, badge, title, description, two buttons. */
export function SkeletonCourseCard() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-5 w-3/4" />
      <SkeletonText lines={3} className="mb-6" />
      <div className="mt-auto space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Grid of course cards. */
export function SkeletonCourseGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCourseCard key={i} />
      ))}
    </div>
  );
}

/** Mirrors a dashboard stat tile. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="mb-2 h-8 w-16" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/** Rows of a list or table. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
        >
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 flex-shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full-page placeholder for route-level `loading.tsx`. Announces politely to
 * screen readers, since there's no visible text to read.
 */
export function SkeletonPage({ children }: { children?: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="w-full">
      <span className="sr-only">Loading…</span>
      {children ?? (
        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <SkeletonStatRow />
          <SkeletonCourseGrid />
        </div>
      )}
    </div>
  );
}
