import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * A student's enrolled courses, with real progress.
 *
 * Progress is lecture completion: `user_actions` rows of type `video_complete`
 * (written by /api/tracking) counted distinct per lecture, over the number of
 * published lecture_recordings in the course. The previous version returned
 * `Math.random()` for progress/total_lessons/completed_lessons and stamped
 * `enrolled_at` with `new Date()` instead of the real enrolment date.
 */
export async function GET(request: NextRequest) {
  try {
    // This route runs with the service role, so it must authorise the caller itself.
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.split(' ')[1]);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requested =
      searchParams.get('studentId') || searchParams.get('userId');

    // Students may only read their own courses; staff may read anyone's.
    let studentId = user.id;
    if (requested && requested !== user.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['teacher', 'admin', 'superadmin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      studentId = requested;
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select(
        `
        course_id,
        enrollment_date,
        enrollment_type,
        courses (
          id,
          title,
          description,
          created_at,
          updated_at,
          created_by,
          users!courses_created_by_fkey (
            full_name
          )
        )
      `
      )
      .eq('student_id', studentId);

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json(
        { error: 'Database error: ' + enrollmentsError.message },
        { status: 500 }
      );
    }

    const courseIds = (enrollments ?? []).map((e: any) => e.course_id);

    if (courseIds.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    const [recordingsResult, completionsResult] = await Promise.all([
      supabase
        .from('lecture_recordings')
        .select('id, course_id, title, created_at')
        .in('course_id', courseIds)
        .eq('is_published', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('user_actions')
        .select('resource_id, course_id')
        .eq('user_id', studentId)
        .eq('action_type', 'video_complete')
        .eq('resource_type', 'lecture_recording')
        .in('course_id', courseIds),
    ]);

    if (recordingsResult.error) throw recordingsResult.error;
    if (completionsResult.error) throw completionsResult.error;

    // course_id -> ordered lectures
    const lecturesByCourse = new Map<string, Array<{ id: string; title: string }>>();
    for (const rec of recordingsResult.data ?? []) {
      const list = lecturesByCourse.get(rec.course_id) ?? [];
      list.push({ id: rec.id, title: rec.title });
      lecturesByCourse.set(rec.course_id, list);
    }

    // course_id -> set of completed lecture ids (the same lecture can be
    // completed more than once, so count distinct)
    const completedByCourse = new Map<string, Set<string>>();
    for (const action of completionsResult.data ?? []) {
      if (!action.course_id || !action.resource_id) continue;
      const set = completedByCourse.get(action.course_id) ?? new Set<string>();
      set.add(action.resource_id);
      completedByCourse.set(action.course_id, set);
    }

    const courses = (enrollments ?? []).map((enrollment: any) => {
      const course = enrollment.courses;
      const lectures = lecturesByCourse.get(enrollment.course_id) ?? [];
      const completed = completedByCourse.get(enrollment.course_id) ?? new Set();

      // Only lectures that still exist and are published count as completed.
      const completedLessons = lectures.filter(l => completed.has(l.id)).length;
      const totalLessons = lectures.length;

      return {
        id: course?.id || '',
        title: course?.title || '',
        description: course?.description || '',
        subject: 'General', // courses has no subject column
        created_at: course?.created_at || '',
        updated_at: course?.updated_at || '',
        enrolled_at: enrollment.enrollment_date,
        enrollment_type: enrollment.enrollment_type,
        progress:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        next_lesson: lectures.find(l => !completed.has(l.id))?.title ?? null,
        instructor_name: course?.users?.full_name || 'Unknown Instructor',
      };
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error in student courses API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student courses' },
      { status: 500 }
    );
  }
}
