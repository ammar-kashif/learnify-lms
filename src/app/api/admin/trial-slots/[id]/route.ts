import { NextRequest, NextResponse } from 'next/server';

import {
  noStore,
  requireAdmin,
  serviceClient,
  SLOT_SELECT,
  toAdminSlot,
} from '@/lib/trial-booking-server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/trial-slots/[id]
 *
 * Admin/superadmin. Edits a slot.
 *
 * Two guards worth noting:
 *  - capacity can never drop below the number of seats already booked;
 *  - cancelling is refused here and pushed to /cancel, because that route
 *    also releases the bookings and returns the affected guests. Silently
 *    flipping the status would strand people holding a seat.
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

    const { data: slot } = await supabase
      .from('trial_slots')
      .select('id, booked_count, status')
      .eq('id', params.id)
      .maybeSingle();

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.starts_at !== undefined) {
      const when = new Date(String(body.starts_at));
      if (Number.isNaN(when.getTime())) {
        return NextResponse.json({ error: 'Invalid date and time.' }, { status: 400 });
      }
      updates.starts_at = when.toISOString();
    }

    if (body.capacity !== undefined) {
      const capacity = Number(body.capacity);
      if (!Number.isFinite(capacity) || capacity < 1 || capacity > 200) {
        return NextResponse.json(
          { error: 'Capacity must be between 1 and 200.' },
          { status: 400 }
        );
      }
      if (capacity < slot.booked_count) {
        return NextResponse.json(
          {
            error: `${slot.booked_count} seat(s) are already booked, so capacity cannot go below that.`,
            reason: 'below_booked',
            bookedCount: slot.booked_count,
          },
          { status: 409 }
        );
      }
      updates.capacity = capacity;
    }

    if (body.duration_minutes !== undefined) {
      const duration = Number(body.duration_minutes);
      if (!Number.isFinite(duration) || duration < 15 || duration > 240) {
        return NextResponse.json(
          { error: 'Duration must be between 15 and 240 minutes.' },
          { status: 400 }
        );
      }
      updates.duration_minutes = duration;
    }

    if (body.status !== undefined) {
      if (body.status === 'cancelled') {
        return NextResponse.json(
          {
            error:
              'Use the cancel action instead — it also releases the bookings and lists who to notify.',
          },
          { status: 400 }
        );
      }
      if (!['draft', 'open'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.meeting_link !== undefined) updates.meeting_link = body.meeting_link || null;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.teacher_id !== undefined) updates.teacher_id = body.teacher_id || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('trial_slots')
      .update(updates)
      .eq('id', params.id)
      .select(SLOT_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'There is already a slot for this course at that time.' },
          { status: 409 }
        );
      }
      console.error('[admin/trial-slots/id] update failed:', error);
      return NextResponse.json({ error: 'Could not update the slot.' }, { status: 500 });
    }

    return noStore(NextResponse.json({ slot: toAdminSlot(data as any) }));
  } catch (error) {
    console.error('[admin/trial-slots/id] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/trial-slots/[id]
 *
 * Hard delete, permitted only while nobody has booked. Once there are
 * bookings the row is lead data and a mis-click must not destroy it — the
 * caller is pointed at /cancel instead.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(request, supabase);
    if (auth instanceof NextResponse) return auth;

    const { data: slot } = await supabase
      .from('trial_slots')
      .select('id, booked_count')
      .eq('id', params.id)
      .maybeSingle();

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found.' }, { status: 404 });
    }

    if (slot.booked_count > 0) {
      return NextResponse.json(
        {
          error: `This slot has ${slot.booked_count} booking(s). Cancel it instead so the guests can be notified.`,
          reason: 'has_bookings',
          bookedCount: slot.booked_count,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('trial_slots').delete().eq('id', params.id);

    if (error) {
      console.error('[admin/trial-slots/id] delete failed:', error);
      return NextResponse.json({ error: 'Could not delete the slot.' }, { status: 500 });
    }

    return noStore(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('[admin/trial-slots/id] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
