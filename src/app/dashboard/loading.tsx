import { SkeletonPage } from '@/components/ui/skeleton';

/** Covers /dashboard and its nested routes while their chunks load. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <SkeletonPage />
      </div>
    </div>
  );
}
