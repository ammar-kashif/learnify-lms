import type { Metadata } from 'next';

import LandingNav from '@/components/landing/landing-nav';
import WhatsAppFloat from '@/components/whatsapp-float';
import TrialBookingManage from '@/components/trial/trial-booking-manage';

/**
 * Manage a booking via its cancel token.
 *
 * The token in the URL is a bearer capability — anyone holding the link can
 * view and cancel the booking, which is the whole point of an account-free
 * flow. It must therefore never be indexed.
 */
export const metadata: Metadata = {
  title: 'Your trial class booking',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function ManageTrialBookingPage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <LandingNav />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <TrialBookingManage token={params.token} />
      </main>
      <WhatsAppFloat />
    </div>
  );
}
