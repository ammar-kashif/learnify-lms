import { Fragment, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared chrome for the course page.
 *
 * Deliberately restrained, and the constraints are the point:
 *
 * - Hairlines are a ring (a 1px box-shadow), not a CSS border. Borders at low
 *   opacity go muddy against a dark surface; a ring stays crisp and doesn't
 *   take part in layout.
 * - 12px radius on containers, 8px on controls, pill only for status. Uniform
 *   16px-everything is what makes a page read as generated.
 * - The accent is for primary actions, the active tab and focus rings. Nothing
 *   else. Tinting every meta icon orange spends the accent on decoration and
 *   leaves nothing to signal "this is the thing to click".
 * - Status is a dot plus text, never a coloured pill.
 */

/** Hairline-bordered surface. */
export const surface =
  'bg-white ring-1 ring-gray-900/[0.07] dark:bg-gray-900 dark:ring-white/[0.09]';

export const panel = cn('rounded-xl', surface);

/** A panel of hairline-separated rows — the default for lists. */
export const rowGroup = cn(panel, 'divide-y divide-gray-900/[0.06] dark:divide-white/[0.07]');

/** One row inside a `rowGroup`. */
export const row =
  'flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4 hover:bg-gray-50/80 dark:hover:bg-white/[0.025]';

const DOT_TONES = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  primary: 'bg-primary',
  muted: 'bg-gray-400 dark:bg-gray-600',
} as const;

/** Status marker. A dot carries state without spending colour on a whole pill. */
export function StatusDot({
  tone = 'muted',
  pulse = false,
  className,
}: {
  tone?: keyof typeof DOT_TONES;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full',
        DOT_TONES[tone],
        pulse && 'animate-pulse',
        className
      )}
    />
  );
}

/**
 * Middot-separated facts. Reads as one sentence of metadata rather than a row
 * of competing chips.
 */
export function Meta({ items, className }: { items: ReactNode[]; className?: string }) {
  const shown = items.filter(Boolean);
  return (
    <span
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400',
        className
      )}
    >
      {shown.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">
              ·
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">{item}</span>
        </Fragment>
      ))}
    </span>
  );
}

/**
 * Page header.
 *
 * Sits on the page background with a hairline underneath — no banner, no
 * gradient wash, no glow. The title carries the page; chrome doesn't need to.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string | null;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
        {meta && <div className="mt-4">{meta}</div>}
        {children}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Tab-level heading. Smaller than the page title so the hierarchy holds. */
export function SectionHeader({
  title,
  count,
  description,
  actions,
  className,
}: {
  title: string;
  count?: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
            {title}
          </h2>
          {count !== undefined && count !== null && (
            <span className="text-sm tabular-nums text-gray-400 dark:text-gray-500">{count}</span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Empty state. Quiet — an empty tab isn't an occasion for a hero. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        panel,
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        className
      )}
    >
      <Icon className="mb-3 h-6 w-6 text-gray-400 dark:text-gray-600" strokeWidth={1.5} />
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Centred spinner for tab-level loading. */
export function TabSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-16"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300" />
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

/** The one accented control on a surface. */
export const primaryButton =
  'rounded-lg bg-primary text-white shadow-sm transition-colors hover:bg-primary-600';

/** Everything else. */
export const quietButton =
  'rounded-lg bg-transparent text-gray-700 ring-1 ring-gray-900/[0.09] transition-colors hover:bg-gray-50 dark:text-gray-200 dark:ring-white/[0.12] dark:hover:bg-white/[0.04]';

/** "1 chapter" / "3 chapters". "1 chapter(s)" is what unfinished software says. */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
