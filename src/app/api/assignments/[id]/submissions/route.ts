import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/assignments/[id]/submissions - Get submissions for an assignment
export async function GET(
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

    // Get the assignment to check permissions
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('assignment_submissions')
      .select(`*`)
      .eq('assignment_id', params.id);

    // Students can only see their own submissions
    if (userRole === 'student') {
      query = query.eq('student_id', user.id);
    }
    // Teachers can see all submissions for their assignments
    else if (userRole === 'teacher') {
      // Verify teacher has access to this assignment
      if (assignment.teacher_id !== user.id) {
        const { data: teacherCourse } = await supabase
          .from('teacher_courses')
          .select('*')
          .eq('teacher_id', user.id)
          .eq('course_id', assignment.course_id)
          .single();

        if (!teacherCourse) {
          return NextResponse.json(
            { error: 'You do not have access to this assignment' },
            { status: 403 }
          );
        }
      }
    }
    // Admins and superadmins can see all submissions
    else if (!['admin', 'superadmin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { data: submissions, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Enrich with user profiles (public.users) without relying on FK join
    const studentIds = (submissions || []).map(s => s.student_id);
    let usersById: Record<string, { id: string; full_name: string | null; email: string | null }> = {};
    if (studentIds.length > 0) {
      const { data: userRows, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', studentIds);
      if (!usersErr && userRows) {
        usersById = userRows.reduce((acc, u) => { acc[u.id] = u as any; return acc; }, {} as Record<string, any>);
      }
    }

    const enriched = (submissions || []).map(s => ({
      ...s,
      users: usersById[s.student_id] || null,
    }));

    return NextResponse.json({ submissions: enriched });

  } catch (error) {
    console.error('Error in submissions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/assignments/[id]/submissions - Submit an assignment
export async function POST(
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

    // Only students can submit assignments
    if (userRole !== 'student') {
      return NextResponse.json(
        { error: 'Only students can submit assignments' },
        { status: 403 }
      );
    }

    // Get the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if assignment is published
    if (!assignment.is_published) {
      return NextResponse.json(
        { error: 'Assignment is not published' },
        { status: 403 }
      );
    }

    // Check if student is enrolled in the course
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', assignment.course_id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if due date has passed
    if (assignment.due_date && assignment.stop_submissions_after_due && new Date(assignment.due_date) < new Date()) {
      return NextResponse.json(
        { error: 'Assignment due date has passed' },
        { status: 400 }
      );
    }

    // Get current submission count for this student
    const { data: existingSubmissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('submission_number')
      .eq('assignment_id', params.id)
      .eq('student_id', user.id)
      .order('submission_number', { ascending: false });

    if (submissionsError) {
      console.error('Error checking existing submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to check existing submissions' },
        { status: 500 }
      );
    }

    const currentSubmissionCount = existingSubmissions.length;
    const nextSubmissionNumber = currentSubmissionCount + 1;

    // Check if student has reached max submissions
    if (currentSubmissionCount >= assignment.max_submissions) {
      return NextResponse.json(
        { error: `Maximum submissions (${assignment.max_submissions}) reached` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      fileUrl,
      fileKey,
      fileName,
      fileSize,
      fileType
    } = body;

    // Validate required fields
    if (!fileUrl || !fileKey || !fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Missing required file information' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !assignment.allowed_file_types.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${assignment.allowed_file_types.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    const fileSizeMb = fileSize / (1024 * 1024);
    if (fileSizeMb > assignment.max_file_size_mb) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${assignment.max_file_size_mb}MB` },
        { status: 400 }
      );
    }

    // Create submission
    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: params.id,
        student_id: user.id,
        submission_number: nextSubmissionNumber,
        file_url: fileUrl,
        file_key: fileKey,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        status: 'submitted'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating submission:', error);
      return NextResponse.json(
        { error: 'Failed to submit assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission }, { status: 201 });

  } catch (error) {
    console.error('Error in submissions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
