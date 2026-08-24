import { NextRequest, NextResponse } from 'next/server';

import { noStore, requireAdmin, serviceClient } from '@/lib/trial-booking-server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/trial-bookings/[id]
 *
 * Admin/superadmin. Marks attendance or cancels a single booking.
 *
 * Cancelling is routed through the RPC rather than a plain update, because the
 * seat has to be handed back to the slot at the same time. A direct
 * `.update({ status: 'cancelled' })` would leak a seat permanently.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(request, supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { status, notes } = body as { status?: string; notes?: string };

    if (status === 'cancelled') {
      const { data, error } = await supabase.rpc('cancel_trial_booking', {
        p_cancel_token: null,
        p_booking_id: params.id,
        p_reason: notes?.slice(0, 500) || 'cancelled by admin',
      });

      if (error) {
        console.error('[admin/trial-bookings/id] cancel rpc failed:', error);
        return NextResponse.json(
          { error: 'Could not cancel the booking.' },
          { status: 500 }
        );
      }

      const result = data as { ok: boolean; reason?: string };
      if (!result?.ok) {
        return NextResponse.json(
          { error: 'Could not cancel the booking.', reason: result?.reason },
          { status: result?.reason === 'not_found' ? 404 : 400 }
        );
      }
      return noStore(NextResponse.json({ success: true }));
    }

    const updates: Record<string, any> = {};

    if (status !== undefined) {
      if (!['booked', 'attended', 'no_show'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      }
      updates.status = status;
    }
    if (notes !== undefined) {
      updates.notes = notes ? String(notes).slice(0, 2000) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('trial_bookings')
      .update(updates)
      .eq('id', params.id)
      .select('id, status, notes')
      .maybeSingle();

    if (error) {
      console.error('[admin/trial-bookings/id] update failed:', error);
      return NextResponse.json(
        { error: 'Could not update the booking.' },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    return noStore(NextResponse.json({ success: true, booking: data }));
  } catch (error) {
    console.error('[admin/trial-bookings/id] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
