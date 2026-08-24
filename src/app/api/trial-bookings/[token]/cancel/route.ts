import { NextRequest, NextResponse } from 'next/server';

import { noStore, serviceClient } from '@/lib/trial-booking-server';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/trial-bookings/[token]/cancel
 *
 * Public — the cancel token is the capability. Idempotent: cancelling an
 * already-cancelled booking succeeds rather than erroring, so a double tap or
 * a retried request does not produce a scary failure.
 *
 * Seat release happens inside `cancel_trial_booking`, which takes the same slot
 * row lock as booking does, in the same order, so the two cannot deadlock.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!UUID_RE.test(token)) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const supabase = serviceClient();

    const { data, error } = await supabase.rpc('cancel_trial_booking', {
      p_cancel_token: token,
      p_booking_id: null,
      p_reason: 'guest cancelled',
    });

    if (error) {
      console.error('[trial-bookings/cancel] rpc failed:', error);
      return NextResponse.json(
        { error: 'Could not cancel that booking. Please try again.' },
        { status: 500 }
      );
    }

    const result = data as { ok: boolean; reason?: string };

    if (!result?.ok) {
      const status = result?.reason === 'not_found' ? 404 : 400;
      return NextResponse.json(
        { error: 'Could not cancel that booking.', reason: result?.reason },
        { status }
      );
    }

    return noStore(
      NextResponse.json({
        success: true,
        alreadyCancelled: result.reason === 'already_cancelled',
      })
    );
  } catch (error) {
    console.error('[trial-bookings/cancel] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
