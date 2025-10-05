import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT /api/assignments/submissions/[id]/grade - Grade a submission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    // Only teachers, admins, and superadmins can grade submissions
    if (!['teacher', 'admin', 'superadmin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Only teachers can grade submissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { grade, feedback } = body;

    // Validate grade
    if (grade === undefined || grade === null) {
      return NextResponse.json(
        { error: 'Grade is required' },
        { status: 400 }
      );
    }

    if (typeof grade !== 'number' || grade < 0) {
      return NextResponse.json(
        { error: 'Grade must be a non-negative number' },
        { status: 400 }
      );
    }

    // Get the submission
    const { data: submission, error: submissionError } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('id', params.id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Load assignment details separately (avoid FK join hints)
    const { data: assignment, error: assignmentErr } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', submission.assignment_id as string)
      .single();
    if (assignmentErr || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // For teachers, verify they have access to this assignment
    if (userRole === 'teacher') {
      if (assignment.teacher_id !== user.id) {
        const { data: teacherCourse } = await supabase
          .from('teacher_courses')
          .select('*')
          .eq('teacher_id', user.id)
          .eq('course_id', assignment.course_id)
          .single();

        if (!teacherCourse) {
          return NextResponse.json(
            { error: 'You do not have access to grade this submission' },
            { status: 403 }
          );
        }
      }
    }

    // Validate grade against max points
    if (grade > assignment.max_points) {
      return NextResponse.json(
        { error: `Grade cannot exceed maximum points (${assignment.max_points})` },
        { status: 400 }
      );
    }

    // Update submission with grade
    const { data: updatedSubmission, error } = await supabase
      .from('assignment_submissions')
      .update({
        grade,
        feedback: feedback || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error grading submission:', error);
      return NextResponse.json(
        { error: 'Failed to grade submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission: updatedSubmission });

  } catch (error) {
    console.error('Error in grade API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


