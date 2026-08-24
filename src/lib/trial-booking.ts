/**
 * Shared contract for free-trial class booking.
 *
 * Imported by both the API routes and the client components, so it must stay
 * free of React and of any Node-only API.
 *
 * Naming note: `trial_*`, deliberately not `demo_*`. "Demo" already means
 * 24-hour access to existing content in four other places in this schema
 * (`demo_access`, `guest_demo_leads`, `live_classes.is_demo`, `users.demo_used`).
 * A booked trial class is a different thing.
 */

/**
 * Minimum notice before a slot starts. Confirmation is a human replying on
 * WhatsApp, so a slot needs runway — zero would let someone book a class
 * starting in ninety seconds. Enforced authoritatively inside
 * `book_trial_slot()`, not just in the UI.
 */
export const TRIAL_BOOKING_LEAD_TIME_MINUTES = 120;

/** All class times are Pakistan Standard Time, whatever the visitor's device says. */
export const PKT_TIME_ZONE = 'Asia/Karachi';

// ---------------------------------------------------------------- types

export type TrialSlotStatus = 'draft' | 'open' | 'cancelled';
export type TrialBookingStatus = 'booked' | 'cancelled' | 'attended' | 'no_show';

/** A slot as exposed to the public. Never carries `meeting_link` or guest PII. */
export interface TrialSlotPublic {
  id: string;
  courseId: string;
  courseTitle: string;
  level: string;
  board: string | null;
  subject: string;
  /** ISO 8601, UTC. */
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  remainingSeats: number;
  description: string | null;
}

/** A slot as exposed to admins. */
export interface TrialSlotAdmin extends TrialSlotPublic {
  status: TrialSlotStatus;
  bookedCount: number;
  meetingLink: string | null;
  teacherId: string | null;
  teacherName: string | null;
  createdAt: string;
}

export interface TrialBookingPublic {
  id: string;
  /** Short human-quotable code, e.g. "A3F91C0E". */
  reference: string;
  status: TrialBookingStatus;
  guestName: string;
  createdAt: string;
}

export interface TrialBookingAdmin extends TrialBookingPublic {
  slotId: string;
  courseId: string;
  courseTitle: string;
  startsAt: string;
  guestEmail: string;
  guestPhone: string;
  userId: string | null;
  convertedAt: string | null;
  source: string;
  notes: string | null;
}

/** Failure reasons returned by `book_trial_slot()`. */
export type BookingFailureReason =
  | 'not_found'
  | 'closed'
  | 'too_late'
  | 'full'
  | 'duplicate'
  | 'throttled'
  | 'bad_request'
  | 'invalid';

/** Maps an RPC failure reason onto an HTTP status and a user-facing message. */
export const BOOKING_FAILURES: Record<
  BookingFailureReason,
  { status: number; message: string }
> = {
  not_found: { status: 404, message: 'That slot no longer exists.' },
  closed: {
    status: 409,
    message: 'That slot is no longer open for booking.',
  },
  too_late: {
    status: 409,
    message: 'That class is starting too soon to book online.',
  },
  full: { status: 409, message: 'That slot just filled up. Please pick another time.' },
  duplicate: {
    status: 409,
    message: "You've already booked this slot with that email address.",
  },
  throttled: {
    status: 429,
    message: 'Too many booking attempts. Please try again in a few minutes.',
  },
  bad_request: { status: 400, message: 'Something was missing from that request.' },
  invalid: { status: 400, message: 'Please check the details you entered.' },
};

// ------------------------------------------------------------- seats & state

export function remainingSeats(slot: {
  capacity: number;
  bookedCount: number;
}): number {
  return Math.max(slot.capacity - slot.bookedCount, 0);
}

/** True when a slot can still be booked from the client's point of view. */
export function isBookable(slot: TrialSlotPublic, now: Date = new Date()): boolean {
  if (slot.remainingSeats <= 0) return false;
  const cutoff = now.getTime() + TRIAL_BOOKING_LEAD_TIME_MINUTES * 60_000;
  return new Date(slot.startsAt).getTime() >= cutoff;
}

// ------------------------------------------------------------ time, in PKT

/**
 * Formats an instant in Pakistan time.
 *
 * Deliberately `Intl.DateTimeFormat` and not date-fns: this repo pins date-fns
 * v2.30, which has no timezone support, and `date-fns-tz` is not installed — so
 * `format()` renders in the *device's* zone. A parent whose phone is set to Gulf
 * time would see a 6pm Karachi class as 5pm.
 */
