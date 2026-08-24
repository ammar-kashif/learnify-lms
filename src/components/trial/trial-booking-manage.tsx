'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Video,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import WhatsAppHelpNote from '@/components/trial/whatsapp-help-note';
import { whatsappLink } from '@/config/contact';
import { formatPktWithZone } from '@/lib/trial-booking';

/**
 * The "manage my booking" view behind a cancel token.
 *
 * The token in the URL *is* the authorisation — there is no account to sign in
 * to. That is what makes this page useful and also why the route that renders
 * it is marked noindex.
 */

interface BookingView {
  booking: {
    id: string;
    reference: string;
    status: 'booked' | 'cancelled' | 'attended' | 'no_show';
    guestName: string;
    guestEmailMasked: string;
    guestPhoneMasked: string;
    createdAt: string;
    cancelledAt: string | null;
  };
  slot: {
    id: string;
    startsAt: string;
    durationMinutes: number;
    status: string;
    meetingLink: string | null;
  };
  courseTitle: string;
  whatsappMessage: string;
}

export default function TrialBookingManage({ token }: { token: string }) {
  const [data, setData] = useState<BookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/trial-bookings/${encodeURIComponent(token)}`
        );
        if (cancelled) return;
        if (!response.ok) {
          setNotFound(true);
          return;
        }
        setData(await response.json());
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(
        `/api/trial-bookings/${encodeURIComponent(token)}/cancel`,
        { method: 'POST' }
      );
      if (response.ok && data) {
        setData({
          ...data,
          booking: {
            ...data.booking,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
          },
        });
        setConfirmingCancel(false);
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        Loading your booking…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <AlertTriangle
            className="mx-auto h-10 w-10 text-amber-500"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            We couldn&apos;t find that booking
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            The link may be incomplete or the booking may have been removed.
          </p>
          <Button asChild className="mt-5">
            <Link href="/book-trial">Book a trial class</Link>
          </Button>
        </div>
        <WhatsAppHelpNote />
      </div>
    );
  }

  const isCancelled = data.booking.status === 'cancelled';
  const isPast = new Date(data.slot.startsAt).getTime() < Date.now();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="flex items-start gap-3">
          {isCancelled ? (
            <XCircle className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
          ) : (
            <CheckCircle2
              className="h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-500"
              aria-hidden="true"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isCancelled ? 'Booking cancelled' : 'Your trial class is booked'}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Reference{' '}
              <span className="font-mono tracking-wider">
                {data.booking.reference}
              </span>
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <Row label="Name" value={data.booking.guestName} />
          <Row label="Subject" value={data.courseTitle} />
          <Row label="When" value={formatPktWithZone(data.slot.startsAt)} />
          <Row label="Length" value={`${data.slot.durationMinutes} minutes`} />
          <Row label="Email" value={data.booking.guestEmailMasked} />
          <Row label="Phone" value={data.booking.guestPhoneMasked} />
        </dl>

        {!isCancelled && data.slot.meetingLink && (
          <Button asChild className="mt-5 h-11 w-full">
            <a
              href={data.slot.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video className="mr-2 h-4 w-4" aria-hidden="true" />
              Join the class
            </a>
          </Button>
        )}

        {!isCancelled && (
          <a
            href={whatsappLink(data.whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Message us about this booking
          </a>
        )}

        {!isCancelled && !isPast && (
          <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
            {confirmingCancel ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Cancel this booking and give up your seat?
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={cancelling}
                  >
                    Keep my seat
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Cancelling…
                      </>
                    ) : (
                      'Yes, cancel it'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="text-sm text-gray-500 underline-offset-4 hover:text-red-600 hover:underline dark:text-gray-400"
              >
                Cancel this booking
              </button>
            )}
          </div>
        )}

        {isCancelled && (
          <Button asChild className="mt-5 h-11 w-full">
            <Link href="/book-trial">
              <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
              Book another time
            </Link>
          </Button>
        )}
      </div>

      <WhatsAppHelpNote />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {value}
      </dd>
    </div>
  );
}
