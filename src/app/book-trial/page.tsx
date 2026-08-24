import type { Metadata } from 'next';

import LandingNav from '@/components/landing/landing-nav';
import WhatsAppFloat from '@/components/whatsapp-float';
import TrialBookingFlow from '@/components/trial/trial-booking-flow';

export const metadata: Metadata = {
  title: 'Book a Free Trial Class',
  description:
    'Pick your subject and a time that suits you, and join a free Learnify trial class. No account and no payment needed — O Level and IGCSE, Cambridge and Edexcel.',
  openGraph: {
    title: 'Book a Free Trial Class | Learnify',
    description:
      'Pick your subject and a time that suits you, and join a free Learnify trial class. No account needed.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

/**
 * The public trial-booking page.
 *
 * `?course=<id>` deep-links from a course card and skips straight to that
 * subject's calendar; `?src=` records which CTA sent the visitor here so the
 * admin lead list shows what is actually converting.
 */
export default function BookTrialPage({
  searchParams,
}: {
  searchParams: { course?: string; src?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <LandingNav />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Book your free trial class
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Pick your subject and a time that suits you. It&apos;s completely
            free, and you don&apos;t need an account.
          </p>
        </header>

        <TrialBookingFlow
          initialCourseId={searchParams.course}
          source={searchParams.src ?? 'web'}
        />
      </main>

      <WhatsAppFloat />
    </div>
  );
}
