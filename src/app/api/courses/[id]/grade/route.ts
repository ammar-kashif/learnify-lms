import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// GET /api/courses/[id]/grade - Get overall course grade for a student
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    // Only students can view their own grades
    if (userRole !== 'student') {
      return NextResponse.json(
        { error: 'Only students can view course grades' },
        { status: 403 }
      );
    }

    // Verify student is enrolled in the course
    const { data: enrollment } = await supabaseAdmin
      .from('student_enrollments')
      .select('course_id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Get all assignments for this course
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('assignments')
      .select('id, title, max_points')
      .eq('course_id', courseId)
      .eq('is_published', true);

    // Get all quizzes for this course
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quizzes')
      .select('id, title')
      .eq('course_id', courseId);

    if (assignmentsError || quizzesError) {
      console.error('Error fetching course content:', { assignmentsError, quizzesError });
      return NextResponse.json(
        { error: 'Failed to fetch course content', details: { assignmentsError, quizzesError } },
        { status: 500 }
      );
    }

    // assignments and quizzes will be arrays (may be empty)
    const assignmentList = assignments || [];
    const quizList = quizzes || [];

    // Get all assignment grades for this student in this course
    const assignmentIds = assignmentList.map(a => a.id);
    let assignmentGrades: any[] = [];
    
    if (assignmentIds.length > 0) {
      const { data: submissions } = await supabaseAdmin
        .from('assignment_submissions')
        .select('assignment_id, grade')
        .in('assignment_id', assignmentIds)
        .eq('student_id', user.id)
        .not('grade', 'is', null);

      assignmentGrades = submissions || [];
    }

    // Get all quiz grades for this student in this course
    const quizIds = quizList.map(q => q.id);
    let quizGrades: any[] = [];

    if (quizIds.length > 0) {
      const { data: attempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('quiz_id, score, max_score')
        .in('quiz_id', quizIds)
        .eq('student_id', user.id);

      quizGrades = attempts || [];
    }

    // Calculate overall statistics
    const totalAssignments = assignmentList.length;
    const gradedAssignments = assignmentGrades.length;
    const totalQuizzes = quizList.length;
    const completedQuizzes = quizGrades.length;

    // Calculate weighted averages (you can customize these weights)
    // Default: 50% assignments, 50% quizzes
    const assignmentWeight = 0.5;
    const quizWeight = 0.5;

    let assignmentAverage = 0;
    let quizAverage = 0;

    if (gradedAssignments > 0) {
      const assignmentTotal = assignmentGrades.reduce((sum, sub) => {
        const assignment = assignmentList.find((a: any) => a.id === sub.assignment_id);
        const maxPoints = assignment?.max_points || 100;
        const gradePercentage = (sub.grade / maxPoints) * 100;
        return sum + gradePercentage;
      }, 0);
      assignmentAverage = assignmentTotal / gradedAssignments;
    }

    if (completedQuizzes > 0) {
      const quizTotal = quizGrades.reduce((sum, attempt) => {
        const percentage = (attempt.score / attempt.max_score) * 100;
        return sum + percentage;
      }, 0);
      quizAverage = quizTotal / completedQuizzes;
    }

    // Calculate overall course grade
    let overallGrade = 0;
    let gradeLetter = 'N/A';
    let gradePercentage = 0;

    if (gradedAssignments > 0 && completedQuizzes > 0) {
      gradePercentage = (assignmentAverage * assignmentWeight) + (quizAverage * quizWeight);
    } else if (gradedAssignments > 0) {
      gradePercentage = assignmentAverage;
    } else if (completedQuizzes > 0) {
      gradePercentage = quizAverage;
    }

    overallGrade = Math.round(gradePercentage * 100) / 100;

    // Determine letter grade
    if (gradePercentage >= 97) gradeLetter = 'A+';
    else if (gradePercentage >= 93) gradeLetter = 'A';
    else if (gradePercentage >= 90) gradeLetter = 'A-';
    else if (gradePercentage >= 87) gradeLetter = 'B+';
    else if (gradePercentage >= 83) gradeLetter = 'B';
    else if (gradePercentage >= 80) gradeLetter = 'B-';
    else if (gradePercentage >= 77) gradeLetter = 'C+';
    else if (gradePercentage >= 73) gradeLetter = 'C';
    else if (gradePercentage >= 70) gradeLetter = 'C-';
    else if (gradePercentage >= 67) gradeLetter = 'D+';
    else if (gradePercentage >= 65) gradeLetter = 'D';
    else if (gradePercentage >= 0) gradeLetter = 'F';

    return NextResponse.json({
      courseGrade: {
        overallPercentage: overallGrade,
        letterGrade: gradeLetter,
        assignmentAverage: Math.round(assignmentAverage * 100) / 100,
        quizAverage: Math.round(quizAverage * 100) / 100,
        assignmentWeight,
        quizWeight,
        statistics: {
          totalAssignments,
          gradedAssignments,
          missingAssignments: totalAssignments - gradedAssignments,
          totalQuizzes,
          completedQuizzes,
          pendingQuizzes: totalQuizzes - completedQuizzes,
        },
        breakdown: {
          assignments: assignmentGrades.map(sub => {
            const assignment = assignmentList.find((a: any) => a.id === sub.assignment_id);
            const maxPoints = assignment?.max_points || 100;
            return {
              assignment_id: sub.assignment_id,
              assignment_title: assignment?.title || 'Unknown',
              grade: sub.grade,
              max_points: maxPoints,
              percentage: ((sub.grade / maxPoints) * 100).toFixed(1),
            };
          }),
          quizzes: quizGrades.map(attempt => {
            const quiz = quizList.find((q: any) => q.id === attempt.quiz_id);
            return {
              quiz_id: attempt.quiz_id,
              quiz_title: quiz?.title || 'Unknown',
              score: attempt.score,
              max_score: attempt.max_score,
              percentage: ((attempt.score / attempt.max_score) * 100).toFixed(1),
            };
          }),
        },
      },
    });

  } catch (error) {
    console.error('Error calculating course grade:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

