import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/live-classes - Get live classes for a course
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

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

    const role = userProfile?.role;

    let query = supabase
      .from('live_classes')
      .select(`
        *,
        users!live_classes_teacher_id_fkey (
          full_name
        )
      `)
      .eq('course_id', courseId)
      .order('scheduled_at', { ascending: true });

    // Apply role-based filtering
    if (role === 'student') {
      query = query.eq('is_published', true);
    } else if (role === 'teacher') {
      // Teachers can see their own classes and classes for courses they're assigned to
      query = query.or(`teacher_id.eq.${user.id},is_published.eq.true`);
    }
    // Admins and superadmins can see all classes

    const { data: liveClasses, error } = await query;

    if (error) {
      console.error('Error fetching live classes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch live classes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ liveClasses });
  } catch (error) {
    console.error('Error in live classes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/live-classes - Create new live class
export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;

    // Only teachers, admins, and superadmins can create live classes
    if (!['teacher', 'admin', 'superadmin'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Teacher access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      courseId, 
      title, 
      description, 
      meetingUrl, 
      meetingId, 
      scheduledAt, 
      durationMinutes = 60, 
      maxParticipants,
      isPublished = false 
    } = body;

    if (!courseId || !title || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, scheduledAt' },
        { status: 400 }
      );
    }

    // Validate course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // For teachers, verify they're assigned to the course
    if (role === 'teacher') {
      const { data: teacherCourse } = await supabase
        .from('teacher_courses')
        .select('course_id')
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

    // Create live class
    const { data: liveClass, error: insertError } = await supabase
      .from('live_classes')
      .insert({
        course_id: courseId,
        teacher_id: user.id,
        title,
        description,
        meeting_url: meetingUrl,
        meeting_id: meetingId,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        max_participants: maxParticipants,
        is_published: isPublished
      })
      .select(`
        *,
        users!live_classes_teacher_id_fkey (
          full_name
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating live class:', insertError);
      return NextResponse.json(
        { error: 'Failed to create live class' },
        { status: 500 }
      );
    }

    return NextResponse.json({ liveClass }, { status: 201 });
  } catch (error) {
    console.error('Error in live classes POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

