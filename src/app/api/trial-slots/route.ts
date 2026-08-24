import { NextRequest, NextResponse } from 'next/server';

import {
  noStore,
  serviceClient,
  SLOT_SELECT,
  toPublicSlot,
} from '@/lib/trial-booking-server';
import { TRIAL_BOOKING_LEAD_TIME_MINUTES } from '@/lib/trial-booking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trial-slots
 *
 * Public. Bookable free-trial slots for one subject.
 *
 * Query: course_id, or level + subject (+ optional board).
 *
 * Only ever returns slots that are `open`, belong to a published course, and
 * start after the lead-time cutoff. `meeting_link` and all guest details are
 * stripped by `toPublicSlot` — this endpoint is unauthenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const level = searchParams.get('level');
    const board = searchParams.get('board');
    const subject = searchParams.get('subject');

    if (!courseId && !(level && subject)) {
      return NextResponse.json(
        { error: 'Provide either course_id, or level and subject.' },
        { status: 400 }
      );
    }

    const supabase = serviceClient();

    const cutoff = new Date(
      Date.now() + TRIAL_BOOKING_LEAD_TIME_MINUTES * 60_000
    ).toISOString();

    let query = supabase
      .from('trial_slots')
      .select(SLOT_SELECT)
      .eq('status', 'open')
      .eq('courses.is_published', true)
      .gte('starts_at', cutoff)
      .order('starts_at', { ascending: true })
      .limit(200);

    if (courseId) {
      query = query.eq('course_id', courseId);
    } else {
      query = query.eq('courses.level', level).eq('courses.subject', subject);
      if (board) query = query.eq('courses.board', board);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[trial-slots] query failed:', error);
      return NextResponse.json(
        { error: 'Could not load available slots.' },
        { status: 500 }
      );
    }

    const slots = (data ?? [])
      .map(toPublicSlot)
      // A slot with no seats left is still returned so the UI can show it as
      // "Full" rather than silently hiding a time the visitor was expecting.
      .filter(slot => slot.courseTitle);

    return noStore(NextResponse.json({ slots }));
  } catch (error) {
    console.error('[trial-slots] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
