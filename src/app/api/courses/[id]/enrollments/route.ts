import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/courses/[id]/enrollments - Get all enrollment statuses for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!bearer) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing authorization header' },
        { status: 401 }
      );
    }

    // Verify user authentication and get role
    const { data: userResult, error: userErr } = await supabase.auth.getUser(bearer);
    if (userErr || !userResult?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const userId = userResult.user.id;

    // Check if user has permission to view enrollments (teacher, admin, or superadmin)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'Failed to verify user role' },
        { status: 403 }
      );
    }

    const userRole = userProfile.role;

    // Check if user is a teacher assigned to this course, or admin/superadmin
    if (userRole === 'teacher') {
      const { data: teacherCourse, error: teacherError } = await supabase
        .from('teacher_courses')
        .select('teacher_id')
        .eq('course_id', courseId)
        .eq('teacher_id', userId)
        .single();

      if (teacherError || !teacherCourse) {
        return NextResponse.json(
          { error: 'Access denied - Not assigned to this course' },
          { status: 403 }
        );
      }
    } else if (!['admin', 'superadmin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get course information
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get all enrollments for this course
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        enrollment_type,
        subscription_id,
        users!student_enrollments_student_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .order('student_id', { ascending: true });

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }

    // Get subscription details for paid enrollments
    const subscriptionIds = enrollments
      .filter(e => e.subscription_id)
      .map(e => e.subscription_id);

    let subscriptionDetails: Record<string, any> = {};
    if (subscriptionIds.length > 0) {
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          starts_at,
          expires_at,
          subscription_plans (
            name,
            type,
            price_pkr
          )
        `)
        .in('id', subscriptionIds);

      if (!subError && subscriptions) {
        subscriptionDetails = subscriptions.reduce((acc, sub) => {
          acc[sub.id] = sub;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Get demo access details
    const studentIds = enrollments.map(e => e.student_id);
    const { data: demoAccess, error: demoError } = await supabase
      .from('demo_access')
      .select(`
        user_id,
        access_type,
        used_at,
        expires_at
      `)
      .eq('course_id', courseId)
      .in('user_id', studentIds);

    if (demoError) {
      console.error('Error fetching demo access:', demoError);
    }

    // Group demo access by user
    const demoAccessByUser = (demoAccess || []).reduce((acc, demo) => {
      if (!acc[demo.user_id]) {
        acc[demo.user_id] = [];
      }
      acc[demo.user_id].push(demo);
      return acc;
    }, {} as Record<string, any[]>);

    // Format the response
    const formattedEnrollments = enrollments.map(enrollment => {
      const user = enrollment.users as any;
      const subscription = enrollment.subscription_id ? subscriptionDetails[enrollment.subscription_id as string] : null;
      const userDemoAccess = demoAccessByUser[enrollment.student_id] || [];

      return {
        id: `${enrollment.student_id}-${courseId}`,
        studentId: enrollment.student_id,
        studentName: user?.full_name || 'Unknown',
        studentEmail: user?.email || 'Unknown',
        studentAvatar: user?.avatar_url,
        enrollmentType: enrollment.enrollment_type,
        enrolledAt: null,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.subscription_plans?.[0]?.name || 'Unknown Plan',
          planType: subscription.subscription_plans?.[0]?.type || 'Unknown',
          price: subscription.subscription_plans?.[0]?.price_pkr || 0,
          startsAt: subscription.starts_at,
          expiresAt: subscription.expires_at
        } : null,
        demoAccess: userDemoAccess.map(demo => ({
          accessType: demo.access_type,
          usedAt: demo.used_at,
          expiresAt: demo.expires_at
        }))
      };
    });

    // Calculate statistics
    const stats = {
      total: formattedEnrollments.length,
      paid: formattedEnrollments.filter(e => e.enrollmentType === 'paid').length,
      demo: formattedEnrollments.filter(e => e.enrollmentType === 'demo').length,
      withSubscriptions: formattedEnrollments.filter(e => e.subscription).length,
      withDemoAccess: formattedEnrollments.filter(e => e.demoAccess.length > 0).length
    };

    return NextResponse.json({
      course,
      enrollments: formattedEnrollments,
      stats
    });

  } catch (error) {
    console.error('Error in enrollments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
