import { NextRequest, NextResponse } from 'next/server';

import { noStore, serviceClient, SLOT_SELECT } from '@/lib/trial-booking-server';
import { TRIAL_BOOKING_LEAD_TIME_MINUTES } from '@/lib/trial-booking';

export const dynamic = 'force-dynamic';

interface SubjectOption {
  courseId: string;
  courseTitle: string;
  subject: string;
  board: string | null;
  openSlotCount: number;
  totalSeatsLeft: number;
  nextSlotAt: string | null;
}

interface LevelOption {
  level: string;
  boards: string[];
  subjects: SubjectOption[];
}

/**
 * GET /api/trial-slots/options
 *
 * Public. The level → board → subject tree for the booking flow.
 *
 * Built from slots that are actually bookable rather than from the whole
 * catalogue, so a visitor can never pick a subject and then land on an empty
 * calendar. A subject only appears here if it has at least one open, future
 * slot on a published course.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = serviceClient();

    const cutoff = new Date(
      Date.now() + TRIAL_BOOKING_LEAD_TIME_MINUTES * 60_000
    ).toISOString();

    const { data, error } = await supabase
      .from('trial_slots')
      .select(SLOT_SELECT)
      .eq('status', 'open')
      .eq('courses.is_published', true)
      .gte('starts_at', cutoff)
      .order('starts_at', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('[trial-slots/options] query failed:', error);
      return NextResponse.json(
        { error: 'Could not load booking options.' },
        { status: 500 }
      );
    }

    // Fold slots into level → subject. The catalogue is ~50 courses and slots
    // are in the tens, so doing this in JS is cheaper than several round trips.
    const byLevel = new Map<string, Map<string, SubjectOption>>();

    for (const row of data ?? []) {
      const course = (row as any).courses;
      if (!course?.level || !course?.subject) continue;

      const seatsLeft = Math.max(
        ((row as any).capacity ?? 0) - ((row as any).booked_count ?? 0),
        0
      );

      const subjects = byLevel.get(course.level) ?? new Map<string, SubjectOption>();
      const key = `${course.board ?? ''}::${course.subject}`;
      const existing = subjects.get(key);

      if (existing) {
        existing.openSlotCount += 1;
        existing.totalSeatsLeft += seatsLeft;
      } else {
        subjects.set(key, {
          courseId: course.id,
          courseTitle: course.title,
          subject: course.subject,
          board: course.board ?? null,
          openSlotCount: 1,
          totalSeatsLeft: seatsLeft,
          // Rows arrive ordered by starts_at, so the first one wins.
          nextSlotAt: (row as any).starts_at,
        });
      }

      byLevel.set(course.level, subjects);
    }

    const levels: LevelOption[] = Array.from(byLevel.entries()).map(
      ([level, subjectMap]) => {
        const subjects = Array.from(subjectMap.values()).sort((a, b) =>
          a.subject.localeCompare(b.subject)
        );
        const boards = Array.from(
          new Set(subjects.map(s => s.board).filter((b): b is string => !!b))
        ).sort();
        return { level, boards, subjects };
      }
    );

    // O Level before IGCSE, matching the catalogue's LEVEL_ORDER.
    const order = ['O Level', 'IGCSE'];
    levels.sort((a, b) => {
      const ai = order.indexOf(a.level);
      const bi = order.indexOf(b.level);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return noStore(NextResponse.json({ levels }));
  } catch (error) {
    console.error('[trial-slots/options] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
