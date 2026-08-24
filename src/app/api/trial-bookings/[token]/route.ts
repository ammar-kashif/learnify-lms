import { NextRequest, NextResponse } from 'next/server';

import { noStore, serviceClient } from '@/lib/trial-booking-server';
import {
  bookingReference,
  buildTrialWhatsappMessage,
  maskEmail,
  maskPhone,
} from '@/lib/trial-booking';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/trial-bookings/[token]
 *
 * Public. The token is a bearer capability — holding it is the authorisation.
 * This is what makes an account-free "manage my booking" link possible, and it
 * is why the page rendering this must be noindex.
 *
 * Email and phone are masked: a link left open in a shared browser should not
 * hand over the guest's full contact details.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!UUID_RE.test(token)) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const supabase = serviceClient();

    const { data, error } = await supabase
      .from('trial_bookings')
      .select(
        `
        id, status, guest_name, guest_email, guest_phone, created_at, cancelled_at,
        trial_slots!inner (
          id, starts_at, duration_minutes, meeting_link, status,
          courses!inner ( title )
        )
      `
      )
      .eq('cancel_token', token)
      .maybeSingle();

    if (error) {
      console.error('[trial-bookings/token] query failed:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const slot = (data as any).trial_slots;
    const courseTitle = slot?.courses?.title ?? 'your subject';
    const reference = bookingReference(data.id);
    const isActive = data.status === 'booked';

    return noStore(
      NextResponse.json({
        booking: {
          id: data.id,
          reference,
          status: data.status,
          guestName: data.guest_name,
          guestEmailMasked: maskEmail(data.guest_email),
          guestPhoneMasked: maskPhone(data.guest_phone),
          createdAt: data.created_at,
          cancelledAt: data.cancelled_at,
        },
        slot: {
          id: slot?.id,
          startsAt: slot?.starts_at,
          durationMinutes: slot?.duration_minutes,
          status: slot?.status,
          // Only hand over the join link for a booking that is still live.
          meetingLink: isActive ? (slot?.meeting_link ?? null) : null,
        },
        courseTitle,
        whatsappMessage: buildTrialWhatsappMessage({
          name: data.guest_name,
          courseTitle,
          startsAtIso: slot?.starts_at,
          reference,
        }),
      })
    );
  } catch (error) {
    console.error('[trial-bookings/token] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
