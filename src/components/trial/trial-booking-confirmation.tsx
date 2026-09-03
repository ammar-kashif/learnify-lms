'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  Check,
  Copy,
  MessageCircle,
  PartyPopper,
  Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { whatsappLink } from '@/config/contact';
import { buildTrialIcs, formatPktWithZone } from '@/lib/trial-booking';
import type { BookingResult } from '@/components/trial/trial-booking-dialog';

/**
 * What a guest sees after booking.
 *
 * This app has no email provider, so there is no confirmation email to send.
 * Everything durable the guest gets lives here: a reference code, a WhatsApp
 * thread with the business, a calendar file, and a manage link that stands in
 * for the email.
 */

interface TrialBookingConfirmationProps {
  result: BookingResult;
}

export default function TrialBookingConfirmation({
  result,
}: TrialBookingConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const manageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${result.manageUrl}`
      : result.manageUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link is on screen to copy by hand.
    }
  };

  const handleAddToCalendar = () => {
    const ics = buildTrialIcs({
      courseTitle: result.courseTitle,
      startsAtIso: result.slot.startsAt,
      durationMinutes: result.slot.durationMinutes,
      // Without this the entry lands in their calendar reading
      // "LOCATION:Online" — no way in, at the exact moment they need one.
      meetingLink: result.slot.meetingLink,
      reference: result.booking.reference,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'learnify-trial-class.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/50">
          <PartyPopper
            className="h-7 w-7 text-green-600 dark:text-green-500"
            aria-hidden="true"
          />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          You&apos;re booked in, {result.booking.guestName.split(' ')[0]}!
        </h1>

        <div className="mt-6 space-y-2 rounded-xl bg-gray-50 p-4 text-left dark:bg-gray-800/50">
          <Row label="Subject" value={result.courseTitle} />
          <Row label="When" value={formatPktWithZone(result.slot.startsAt)} />
          <Row label="Length" value={`${result.slot.durationMinutes} minutes`} />
          <Row label="Reference" value={result.booking.reference} mono />
        </div>

        {/* Honest about what happens next — the app cannot send email, so we
            do not pretend a confirmation is on its way to their inbox. */}
        <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
          {result.slot.meetingLink
            ? "Your joining link is below, and it's saved into the calendar file too. We'll message you on WhatsApp before the class as well."
            : "We'll message you on WhatsApp before the class with the joining link."}{' '}
          Send us a message now so we have your booking in the thread.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <a
            href={whatsappLink(result.whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 text-base font-semibold text-white transition-colors hover:bg-[#1ebe5b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Send us a WhatsApp to confirm
          </a>

          {/* Only when an admin actually set one on the slot. Secondary to the
              WhatsApp CTA: the class is usually days away, so confirming the
              booking matters more right now than joining it. */}
          {result.slot.meetingLink && (
            <Button asChild variant="outline" className="h-11 w-full">
              <a
                href={result.slot.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Video className="mr-2 h-4 w-4" aria-hidden="true" />
                Join the class
              </a>
            </Button>
          )}

          <Button variant="outline" className="h-11 w-full" onClick={handleAddToCalendar}>
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add to my calendar
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-left dark:border-gray-700">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Your booking link
          </p>
          <p className="mt-1 break-all text-sm text-gray-700 dark:text-gray-300">
            {manageUrl}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Save this — it&apos;s how you check or cancel your booking later.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Copy link
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/courses"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Browse all courses
          </Link>
          <span className="hidden text-gray-300 sm:inline">·</span>
          <Link
            href="/book-trial"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Book another subject
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-right text-sm font-medium text-gray-900 dark:text-gray-100 ${
          mono ? 'font-mono tracking-wider' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
