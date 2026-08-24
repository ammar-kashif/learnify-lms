import { NextRequest, NextResponse } from 'next/server';

import {
  noStore,
  requireAdmin,
  serviceClient,
  toAdminBooking,
} from '@/lib/trial-booking-server';
import { sanitisePostgrestSearch } from '@/lib/trial-booking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/trial-bookings
 *
 * Admin/superadmin. The lead list, with full contact details — that is the
 * point of the feature, since nothing is emailed and staff follow up by hand.
 *
 * Query: slot_id, course_id, status, from, to, q.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(request, supabase);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slot_id');
    const courseId = searchParams.get('course_id');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const q = searchParams.get('q');

    let query = supabase
      .from('trial_bookings')
      .select(
        `
        id, slot_id, course_id, user_id, guest_name, guest_email, guest_phone,
        status, source, notes, converted_at, created_at,
        trial_slots!inner ( starts_at, courses!inner ( title ) )
      `
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (slotId) query = query.eq('slot_id', slotId);
    if (courseId) query = query.eq('course_id', courseId);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    if (q) {
      // PostgREST's .or() is a string DSL, not a parameterised query — an
      // unsanitised term could rewrite the whole filter.
      const safe = sanitisePostgrestSearch(q);
      if (safe) {
        query = query.or(
          `guest_name.ilike.%${safe}%,guest_email.ilike.%${safe}%,guest_phone.ilike.%${safe}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[admin/trial-bookings] query failed:', error);
      return NextResponse.json(
        { error: 'Could not load bookings.', details: error.message },
        { status: 500 }
      );
    }

    const bookings = (data ?? []).map((row: any) =>
      toAdminBooking(
        row,
        row.trial_slots?.courses?.title ?? '',
        row.trial_slots?.starts_at ?? ''
      )
    );

    const stats = {
      total: bookings.length,
      booked: bookings.filter(b => b.status === 'booked').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      attended: bookings.filter(b => b.status === 'attended').length,
      noShow: bookings.filter(b => b.status === 'no_show').length,
      converted: bookings.filter(b => b.convertedAt).length,
    };

    return noStore(NextResponse.json({ bookings, stats }));
  } catch (error) {
    console.error('[admin/trial-bookings] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
