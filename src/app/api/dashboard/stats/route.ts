import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Dashboard summary counters.
 *
 * Every figure here is derived from a column that actually exists. The previous
 * version read `courses.price`, `courses.current_students`, `courses.max_students`,
 * `courses.duration_weeks`, `student_enrollments.progress_percentage` and
 * `student_enrollments.status` — none of which are in the schema, so both branches
 * threw and the route always returned 500.
 *
 * There is no progress-tracking table, so per-course completion percentage is not
 * derivable and is no longer reported. Revenue comes from approved payment
 * verifications, which is the only real record of money taken.
 */
export async function GET(request: NextRequest) {
  try {
    // Runs with the service role, so it must authorise the caller itself —
    // previously it read `userId` straight from the query string, which let
    // anyone fetch anyone else's figures.
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
    const requested = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!role) {
      return NextResponse.json(
        { error: 'Missing role parameter' },
        { status: 400 }
      );
    }

    let userId = user.id;
    if (requested && requested !== user.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      userId = requested;
    }

    if (role === 'teacher') {
      const { data: taught, error: taughtError } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', userId);

      if (taughtError) throw taughtError;

      const courseIds = taught?.map(t => t.course_id) ?? [];

      if (courseIds.length === 0) {
        return NextResponse.json({
          stats: {
            totalCourses: 0,
            totalStudents: 0,
            totalRevenue: 0,
            paidEnrollments: 0,
            demoEnrollments: 0,
          },
        });
      }

      const [enrollmentsResult, paymentsResult] = await Promise.all([
        supabase
          .from('student_enrollments')
          .select('student_id, enrollment_type')
          .in('course_id', courseIds),
        supabase
          .from('payment_verifications')
          .select('amount')
          .eq('status', 'approved')
          .in('course_id', courseIds),
      ]);

      if (enrollmentsResult.error) throw enrollmentsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const enrollments = enrollmentsResult.data ?? [];
      const uniqueStudents = new Set(enrollments.map(e => e.student_id));

      return NextResponse.json({
        stats: {
          totalCourses: courseIds.length,
          totalStudents: uniqueStudents.size,
          totalRevenue: (paymentsResult.data ?? []).reduce(
            (sum, p) => sum + Number(p.amount ?? 0),
            0
          ),
          paidEnrollments: enrollments.filter(
            e => e.enrollment_type === 'paid'
          ).length,
          demoEnrollments: enrollments.filter(
            e => e.enrollment_type === 'demo'
          ).length,
        },
      });
    }

    // Student
    const [enrollmentsResult, attemptsResult, submissionsResult] =
      await Promise.all([
        supabase
          .from('student_enrollments')
          .select('course_id, enrollment_type')
          .eq('student_id', userId),
        supabase
          .from('quiz_attempts')
          .select('score, max_score')
          .eq('student_id', userId)
          .not('completed_at', 'is', null),
        supabase
          .from('assignment_submissions')
          .select('grade, status')
          .eq('student_id', userId),
      ]);

    if (enrollmentsResult.error) throw enrollmentsResult.error;
    if (attemptsResult.error) throw attemptsResult.error;
    if (submissionsResult.error) throw submissionsResult.error;

    const enrollments = enrollmentsResult.data ?? [];
    const attempts = attemptsResult.data ?? [];
    const submissions = submissionsResult.data ?? [];

    // Percentage across all graded quiz attempts, weighted by available points.
    const pointsEarned = attempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
    const pointsPossible = attempts.reduce(
      (sum, a) => sum + (a.max_score ?? 0),
      0
    );

    return NextResponse.json({
      stats: {
        totalCourses: enrollments.length,
        paidEnrollments: enrollments.filter(e => e.enrollment_type === 'paid')
          .length,
        demoEnrollments: enrollments.filter(e => e.enrollment_type === 'demo')
          .length,
        quizzesCompleted: attempts.length,
        averageQuizScore:
          pointsPossible > 0
            ? Math.round((pointsEarned / pointsPossible) * 1000) / 10
            : 0,
        assignmentsSubmitted: submissions.length,
        assignmentsGraded: submissions.filter(s => s.status === 'graded').length,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
