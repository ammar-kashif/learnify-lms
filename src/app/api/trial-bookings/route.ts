import { NextRequest, NextResponse } from 'next/server';

import {
  noStore,
  optionalUserId,
  serviceClient,
} from '@/lib/trial-booking-server';
import {
  BOOKING_FAILURES,
  bookingReference,
  buildTrialWhatsappMessage,
  normaliseEmail,
  normaliseName,
  normalisePkPhone,
  TRIAL_BOOKING_LEAD_TIME_MINUTES,
  type BookingFailureReason,
} from '@/lib/trial-booking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trial-bookings
 *
 * Public — a guest books a free trial seat with no account.
 *
 * All capacity logic lives in the `book_trial_slot` Postgres function, which
 * takes a row lock on the slot. Doing the check here instead would be a TOCTOU
 * race: two guests on the last seat would both read the same count and both
 * insert. supabase-js has no transaction API, so the function is the only way
 * to make the check and the insert atomic.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { slotId, name, email, phone, source, website } = body as Record<
      string,
      unknown
    >;

    // Honeypot. Real users never see this field, so anything in it is a bot.
    // Answer with a plausible success rather than a 400, so the bot has no
    // signal to adapt to, and write nothing.
    if (typeof website === 'string' && website.trim() !== '') {
      return noStore(
        NextResponse.json(
          { success: true, booking: { reference: 'PENDING' } },
          { status: 201 }
        )
      );
    }

    if (typeof slotId !== 'string' || !slotId) {
      return NextResponse.json({ error: 'Please choose a slot.' }, { status: 400 });
    }

    const cleanName = normaliseName(String(name ?? ''));
    const cleanEmail = normaliseEmail(String(email ?? ''));
    const cleanPhone = normalisePkPhone(String(phone ?? ''));

    if (!cleanName) {
      return NextResponse.json(
        { error: 'Please enter your full name.', field: 'name' },
        { status: 400 }
      );
    }
    if (!cleanEmail) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.', field: 'email' },
        { status: 400 }
      );
    }
    if (!cleanPhone) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number, e.g. 0300 1234567.', field: 'phone' },
        { status: 400 }
      );
    }

    const supabase = serviceClient();

    // Booking is open to guests; if a signed-in student books, link the row so
    // it shows up against their account later.
    const userId = await optionalUserId(request, supabase);

    const { data, error } = await supabase.rpc('book_trial_slot', {
      p_slot_id: slotId,
      p_guest_name: cleanName,
      p_guest_email: cleanEmail,
      p_guest_phone: cleanPhone,
      p_user_id: userId,
      p_source: typeof source === 'string' ? source.slice(0, 32) : 'web',
      p_lead_minutes: TRIAL_BOOKING_LEAD_TIME_MINUTES,
    });

    if (error) {
      console.error('[trial-bookings] rpc failed:', error);
      return NextResponse.json(
        { error: 'Could not complete the booking. Please try again.' },
        { status: 500 }
      );
    }

    const result = data as {
      ok: boolean;
      reason?: BookingFailureReason;
      booking_id?: string;
      cancel_token?: string;
      slot_id?: string;
      course_id?: string;
      starts_at?: string;
      duration_minutes?: number;
      meeting_link?: string | null;
      remaining_seats?: number;
    };

    if (!result?.ok) {
      const reason = (result?.reason ?? 'invalid') as BookingFailureReason;
      const failure = BOOKING_FAILURES[reason] ?? BOOKING_FAILURES.invalid;
      // Deliberately never returns the existing booking's cancel_token on a
      // duplicate — that would turn this public endpoint into an email
      // enumeration oracle that hands out other people's capability tokens.
      return NextResponse.json(
        { error: failure.message, reason },
        { status: failure.status }
      );
    }

    // Course title for the confirmation screen and the WhatsApp message.
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', result.course_id!)
      .single();

    const courseTitle = course?.title ?? 'your subject';
    const reference = bookingReference(result.booking_id!);

    return noStore(
      NextResponse.json(
        {
          success: true,
          booking: {
            id: result.booking_id,
            reference,
            cancelToken: result.cancel_token,
            guestName: cleanName,
          },
          slot: {
            id: result.slot_id,
            startsAt: result.starts_at,
            durationMinutes: result.duration_minutes,
            remainingSeats: result.remaining_seats,
            // Safe to hand over here, unlike on the public slot endpoints:
            // book_trial_slot() only returns this on a booking that just
            // succeeded, so the caller is a confirmed attendee of this exact
            // slot. `toPublicSlot` still strips it everywhere pre-booking.
            meetingLink: result.meeting_link ?? null,
          },
          courseTitle,
          whatsappMessage: buildTrialWhatsappMessage({
            name: cleanName,
            courseTitle,
            startsAtIso: result.starts_at!,
            reference,
          }),
          manageUrl: `/book-trial/${result.cancel_token}`,
        },
        { status: 201 }
      )
    );
  } catch (error) {
    console.error('[trial-bookings] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
