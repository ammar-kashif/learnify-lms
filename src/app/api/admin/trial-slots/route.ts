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
 * GET /api/admin/trial-slots
 *
 * Admin/superadmin. Every slot including drafts, cancelled and past ones —
 * the public route hides those, but ops needs to see the whole picture.
 *
 * Query: course_id, status, from, to.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(request, supabase);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('trial_slots')
      .select(SLOT_SELECT)
      .order('starts_at', { ascending: true })
      .limit(500);

    if (courseId) query = query.eq('course_id', courseId);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('starts_at', from);
    if (to) query = query.lte('starts_at', to);

    const { data, error } = await query;

    if (error) {
      console.error('[admin/trial-slots] query failed:', error);
      return NextResponse.json(
        { error: 'Could not load slots.', details: error.message },
        { status: 500 }
      );
    }

    const rows = data ?? [];

    // Resolve teacher names in one round trip rather than joining — teacher_id
    // is nullable here (unlike live_classes), so an inner join would silently
    // drop every unstaffed slot.
    const teacherIds = Array.from(
      new Set(rows.map((r: any) => r.teacher_id).filter(Boolean))
    );
    const teacherNameById: Record<string, string> = {};
    if (teacherIds.length) {
      const { data: teachers } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', teacherIds);
      for (const t of teachers ?? []) teacherNameById[t.id] = t.full_name;
    }

    const slots = rows.map((row: any) =>
      toAdminSlot(row, row.teacher_id ? (teacherNameById[row.teacher_id] ?? null) : null)
    );

    const stats = {
      open: slots.filter(s => s.status === 'open').length,
      draft: slots.filter(s => s.status === 'draft').length,
      cancelled: slots.filter(s => s.status === 'cancelled').length,
      seatsBooked: slots.reduce((n, s) => n + s.bookedCount, 0),
      seatsTotal: slots.reduce((n, s) => n + s.capacity, 0),
    };

    return noStore(NextResponse.json({ slots, stats }));
  } catch (error) {
    console.error('[admin/trial-slots] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/trial-slots
 *
 * Admin/superadmin. Creates one or many slots for a course.
 *
 * `starts_at` is an array so a whole week of availability is a single submit —
 * that is the difference between ops maintaining this calendar and not.
 * Rows are inserted one at a time so a single clash against the
 * (course_id, starts_at) unique constraint reports as `skipped` instead of
 * failing the entire batch.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(request, supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const {
      course_id,
      starts_at,
      capacity,
      duration_minutes,
      meeting_link,
      teacher_id,
      description,
      status,
    } = body as Record<string, any>;

    if (!course_id || !Array.isArray(starts_at) || starts_at.length === 0) {
      return NextResponse.json(
        { error: 'A course and at least one date and time are required.' },
        { status: 400 }
      );
    }
    if (starts_at.length > 60) {
      return NextResponse.json(
        { error: 'Please create at most 60 slots at a time.' },
        { status: 400 }
      );
    }

    const capacityValue = Number(capacity ?? 10);
    if (!Number.isFinite(capacityValue) || capacityValue < 1 || capacityValue > 200) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 200.' },
        { status: 400 }
      );
    }

    const durationValue = Number(duration_minutes ?? 60);
    if (!Number.isFinite(durationValue) || durationValue < 15 || durationValue > 240) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 240 minutes.' },
        { status: 400 }
      );
    }

    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    const slotStatus = status === 'draft' ? 'draft' : 'open';
    const created: any[] = [];
    const skipped: Array<{ starts_at: string; reason: string }> = [];

    for (const raw of starts_at) {
      const when = new Date(String(raw));
      if (Number.isNaN(when.getTime())) {
        skipped.push({ starts_at: String(raw), reason: 'invalid_date' });
        continue;
      }

      const { data, error } = await supabase
        .from('trial_slots')
        .insert({
          course_id,
          teacher_id: teacher_id || null,
          starts_at: when.toISOString(),
          duration_minutes: durationValue,
          capacity: capacityValue,
          meeting_link: meeting_link || null,
          description: description || null,
          status: slotStatus,
          created_by: auth.userId,
        })
        .select(SLOT_SELECT)
        .single();

      if (error) {
        // 23505 is the (course_id, starts_at) unique constraint — the admin
        // already has a slot at this time, which is not a failure worth
        // aborting the rest of the batch for.
        skipped.push({
          starts_at: when.toISOString(),
          reason: error.code === '23505' ? 'duplicate' : 'error',
        });
        continue;
      }
      if (data) created.push(toAdminSlot(data as any));
    }

    return noStore(
      NextResponse.json({ created, skipped }, { status: created.length ? 201 : 409 })
    );
  } catch (error) {
    console.error('[admin/trial-slots] create failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
