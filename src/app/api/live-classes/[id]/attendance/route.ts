import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Load class and user role using admin client (bypass RLS)
    const { data: liveClass, error: liveClassError } = await supabaseAdmin
      .from('live_classes')
      .select('teacher_id, course_id')
      .eq('id', id)
      .single();

    if (liveClassError || !liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
    let isAssignedTeacher = false;
    if (userProfile?.role === 'teacher') {
      const { data: tc } = await supabaseAdmin
        .from('teacher_courses')
        .select('teacher_id')
        .eq('teacher_id', user.id)
        .eq('course_id', liveClass.course_id)
        .maybeSingle();
      isAssignedTeacher = !!tc;
    }

    if (!(isAdmin || liveClass.teacher_id === user.id || isAssignedTeacher)) {
      return NextResponse.json({ error: 'Unauthorized to view attendance for this live class' }, { status: 403 });
    }


    // Get students with live class subscriptions for this course using admin client
    const { data: enrolledStudents, error: studentsError } = await supabaseAdmin
      .from('student_enrollments')
      .select(`
        student_id,
        subscription_id,
        enrollment_type,
        users!student_enrollments_student_id_fkey(id, full_name, email, avatar_url),
        user_subscriptions!student_enrollments_subscription_id_fkey(
          id,
          status,
          expires_at,
          subscription_plans!user_subscriptions_subscription_plan_id_fkey(
            id,
            type,
            name
          )
        )
      `)
      .eq('course_id', liveClass.course_id)
      .not('subscription_id', 'is', null);

    if (studentsError) {
      console.error('Error fetching enrolled students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch enrolled students' }, { status: 500 });
    }

    // Filter students with active live class subscriptions
    const liveClassStudents = enrolledStudents?.filter(enrollment => {
      const subscription = enrollment.user_subscriptions;
      if (!subscription) return false;
      
      // Check if subscription is active and not expired
      const isActive = subscription.status === 'active';
      const isNotExpired = new Date(subscription.expires_at) > new Date();
      
      // Check if subscription plan includes live classes
      const planType = subscription.subscription_plans?.type;
      const hasLiveClasses = planType === 'live_classes_only' || planType === 'recordings_and_live';
      
      return isActive && isNotExpired && hasLiveClasses;
    }) || [];

    // Get existing attendance records using admin client
    const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('live_class_id', id);

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }

    // Combine student data with attendance records
    const attendanceData = liveClassStudents.map(enrollment => {
      const student = enrollment.users;
      const attendanceRecord = attendanceRecords?.find(record => record.student_id === student.id);
      
      return {
        student_id: student.id,
        full_name: student.full_name,
        email: student.email,
        avatar_url: student.avatar_url,
        status: attendanceRecord?.status || 'absent',
        marked_at: attendanceRecord?.marked_at || null,
        notes: attendanceRecord?.notes || null
      };
    });

    return NextResponse.json({ attendance: attendanceData });
  } catch (error) {
    console.error('Error in attendance GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { attendanceData } = body; // Array of { student_id, status, notes }

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

    // Load class and user role using admin client (bypass RLS)
    const { data: liveClass, error: liveClassError } = await supabaseAdmin
      .from('live_classes')
      .select('teacher_id, course_id')
      .eq('id', id)
      .single();

    if (liveClassError || !liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
    let isAssignedTeacher = false;
    if (userProfile?.role === 'teacher') {
      const { data: tc } = await supabaseAdmin
        .from('teacher_courses')
        .select('teacher_id')
        .eq('teacher_id', user.id)
        .eq('course_id', liveClass.course_id)
        .maybeSingle();
      isAssignedTeacher = !!tc;
    }

    if (!(isAdmin || liveClass.teacher_id === user.id || isAssignedTeacher)) {
      return NextResponse.json({ error: 'Unauthorized to mark attendance for this live class' }, { status: 403 });
    }

    // Validate attendance data
    if (!Array.isArray(attendanceData)) {
      return NextResponse.json({ error: 'Invalid attendance data format' }, { status: 400 });
    }

    // Prepare attendance records for upsert
    const attendanceRecords = attendanceData.map(record => ({
      live_class_id: id,
      student_id: record.student_id,
      status: record.status,
      marked_by: user.id,
      notes: record.notes || null
    }));

    // Upsert attendance records using admin client to bypass RLS
    const { data: updatedAttendance, error: upsertError } = await supabaseAdmin
      .from('attendance')
      .upsert(attendanceRecords, {
        onConflict: 'live_class_id,student_id'
      })
      .select('*');

    if (upsertError) {
      console.error('Error upserting attendance records:', upsertError);
      return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Attendance saved successfully',
      attendance: updatedAttendance 
    });
  } catch (error) {
    console.error('Error in attendance POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
