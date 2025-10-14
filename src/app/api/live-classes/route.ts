import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const teacherId = searchParams.get('teacher_id');
    const status = searchParams.get('status');

    // Get session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role to determine what live classes they can see
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Build query using admin client to avoid RLS blocking legitimate views
    let query = supabaseAdmin
      .from('live_classes')
      .select(`
        *,
        courses!inner(title, created_by),
        users!live_classes_teacher_id_fkey(full_name, email)
      `)
      .order('scheduled_date', { ascending: true });

    // Apply filters
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // For students, only show live classes for courses they're enrolled in
    if (userProfile?.role === 'student') {
      const { data: enrollments } = await supabaseAdmin
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (enrollments && enrollments.length > 0) {
        const enrolledCourseIds = enrollments.map(e => e.course_id);
        query = query.in('course_id', enrolledCourseIds);
      } else {
        // Student has no enrollments, return empty array
        return NextResponse.json({ liveClasses: [] });
      }
    }

    // For teachers: show classes they created OR classes for courses they are assigned to
    if (userProfile?.role === 'teacher') {
      const { data: teacherCourses } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id);

      if (teacherCourses && teacherCourses.length > 0) {
        const assignedCourseIds = teacherCourses.map(tc => tc.course_id).join(',');
        // Use OR filter: teacher_id == user OR course_id IN (assigned)
        query = query.or(`teacher_id.eq.${user.id},course_id.in.(${assignedCourseIds})`);
      } else {
        query = query.eq('teacher_id', user.id);
      }
    }

    // Admins and superadmins can see all live classes

    const { data: liveClasses, error } = await query;

    if (error) {
      console.error('Error fetching live classes:', error);
      console.error('Query details:', { courseId, teacherId, status });
      return NextResponse.json({ error: 'Failed to fetch live classes', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ liveClasses });
  } catch (error) {
    console.error('Error in live classes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course_id, title, description, scheduled_date, duration_minutes, meeting_link } = body;

    // Get session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!course_id || !title || !scheduled_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is teacher of the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('created_by')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get user role from database
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Check if user is authorized to create live classes for this course
    if (userProfile?.role === 'student') {
      return NextResponse.json({ 
        error: 'Students cannot create live classes',
        details: {
          userId: user.id,
          userRole: userProfile?.role
        }
      }, { status: 403 });
    }

    // For teachers, check if they're assigned to this course
    if (userProfile?.role === 'teacher') {
      const { data: teacherCourse } = await supabase
        .from('teacher_courses')
        .select('teacher_id')
        .eq('course_id', course_id)
        .eq('teacher_id', user.id)
        .single();

      if (!teacherCourse) {
        return NextResponse.json({ 
          error: 'You are not assigned as a teacher for this course',
          details: {
            userId: user.id,
            courseId: course_id,
            userRole: userProfile?.role
          }
        }, { status: 403 });
      }
    }

    // Admins and superadmins can create live classes for any course
    const isSuperAdminOrAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'admin';
    const client = isSuperAdminOrAdmin ? supabaseAdmin : supabase;

    // Determine the teacher who should own this class
    // - Teachers: themselves
    // - Admin/Superadmin: default to course creator so the teacher can see it
    const teacherIdForClass = isSuperAdminOrAdmin ? course.created_by : user.id;

    // Create live class
    const { data: liveClass, error: createError } = await client
      .from('live_classes')
      .insert({
        course_id,
        teacher_id: teacherIdForClass,
        title,
        description: description || null,
        scheduled_date: scheduled_date,
        duration_minutes: duration_minutes || 60,
        meeting_link: meeting_link || null
      })
      .select(`
        *,
        courses!inner(title),
        users!live_classes_teacher_id_fkey(full_name, email)
      `)
      .single();

    if (createError) {
      console.error('Error creating live class:', createError);
      return NextResponse.json({ error: 'Failed to create live class' }, { status: 500 });
    }

    return NextResponse.json({ liveClass }, { status: 201 });
  } catch (error) {
    console.error('Error in live classes POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}