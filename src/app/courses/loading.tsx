import { Skeleton, SkeletonCourseGrid } from '@/components/ui/skeleton';

/** Shown while the /courses route chunk loads. Mirrors the real layout. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-5 w-28" />
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-80 max-w-full" />
            <Skeleton className="h-5 w-[32rem] max-w-full" />
          </div>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <span className="sr-only">Loading courses…</span>
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-11 w-full rounded-full lg:max-w-sm" />
          <div className="flex gap-2">
            {[64, 84, 76, 72].map((w, i) => (
              <Skeleton key={i} className="h-10 rounded-full" style={{ width: w }} />
            ))}
          </div>
        </div>
        <SkeletonCourseGrid count={6} />
      </div>
    </div>
  );
}
