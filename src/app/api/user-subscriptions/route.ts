import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/user-subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!bearer) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Resolve user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearer);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const includeExpired = searchParams.get('includeExpired') === 'true';

    let query = supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          id,
          name,
          type,
          price_pkr,
          features
        ),
        courses (
          id,
          title,
          description
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (!includeExpired) {
      query = query.eq('status', 'active');
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching user subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error in user subscriptions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/user-subscriptions - Create new subscription
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!bearer) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Resolve user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearer);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId, subscriptionPlanId } = body;

    if (!courseId || !subscriptionPlanId) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, subscriptionPlanId' },
        { status: 400 }
      );
    }

    // Get subscription plan details
    const { data: plan, error: planError } = await supabase
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

    // Check if course exists
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

    // Check if user already has an active subscription for this course
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription for this course' },
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

    // Create payment verification request instead of immediate subscription
    const { data: paymentVerification, error: paymentError } = await supabase
      .from('payment_verifications')
      .insert({
        student_id: user.id,
        course_id: courseId,
        subscription_plan_id: subscriptionPlanId,
        amount: plan.price_pkr,
        status: 'pending'
      })
      .select(`
        *,
        courses!payment_verifications_course_id_fkey (
          id,
          title,
          description
        ),
        subscription_plans!payment_verifications_subscription_plan_id_fkey (
          id,
          name,
          type,
          price_pkr,
          features
        )
      `)
      .single();

    if (paymentError) {
      console.error('Error creating payment verification:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment verification request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Payment verification request created successfully. Please wait for admin approval.',
      paymentVerification,
      requiresApproval: true
    }, { status: 201 });
  } catch (error) {
    console.error('Error in user subscriptions POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

