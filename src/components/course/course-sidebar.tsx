'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type CourseNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Spinner in the row while access for that section is still resolving. */
  busy?: boolean;
};

const STORAGE_KEY = 'course-sidebar-collapsed';

/** Widths are the only magic numbers here; everything else derives from them. */
export const SIDEBAR_W = { expanded: 232, collapsed: 56 } as const;

/**
 * Reads the persisted collapse state.
 *
 * Starts collapsed=false on the server and syncs after mount, so the markup the
 * server sends always matches the first client render.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* private mode — default to expanded */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

function NavRow({
  item,
  isActive,
  href,
  collapsed,
  onNavigate,
}: {
  item: CourseNavItem;
  isActive: boolean;
  href: { pathname: string; query: { tab: string } };
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? undefined : item.label}
      className={cn(
        'group relative flex h-9 items-center rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'w-9 justify-center' : 'gap-2.5 px-2.5',
        isActive
          ? 'bg-gray-900/[0.06] text-gray-900 dark:bg-white/[0.09] dark:text-white'
          : 'text-gray-600 hover:bg-gray-900/[0.04] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {item.busy && !collapsed && (
        <span
          aria-hidden="true"
          className="ml-auto h-3 w-3 flex-shrink-0 animate-spin rounded-full border border-current border-t-transparent opacity-50"
        />
      )}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/** The rail's contents — shared by the desktop aside and the mobile sheet. */
function SidebarBody({
  items,
  activeKey,
  courseId,
  collapsed,
  onNavigate,
  header,
  footer,
}: {
  items: CourseNavItem[];
  activeKey: string;
  courseId: string;
  collapsed: boolean;
  onNavigate?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {header}
      <nav aria-label="Course sections" className={cn('flex-1', collapsed ? 'px-2' : 'px-2.5')}>
        {!collapsed && (
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            Course
          </p>
        )}
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.key}>
              <NavRow
                item={item}
                isActive={activeKey === item.key}
                href={{ pathname: `/courses/${courseId}`, query: { tab: item.key } }}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>
      {footer}
    </div>
  );
}

export default function CourseSidebar({
  items,
  activeKey,
  courseId,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileOpenChange,
  courseTitle,
  showBackLink = true,
}: {
  items: CourseNavItem[];
  activeKey: string;
  courseId: string;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  courseTitle: string;
  showBackLink?: boolean;
}) {
  const backLink = (dense: boolean) =>
    showBackLink ? (
      <Link
        href="/dashboard"
        onClick={() => onMobileOpenChange(false)}
        className={cn(
          'flex h-9 items-center rounded-lg text-sm font-medium text-gray-600 transition-colors hover:bg-gray-900/[0.04] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white',
          dense ? 'w-9 justify-center' : 'gap-2.5 px-2.5'
        )}
      >
        <ChevronLeft className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
        {!dense && <span className="truncate">Dashboard</span>}
        {dense && <span className="sr-only">Back to dashboard</span>}
      </Link>
    ) : null;

  return (
    <TooltipProvider>
      {/* Desktop rail */}
      <aside
        style={{ width: collapsed ? SIDEBAR_W.collapsed : SIDEBAR_W.expanded }}
        className="hidden flex-shrink-0 flex-col shadow-[inset_-1px_0_0_0_rgba(17,24,39,0.08)] transition-[width] duration-200 ease-out lg:flex dark:shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.09)]"
      >
        <div className="sticky top-0 flex h-[100dvh] flex-col py-3">
          <div className={cn('pb-2', collapsed ? 'px-2' : 'px-2.5')}>
            <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-1')}>
              {!collapsed && <div className="min-w-0 flex-1">{backLink(false)}</div>}
              {collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onToggle}
                      aria-label="Expand sidebar"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-900/[0.04] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    >
                      <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand sidebar</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label="Collapse sidebar"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-900/[0.04] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                >
                  <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
            {collapsed && <div className="mt-0.5 flex justify-center">{backLink(true)}</div>}
          </div>

          <SidebarBody
            items={items}
            activeKey={activeKey}
            courseId={courseId}
            collapsed={collapsed}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" hideClose className="w-64 max-w-[80vw] p-0 lg:hidden">
          <div className="flex h-full flex-col py-3">
            <div className="px-2.5 pb-2">
              <SheetTitle className="truncate px-2.5 pb-2 text-sm">{courseTitle}</SheetTitle>
              {backLink(false)}
            </div>
            <SidebarBody
              items={items}
              activeKey={activeKey}
              courseId={courseId}
              collapsed={false}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
