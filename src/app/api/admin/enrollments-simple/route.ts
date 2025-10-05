import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/enrollments-simple - Get all enrollments for admin dashboard
export async function GET(_request: NextRequest) {
  try {
    // Get all enrollments with user and course details
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        course_id,
        enrollment_type,
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
      .order('student_id', { ascending: false });

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
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
        subscriptionDetails = subscriptions.reduce((acc: Record<string, any>, sub: any) => {
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
        course_id,
        access_type,
        used_at,
        expires_at
      `)
      .in('user_id', studentIds)
      .gt('expires_at', new Date().toISOString());

    if (demoError) {
      console.error('Error fetching demo access:', demoError);
      // Don't fail the whole request, just log and continue without demo data
    }

    // Group demo access by user-course combination
    const demoAccessByUserCourse: Record<string, any[]> = {};
    if (demoAccess) {
      demoAccess.forEach(da => {
        const key = `${da.user_id}-${da.course_id}`;
        if (!demoAccessByUserCourse[key]) {
          demoAccessByUserCourse[key] = [];
        }
        demoAccessByUserCourse[key].push(da);
      });
    }

    // Format the response
    const formattedEnrollments = enrollments.map(enrollment => {
      const user = enrollment.users as any;
      const course = enrollment.courses as any;
      const subscription = enrollment.subscription_id ? subscriptionDetails[enrollment.subscription_id as string] : null;
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
        subscription: subscription ? {
          id: subscription.id,
          planName: subscription.subscription_plans?.[0]?.name,
          planType: subscription.subscription_plans?.[0]?.type,
          price: subscription.subscription_plans?.[0]?.price_pkr,
          status: subscription.status,
          startsAt: subscription.starts_at,
          expiresAt: subscription.expires_at,
        } : null,
        demoAccess: userDemoAccess.map(da => ({
          id: da.id,
          accessType: da.access_type,
          usedAt: da.used_at,
          expiresAt: da.expires_at,
        })),
      };
    });

    // Calculate statistics
    const stats = {
      total: formattedEnrollments.length,
      paid: formattedEnrollments.filter(e => e.enrollmentType === 'paid').length,
      demo: formattedEnrollments.filter(e => e.enrollmentType === 'demo').length,
      withSubscription: formattedEnrollments.filter(e => e.subscription).length,
      withDemoAccess: formattedEnrollments.filter(e => e.demoAccess.length > 0).length,
    };

    return NextResponse.json({
      enrollments: formattedEnrollments,
      stats
    });

  } catch (error) {
    console.error('Error in GET /api/admin/enrollments-simple:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