export function formatPkt(
  iso: string,
  style: 'full' | 'time' | 'day' | 'dayShort' = 'full'
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const base: Intl.DateTimeFormatOptions = { timeZone: PKT_TIME_ZONE };
  const options: Intl.DateTimeFormatOptions =
    style === 'time'
      ? { ...base, hour: 'numeric', minute: '2-digit', hour12: true }
      : style === 'day'
        ? { ...base, weekday: 'long', day: 'numeric', month: 'long' }
        : style === 'dayShort'
          ? { ...base, weekday: 'short', day: 'numeric', month: 'short' }
          : {
              ...base,
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            };

  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

/** `formatPkt` with an explicit zone suffix, for anywhere the zone matters. */
export function formatPktWithZone(iso: string): string {
  const formatted = formatPkt(iso, 'full');
  return formatted ? `${formatted} (PKT)` : '';
}

/**
 * `YYYY-MM-DD` for the Pakistan calendar day an instant falls on.
 *
 * `en-CA` yields ISO-ordered dates directly, which makes this both correct and
 * sortable without any date maths — and hydration-safe, since it never depends
 * on the server's local zone.
 */
export function pktDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PKT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Groups slots into Pakistan calendar days, preserving chronological order. */
export function groupSlotsByPktDay(
  slots: TrialSlotPublic[]
): Array<{ dayKey: string; label: string; slots: TrialSlotPublic[] }> {
  const buckets = new Map<string, TrialSlotPublic[]>();
  for (const slot of [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = pktDayKey(slot.startsAt);
    const bucket = buckets.get(key) ?? [];
    bucket.push(slot);
    buckets.set(key, bucket);
  }
  // Array.from rather than spread: tsconfig targets es5, where iterating a Map
  // needs --downlevelIteration.
  return Array.from(buckets.entries()).map(([dayKey, daySlots]) => ({
    dayKey,
    label: formatPkt(daySlots[0].startsAt, 'dayShort'),
    slots: daySlots,
  }));
}

// -------------------------------------------------------------- validation

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercases and trims, returning null when the address is not plausible. */
export function normaliseEmail(raw: string): string | null {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value || value.length > 254 || !EMAIL_RE.test(value)) return null;
  return value;
}

/**
 * Normalises a Pakistani phone number to E.164.
 *
 * Accepts what people actually type — `0300 1234567`, `0300-1234567`,
 * `+92 300 1234567`, `92 300 1234567`, `300 1234567` — and returns
 * `+923001234567`. Other country codes are passed through if already E.164.
 */
export function normalisePkPhone(raw: string): string | null {
  const digitsOnly = (raw ?? '').replace(/[^\d+]/g, '');
  if (!digitsOnly) return null;

  // Already international, and not a +92 we should re-check.
  if (digitsOnly.startsWith('+') && !digitsOnly.startsWith('+92')) {
    return /^\+[1-9]\d{6,14}$/.test(digitsOnly) ? digitsOnly : null;
  }

  const national = digitsOnly.replace(/^\+?92/, '').replace(/^0+/, '');
  if (!/^\d+$/.test(national)) return null;

  // Pakistani mobile numbers are 10 national digits beginning with 3.
  if (national.length !== 10 || !national.startsWith('3')) {
    // Landlines vary in length; accept 9-10 digits rather than reject outright.
    if (national.length < 9 || national.length > 11) return null;
  }
  return `+92${national}`;
}

/** Trims and length-checks a person's name. Mirrors the DB CHECK constraint. */
export function normaliseName(raw: string): string | null {
  const value = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (value.length < 2 || value.length > 120) return null;
  return value;
}

// ----------------------------------------------------------- presentation

/** Short, human-quotable booking reference derived from the row id. */
export function bookingReference(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

/** Masks an email for the manage page, so a shared browser leaks less. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const head = user.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

/** Masks a phone number, keeping the last four digits. */
export function maskPhone(phone: string): string {
  const tail = phone.slice(-4);
  return `${'*'.repeat(Math.max(phone.length - 4, 0))}${tail}`;
}

/**
 * The message a guest sends us after booking.
 *
 * With no email provider in this app, this WhatsApp thread is the confirmation
 * channel — it turns a one-way "we got your booking" into a conversation the
 * business can actually reply in.
 */
export function buildTrialWhatsappMessage(args: {
  name: string;
  courseTitle: string;
  startsAtIso: string;
  reference: string;
}): string {
  return [
    "Hi Learnify! I've booked a free trial class.",
    '',
    `Name: ${args.name}`,
    `Subject: ${args.courseTitle}`,
    `When: ${formatPktWithZone(args.startsAtIso)}`,
    `Ref: ${args.reference}`,
    '',
    'Please confirm my seat.',
  ].join('\n');
}

/** The message an admin sends when a slot is cancelled out from under someone. */
export function buildSlotCancelledWhatsappMessage(args: {
  name: string;
  courseTitle: string;
  startsAtIso: string;
}): string {
  return [
    `Hi ${args.name}, this is Learnify.`,
    '',
    `We're very sorry — the free trial class for ${args.courseTitle} on ` +
      `${formatPktWithZone(args.startsAtIso)} has had to be cancelled.`,
    '',
    "Can we get you into another slot? Let us know what time suits you and we'll book it for you.",
  ].join('\n');
}

/**
 * A minimal RFC 5545 calendar entry, built client-side and downloaded as a Blob.
 * The closest thing to a reminder available without an email provider.
 */
export function buildTrialIcs(args: {
  courseTitle: string;
  startsAtIso: string;
  durationMinutes: number;
  meetingLink?: string | null;
  reference: string;
}): string {
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(args.startsAtIso);
  const end = new Date(start.getTime() + args.durationMinutes * 60_000);
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const description = [
    `Free trial class with Learnify. Reference ${args.reference}.`,
    args.meetingLink ? `Join: ${args.meetingLink}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learnify//Trial Class//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:trial-${args.reference}@learnify`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`Learnify free trial — ${args.courseTitle}`)}`,
    `DESCRIPTION:${escape(description)}`,
    args.meetingLink ? `LOCATION:${escape(args.meetingLink)}` : 'LOCATION:Online',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Learnify trial class in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Strips the characters PostgREST's `.or()` string DSL treats as syntax.
 * `.or()` is not parameterised, so anything interpolated into it must be
 * sanitised or a search term can rewrite the filter.
 */
export function sanitisePostgrestSearch(raw: string): string {
  return (raw ?? '').replace(/[,()*"\\]/g, ' ').trim().slice(0, 80);
}
