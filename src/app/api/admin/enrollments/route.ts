import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/enrollments - Get all enrollments across all courses for admin/superadmin
export async function GET(request: NextRequest) {
  try {
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

    // Check if user has admin/superadmin permissions
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

    if (!['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Access denied - Admin/Superadmin permissions required' },
        { status: 403 }
      );
    }

    // Get all enrollments across all courses
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        course_id,
        enrollment_type,
        created_at,
        subscription_id,
        users!student_enrollments_student_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        courses!student_enrollments_course_id_fkey (
          id,
          title,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }

    // Get all courses for filtering
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
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
    const courseIds = enrollments.map(e => e.course_id);
    const { data: demoAccess, error: demoError } = await supabase
      .from('demo_access')
      .select(`
        user_id,
        course_id,
        access_type,
        used_at,
        expires_at
      `)
      .in('user_id', studentIds)
      .in('course_id', courseIds);

    if (demoError) {
      console.error('Error fetching demo access:', demoError);
    }

    // Group demo access by user and course
    const demoAccessByUserCourse = (demoAccess || []).reduce((acc, demo) => {
      const key = `${demo.user_id}-${demo.course_id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(demo);
      return acc;
    }, {} as Record<string, any[]>);

    // Format the response
    const formattedEnrollments = enrollments.map(enrollment => {
      const user = enrollment.users as any;
      const course = enrollment.courses as any;
      const subscription = enrollment.subscription_id ? subscriptionDetails[enrollment.subscription_id] : null;
      const userDemoAccess = demoAccessByUserCourse[`${enrollment.student_id}-${enrollment.course_id}`] || [];

      return {
        id: `${enrollment.student_id}-${enrollment.course_id}`,
        studentId: enrollment.student_id,
        studentName: user?.full_name || 'Unknown',
        studentEmail: user?.email || 'Unknown',
        studentAvatar: user?.avatar_url,
        courseId: enrollment.course_id,
        courseTitle: course?.title || 'Unknown Course',
        enrollmentType: enrollment.enrollment_type,
        enrolledAt: enrollment.created_at,
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

    // Calculate comprehensive statistics
    const now = new Date();
    const stats = {
      total: formattedEnrollments.length,
      paid: formattedEnrollments.filter(e => e.enrollmentType === 'paid').length,
      demo: formattedEnrollments.filter(e => e.enrollmentType === 'demo').length,
      withSubscriptions: formattedEnrollments.filter(e => e.subscription).length,
      withDemoAccess: formattedEnrollments.filter(e => e.demoAccess.length > 0).length,
      activeSubscriptions: formattedEnrollments.filter(e => 
        e.subscription && 
        e.subscription.status === 'active' && 
        new Date(e.subscription.expiresAt) > now
      ).length,
      expiredSubscriptions: formattedEnrollments.filter(e => 
        e.subscription && 
        (e.subscription.status !== 'active' || new Date(e.subscription.expiresAt) <= now)
      ).length,
      totalRevenue: formattedEnrollments
        .filter(e => e.subscription)
        .reduce((sum, e) => sum + (e.subscription?.price || 0), 0)
    };

    return NextResponse.json({
      enrollments: formattedEnrollments,
      courses: courses || [],
      stats
    });

  } catch (error) {
    console.error('Error in admin enrollments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
