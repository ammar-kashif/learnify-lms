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
 * Booking page behind "Book a Free Consultation" — a Calendly event.
 *
 * The real link is the default rather than being left to the environment. This
 * used to read `NEXT_PUBLIC_CALENDLY_URL` and quietly fall back to WhatsApp
 * when it was unset, which meant forgetting the variable in Vercel silently
 * downgraded the CTA in production with nothing to notice it. Baking the link
 * in makes the button correct everywhere by default, and the override is still
 * read first so it can be repointed without a code change.
 *
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time by matching the
 * literal text, so it has to be written out in full — not destructured, and
 * not looked up through a variable.
 */
const CONSULTATION_URL_FALLBACK =
  'https://calendly.com/ayaanahmadk2004/consultation';

export const CONSULTATION_URL =
  (process.env.NEXT_PUBLIC_CONSULTATION_URL ?? '').trim() ||
  CONSULTATION_URL_FALLBACK;

/** Where "Book a Free Consultation" points. */
export function consultationLink(): string {
  return CONSULTATION_URL;
}
