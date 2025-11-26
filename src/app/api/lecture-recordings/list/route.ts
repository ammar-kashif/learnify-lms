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

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Authentication is optional - guests can access first lecture
    let user: any = null;
    let userProfile: any = null;
    let isGuest = true;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: authUser, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (!userError && authUser) {
        user = authUser;
        isGuest = false;

        // Get user role from users table
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profileError && profile) {
          userProfile = profile;
        }
      }
    }

    // Check enrollment status for students
    let enrollment: any = null;
    let isEnrolled = false;
    if (!isGuest && userProfile?.role === 'student') {
      const { data: enrollmentData } = await supabaseAdmin
        .from('student_enrollments')
        .select('course_id, enrollment_type')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();
      
      enrollment = enrollmentData;
      isEnrolled = !!enrollment;
    }

    // Build query based on user role or guest status
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
        is_demo,
        created_at,
        updated_at,
        teacher_id
      `)
      .eq('course_id', courseId);

    // Guest access or non-enrolled students: Return only first lecture (oldest by created_at)
    if (isGuest || (!isGuest && userProfile?.role === 'student' && !isEnrolled)) {
      query = query
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .limit(1);
    } else {
      query = query.order('created_at', { ascending: false });

      // Apply role-based filtering for authenticated users
      if (userProfile?.role === 'student' && isEnrolled) {
        // Enrolled students - show all published lectures
        query = query.eq('is_published', true);
      } else if (userProfile?.role === 'teacher') {
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
    }

    const { data: lectureRecordings, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch lecture recordings' 
      }, { status: 500 });
    }

    // Fetch teacher names in batch from users table
    const teacherIds = Array.from(new Set((lectureRecordings || []).map((r: any) => r.teacher_id)));
    const teacherNameById: Record<string, string> = {};
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

    // For guests or non-enrolled users, we need to fetch ALL lectures to show locked ones
    // but only return the first one as accessible
    let allRecordings: any[] = [];
    if (isGuest || (!isGuest && userProfile?.role === 'student' && !isEnrolled)) {
      const { data: allRecs } = await supabaseAdmin
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
          is_demo,
          created_at,
          updated_at,
          teacher_id
        `)
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('created_at', { ascending: true });
      
      allRecordings = allRecs || [];
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
      is_accessible: true, // This recording is accessible
    }));

    // Add locked lectures for guests/non-enrolled users
    if (allRecordings.length > formattedRecordings.length) {
      const accessibleIds = new Set(formattedRecordings.map(r => r.id));
      const lockedRecordings = allRecordings
        .filter(r => !accessibleIds.has(r.id))
        .map((recording: any) => ({
          id: recording.id,
          title: recording.title,
          description: recording.description,
          video_url: null, // Don't expose video URL for locked lectures
          video_key: null,
          duration: recording.duration,
          file_size: recording.file_size,
          thumbnail_url: recording.thumbnail_url,
          is_published: recording.is_published,
          created_at: recording.created_at,
          updated_at: recording.updated_at,
          teacher_name: teacherNameById[recording.teacher_id] || 'Unknown Teacher',
          is_accessible: false, // This recording is locked
        }));
      
      formattedRecordings.push(...lockedRecordings);
      // Sort by created_at to maintain order
      formattedRecordings.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return NextResponse.json({
      success: true,
      lectureRecordings: formattedRecordings,
      isGuest: isGuest,
    });

  } catch (error) {
    console.error('Lecture recordings list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch lecture recordings',
    }, { status: 500 });
  }
}
