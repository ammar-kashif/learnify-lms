import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Configure Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user role from users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query based on user role
    let query = supabaseAdmin
      .from('lecture_recordings')
      .select(`
        id,
        title,
        description,
        video_url,
        video_key,
        duration,
        file_size,
        thumbnail_url,
        is_published,
        created_at,
        updated_at,
        teacher_id
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (userProfile.role === 'student') {
      // Students can only see published recordings for courses they're enrolled in
      const { data: enrollment } = await supabaseAdmin
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (!enrollment) {
        return NextResponse.json({ 
          error: 'Not enrolled in this course' 
        }, { status: 403 });
      }

      query = query.eq('is_published', true);
    } else if (userProfile.role === 'teacher') {
      // Teachers can see all recordings for courses they're assigned to
      const { data: teacherCourse } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (!teacherCourse) {
        return NextResponse.json({ 
          error: 'Not assigned to this course' 
        }, { status: 403 });
      }
    }
    // Admins and superadmins can see all recordings (no additional filtering)

    const { data: lectureRecordings, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch lecture recordings' 
      }, { status: 500 });
    }

    // Fetch teacher names in batch from users table
    const teacherIds = Array.from(new Set((lectureRecordings || []).map((r: any) => r.teacher_id)));
    let teacherNameById: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabaseAdmin
        .from('users')
        .select('id, full_name')
        .in('id', teacherIds);
      if (teachers) {
        for (const t of teachers) {
          teacherNameById[t.id] = t.full_name || 'Unknown Teacher';
        }
      }
    }

    // Format the response
    const formattedRecordings = (lectureRecordings || []).map((recording: any) => ({
      id: recording.id,
      title: recording.title,
      description: recording.description,
      video_url: recording.video_url,
      video_key: recording.video_key,
      duration: recording.duration,
      file_size: recording.file_size,
      thumbnail_url: recording.thumbnail_url,
      is_published: recording.is_published,
      created_at: recording.created_at,
      updated_at: recording.updated_at,
      teacher_name: teacherNameById[recording.teacher_id] || 'Unknown Teacher',
    }));

    return NextResponse.json({
      success: true,
      lectureRecordings: formattedRecordings,
    });

  } catch (error) {
    console.error('Lecture recordings list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch lecture recordings',
    }, { status: 500 });
  }
}
