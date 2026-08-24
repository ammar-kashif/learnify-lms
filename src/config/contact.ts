/**
 * Public contact details.
 *
 * Single source of truth for the business WhatsApp number — used by the landing
 * page CTAs, the floating chat bubble, and the payment popup. Change it here.
 */

/** E.164 without the leading `+`, which is what wa.me and the WhatsApp API expect. */
export const WHATSAPP_NUMBER = '923497855488';

/** Human-readable form, for display in the footer and contact blocks. */
export const WHATSAPP_DISPLAY = '+92 349 7855488';

/** Builds a wa.me deep link, optionally pre-filling the first message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Pre-filled openers, so every entry point says something sensible. */
export const WHATSAPP_MESSAGES = {
  trial: "Hi Learnify! I'd like to book a free trial class.",
  trialHelp:
    "Hi Learnify! I'm having trouble booking a free trial class on your website.",
  contact: 'Hi Learnify! I have a question about your O Level / IGCSE classes.',
  general: 'Hi Learnify!',
} as const;

/**
 * Calendly booking link for the free consultation.
 *
 * Read from the environment so it can be swapped without a code change — set
 * `NEXT_PUBLIC_CALENDLY_URL` in `.env` and in the Vercel project settings.
 * Inlined at build time by Next, so it must be referenced as a full literal
 * `process.env.NEXT_PUBLIC_CALENDLY_URL` rather than destructured.
 */
export const CALENDLY_URL = (process.env.NEXT_PUBLIC_CALENDLY_URL ?? '').trim();

/**
 * Where "Book a Free Consultation" points.
 *
 * Falls back to WhatsApp when the Calendly URL has not been configured, so the
 * button never dead-links in an environment that is missing the variable.
 */
export function consultationLink(): string {
  return CALENDLY_URL || whatsappLink(WHATSAPP_MESSAGES.contact);
}

/** True when the consultation CTA will open Calendly rather than WhatsApp. */
export function hasCalendly(): boolean {
  return CALENDLY_URL.length > 0;
}
