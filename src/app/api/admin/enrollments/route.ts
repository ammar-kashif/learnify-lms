import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Regular client for user authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/admin/enrollments - Get all enrollments with detailed info
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Get user role from database using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only superadmins can access enrollment management
    if (userProfile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmins can access enrollment management' },
        { status: 403 }
      );
    }

    // Get all enrollments with related data
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from('student_enrollments')
      .select(`
        *,
        users!student_enrollments_student_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        ),
        courses!student_enrollments_course_id_fkey (
          id,
          title,
          description
        )
      `)
      .order('enrollment_date', { ascending: false });

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }

    // Now fetch subscriptions separately and match them
    const enrollmentsWithSubscriptions = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        if (enrollment.subscription_id) {
          const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .select(`
              id,
              subscription_plan_id,
              expires_at,
              status,
              subscription_plans!user_subscriptions_subscription_plan_id_fkey (
                id,
                name,
                type,
                price_pkr,
                duration_months,
                duration_until_date
              )
            `)
            .eq('id', enrollment.subscription_id)
            .single();

          if (subscriptionError) {
            console.error('Error fetching subscription for enrollment:', enrollment.subscription_id, subscriptionError);
            return { ...enrollment, user_subscriptions: null };
          }

          return { ...enrollment, user_subscriptions: subscription };
        }
        return { ...enrollment, user_subscriptions: null };
      })
    );

    return NextResponse.json({
      enrollments: enrollmentsWithSubscriptions || []
    });

  } catch (error) {
    console.error('Error in admin enrollments GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/enrollments - Update enrollment (promote demo to paid, change plan)
export async function PATCH(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Get user role from database using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only superadmins can update enrollments
    if (userProfile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmins can update enrollments' },
        { status: 403 }
      );
    }

    // Parse request body
    const { studentId, courseId, action, subscriptionPlanId } = await request.json();

    if (!studentId || !courseId || !action) {
      return NextResponse.json(
        { error: 'Student ID, Course ID, and action are required' },
        { status: 400 }
      );
    }

    // Get current enrollment details
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('student_enrollments')
      .select(`
        *,
        users!student_enrollments_student_id_fkey (
          id,
          email,
          full_name
        ),
        courses!student_enrollments_course_id_fkey (
          id,
          title
        )
      `)
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    console.log('🔍 Updating enrollment:', studentId, courseId, 'action:', action);

    if (action === 'promote_to_paid') {
      // Promote demo enrollment to paid
      if (enrollment.enrollment_type !== 'demo') {
        return NextResponse.json(
          { error: 'Can only promote demo enrollments to paid' },
          { status: 400 }
        );
      }

      if (!subscriptionPlanId) {
        return NextResponse.json(
          { error: 'Subscription plan ID is required for promotion' },
          { status: 400 }
        );
      }

      // Get subscription plan details
      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('id', subscriptionPlanId)
        .eq('is_active', true)
        .single();

      if (planError || !plan) {
        return NextResponse.json(
          { error: 'Invalid subscription plan' },
          { status: 400 }
        );
      }

      // Calculate expiration date
      let expiresAt: Date;
      if (plan.duration_months) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + plan.duration_months);
      } else if (plan.duration_until_date) {
        expiresAt = new Date(plan.duration_until_date);
      } else {
        return NextResponse.json(
          { error: 'Invalid subscription plan duration' },
          { status: 400 }
        );
      }

      // Create subscription
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: enrollment.student_id,
          course_id: enrollment.course_id,
          subscription_plan_id: plan.id,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('❌ Error creating subscription:', subscriptionError);
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }

      // Update enrollment to paid
      const { data: updatedEnrollment, error: updateError } = await supabaseAdmin
        .from('student_enrollments')
        .update({
          enrollment_type: 'paid',
          subscription_id: subscription.id,
          enrollment_date: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating enrollment:', updateError);
        return NextResponse.json(
          { error: 'Failed to update enrollment' },
          { status: 500 }
        );
      }

      console.log('✅ Enrollment promoted to paid successfully');
      return NextResponse.json({
        message: 'Enrollment promoted to paid successfully',
        enrollment: updatedEnrollment
      });

    } else if (action === 'change_plan') {
      // Change subscription plan for paid enrollment
      if (enrollment.enrollment_type !== 'paid') {
        return NextResponse.json(
          { error: 'Can only change plans for paid enrollments' },
          { status: 400 }
        );
      }

      if (!subscriptionPlanId) {
        return NextResponse.json(
          { error: 'Subscription plan ID is required' },
          { status: 400 }
        );
      }

      // Get new subscription plan details
      const { data: newPlan, error: newPlanError } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('id', subscriptionPlanId)
        .eq('is_active', true)
        .single();

      if (newPlanError || !newPlan) {
        return NextResponse.json(
          { error: 'Invalid subscription plan' },
          { status: 400 }
        );
      }

      // Calculate new expiration date
      let newExpiresAt: Date;
      if (newPlan.duration_months) {
        newExpiresAt = new Date();
        newExpiresAt.setMonth(newExpiresAt.getMonth() + newPlan.duration_months);
      } else if (newPlan.duration_until_date) {
        newExpiresAt = new Date(newPlan.duration_until_date);
      } else {
        return NextResponse.json(
          { error: 'Invalid subscription plan duration' },
          { status: 400 }
        );
      }

      // Update existing subscription
      const { data: updatedSubscription, error: subscriptionUpdateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          subscription_plan_id: newPlan.id,
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', enrollment.subscription_id)
        .select()
        .single();

      if (subscriptionUpdateError) {
        console.error('❌ Error updating subscription:', subscriptionUpdateError);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      console.log('✅ Subscription plan changed successfully');
      return NextResponse.json({
        message: 'Subscription plan changed successfully',
        subscription: updatedSubscription
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: promote_to_paid, change_plan' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in admin enrollments PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/enrollments - Delete enrollment
export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Get user role from database using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only superadmins can delete enrollments
    if (userProfile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmins can delete enrollments' },
        { status: 403 }
      );
    }

    // Parse request body
    const { studentId, courseId } = await request.json();

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'Student ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Get enrollment details to check for subscription
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('student_enrollments')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    console.log('🗑️ Deleting enrollment:', studentId, courseId);

    // If it's a paid enrollment, also delete the subscription
    if (enrollment.enrollment_type === 'paid' && enrollment.subscription_id) {
      const { error: subscriptionDeleteError } = await supabaseAdmin
        .from('user_subscriptions')
        .delete()
        .eq('id', enrollment.subscription_id);

      if (subscriptionDeleteError) {
        console.error('❌ Error deleting subscription:', subscriptionDeleteError);
        return NextResponse.json(
          { error: 'Failed to delete subscription' },
          { status: 500 }
        );
      }

      console.log('✅ Subscription deleted successfully');
    }

    // Delete the enrollment
    const { error: enrollmentDeleteError } = await supabaseAdmin
      .from('student_enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    if (enrollmentDeleteError) {
      console.error('❌ Error deleting enrollment:', enrollmentDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete enrollment' },
        { status: 500 }
      );
    }

    console.log('✅ Enrollment deleted successfully');
    return NextResponse.json({
      message: 'Enrollment deleted successfully'
    });

  } catch (error) {
    console.error('Error in admin enrollments DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}