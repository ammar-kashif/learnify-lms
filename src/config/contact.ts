/**
 * Public contact details.
 *
 * Single source of truth for the business WhatsApp number — used by the landing
 * page CTAs, the floating chat bubble, and the payment popup. Change it here.
 */

/** E.164 without the leading `+`, which is what wa.me and the WhatsApp API expect. */
export const WHATSAPP_NUMBER = '923005299693';

/** Human-readable form, for display in the footer and contact blocks. */
export const WHATSAPP_DISPLAY = '+92 300 5299693';

/** Builds a wa.me deep link, optionally pre-filling the first message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Pre-filled openers, so every entry point says something sensible. */
export const WHATSAPP_MESSAGES = {
  trial: "Hi Learnify! I'd like to book a free trial class.",
  contact: 'Hi Learnify! I have a question about your O Level / IGCSE classes.',
  general: 'Hi Learnify!',
} as const;
