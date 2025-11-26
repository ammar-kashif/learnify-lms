import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Regular client for user authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only admins and superadmins can update payment verification status
    if (!['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only admins and superadmins can update payment verification status' },
        { status: 403 }
      );
    }

    // Parse request body
    const { status, notes } = await request.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/rejected) is required' },
        { status: 400 }
      );
    }

    const paymentId = params.id;
    console.log('🔍 Updating payment verification:', paymentId, 'with status:', status);

    // Get the payment verification details
    const { data: paymentVerification, error: fetchError } = await supabaseAdmin
      .from('payment_verifications')
      .select('id, student_id, course_id, status, subscription_plan_id, amount')
      .eq('id', paymentId)
      .single();

    if (fetchError || !paymentVerification) {
      return NextResponse.json(
        { error: 'Payment verification not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (paymentVerification.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment verification has already been processed' },
        { status: 400 }
      );
    }

    // Update payment verification status
    const updateData: any = {
      status,
      verified_at: new Date().toISOString(),
      verified_by: user.id
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payment_verifications')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment verification:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment verification' },
        { status: 500 }
      );
    }

    // If approved, create subscription and enroll the student
    if (status === 'approved') {
      console.log('🎓 Creating subscription and enrolling student:', paymentVerification.student_id, 'in course:', paymentVerification.course_id);
      
      try {
        // Get subscription plan details from payment verification
        const { data: paymentDetails } = await supabaseAdmin
          .from('payment_verifications')
          .select(`
            subscription_plan_id,
            subscription_plans!payment_verifications_subscription_plan_id_fkey (
              id,
              name,
              type,
              price_pkr,
              duration_months,
              duration_until_date
            )
          `)
          .eq('id', paymentId)
          .single();

        // subscription_plans relation can return an object (1:1) or array depending on query shape
        let plan: any = (paymentDetails as any).subscription_plans;
        if (Array.isArray(plan)) {
          plan = plan[0];
        }
        // Fallback: fetch by subscription_plan_id if relation is missing
        if (!plan && (paymentDetails as any).subscription_plan_id) {
          const { data: fetchedPlan } = await supabaseAdmin
            .from('subscription_plans')
            .select('id, name, type, price_pkr, duration_months, duration_until_date')
            .eq('id', (paymentDetails as any).subscription_plan_id)
            .single();
          plan = fetchedPlan;
        }
        // Fallback 2: infer plan by exact amount match if provided
        if (!plan && (paymentVerification as any).amount) {
          const { data: plansByAmount } = await supabaseAdmin
            .from('subscription_plans')
            .select('id, name, type, price_pkr, duration_months, duration_until_date')
            .eq('price_pkr', (paymentVerification as any).amount)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          plan = plansByAmount || plan;
        }
        if (!plan) {
          console.error('❌ No subscription plan found for payment verification');
          return NextResponse.json(
            { error: 'Subscription plan not found' },
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
          console.error('❌ Invalid subscription plan duration');
          return NextResponse.json(
            { error: 'Invalid subscription plan duration' },
            { status: 400 }
          );
        }

        // Create subscription
        const { data: subscription, error: subscriptionError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: paymentVerification.student_id,
            course_id: paymentVerification.course_id,
            subscription_plan_id: plan.id,
            expires_at: expiresAt.toISOString()
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

        // Create student enrollment (record enrollment date at approval time)
        const { error: enrollmentError } = await supabaseAdmin
          .from('student_enrollments')
          .upsert({
            student_id: paymentVerification.student_id,
            course_id: paymentVerification.course_id,
            subscription_id: subscription.id,
            enrollment_type: 'paid',
            enrollment_date: new Date().toISOString()
          });

        if (enrollmentError) {
          console.error('❌ Error enrolling student:', enrollmentError);
          return NextResponse.json(
            { error: 'Failed to enroll student' },
            { status: 500 }
          );
        }

        console.log('✅ Subscription created and student enrolled successfully');
      } catch (error) {
        console.error('❌ Error in subscription creation process:', error);
        return NextResponse.json(
          { error: 'Failed to create subscription and enroll student' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: `Payment verification ${status} successfully`,
      paymentVerification: updatedPayment
    });

  } catch (error) {
    console.error('Error in payment verification update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    console.log('✅ User authenticated for delete:', user.id);

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

    // Only superadmins can delete payment verification entries
    if (userProfile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmins can delete payment verification entries' },
        { status: 403 }
      );
    }

    const paymentId = params.id;
    console.log('🗑️ Deleting payment verification:', paymentId);

    // Delete the payment verification entry
    const { error: deleteError } = await supabaseAdmin
      .from('payment_verifications')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('Error deleting payment verification:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete payment verification' },
        { status: 500 }
      );
    }

    console.log('✅ Payment verification deleted successfully');
    return NextResponse.json({
      message: 'Payment verification deleted successfully'
    });

  } catch (error) {
    console.error('Error in payment verification delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
