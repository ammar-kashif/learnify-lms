'use client';

import { MessageCircle } from 'lucide-react';

import { whatsappLink, WHATSAPP_MESSAGES } from '@/config/contact';
import { formatPktWithZone, type TrialSlotPublic } from '@/lib/trial-booking';

/**
 * "Having trouble booking? Message us on WhatsApp."
 *
 * Shown on every step of the booking flow, not only on error — if a parent
 * cannot find their subject, or no slot suits them, this is the escape hatch.
 * It is also the only support channel this app has: there is no email
 * provider wired up anywhere in the codebase.
 */

interface WhatsAppHelpNoteProps {
  /** When present, the prefilled message names the slot they were looking at. */
  slot?: TrialSlotPublic | null;
  /** `card` for a standalone block, `inline` for inside an existing panel. */
  tone?: 'card' | 'inline';
  className?: string;
}

export default function WhatsAppHelpNote({
  slot,
  tone = 'card',
  className = '',
}: WhatsAppHelpNoteProps) {
  const message = slot
    ? [
        "Hi Learnify! I'm having trouble booking a free trial class.",
        '',
        `Subject: ${slot.courseTitle}`,
        `Time: ${formatPktWithZone(slot.startsAt)}`,
      ].join('\n')
    : WHATSAPP_MESSAGES.trialHelp;

  const wrapper =
    tone === 'card'
      ? 'rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60'
      : 'rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60';

  return (
    <div className={`${wrapper} ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Having trouble booking a slot? Message us on WhatsApp and we&apos;ll
          sort it out for you.
        </p>
        <a
          href={whatsappLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}
