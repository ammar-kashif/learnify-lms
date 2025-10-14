import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/assignments - List assignments for a course
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const chapterId = searchParams.get('chapterId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId parameter' },
        { status: 400 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    let query = supabase
      .from('assignments')
      .select(`
        *,
        chapters!assignments_chapter_id_fkey (
          id,
          title
        )
      `)
      .eq('course_id', courseId);

    // Filter by chapter if specified
    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    }

    // For students, only show published assignments
    if (userRole === 'student') {
      query = query.eq('is_published', true);
    }

    const { data: assignments, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // If student, attach latest submission (for grade/status)
    if ((userRole === 'student') && assignments && assignments.length > 0) {
      const assignmentIds = assignments.map(a => a.id);
      const { data: subs, error: subsErr } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade, status, submitted_at')
        .in('assignment_id', assignmentIds)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      const latestByAssignment: Record<string, { assignment_id: string; grade: number | null; status: string; submitted_at: string } > = {};
      if (!subsErr && subs) {
        for (const s of subs) {
          if (!latestByAssignment[s.assignment_id]) latestByAssignment[s.assignment_id] = s as any;
        }
      }

      const enriched = assignments.map(a => ({
        ...a,
        student_submission: latestByAssignment[a.id] || null,
      }));

      return NextResponse.json({ assignments: enriched });
    }

    return NextResponse.json({ assignments });

  } catch (error) {
    console.error('Error in assignments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/assignments - Create a new assignment
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      courseId,
      chapterId,
      title,
      description,
      instructions,
      dueDate,
      maxPoints,
      allowedFileTypes,
      maxFileSizeMb,
      maxSubmissions,
      isPublished,
      attachmentUrl,
      attachmentKey,
      attachmentName
    } = body;

    // Validate required fields
    if (!courseId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId and title' },
        { status: 400 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    // Only teachers, admins, and superadmins can create assignments
    if (!['teacher', 'admin', 'superadmin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Only teachers can create assignments' },
        { status: 403 }
      );
    }

    // For teachers, verify they are assigned to the course
    if (userRole === 'teacher') {
      const { data: teacherCourse } = await supabase
        .from('teacher_courses')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (!teacherCourse) {
        return NextResponse.json(
          { error: 'You are not assigned to this course' },
          { status: 403 }
        );
      }
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        course_id: courseId,
        chapter_id: chapterId || null,
        teacher_id: user.id,
        title,
        description: description || null,
        instructions: instructions || null,
        due_date: dueDate || null,
        max_points: maxPoints || 100,
        allowed_file_types: allowedFileTypes || ['pdf', 'doc', 'docx'],
        max_file_size_mb: maxFileSizeMb || 10,
        max_submissions: maxSubmissions || 1,
        is_published: isPublished || false,
        // if schema has columns for attachment, include them; otherwise expect-error
        attachment_url: attachmentUrl || null,
        attachment_key: attachmentKey || null,
        attachment_name: attachmentName || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignment }, { status: 201 });

  } catch (error) {
    console.error('Error in assignments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
