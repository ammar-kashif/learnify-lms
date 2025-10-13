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

export async function POST(request: NextRequest) {
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
    console.log('🔍 Looking for user profile with ID:', user.id);
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 Profile query result:', { userProfile, profileError });

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', { profileError, userProfile, userId: user.id });
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only students can create payment verification requests
    if (userProfile.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can create payment verification requests' },
        { status: 403 }
      );
    }

    // Parse request body
    const { courseId, amount } = await request.json();

    if (!courseId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Course ID and valid amount are required' },
        { status: 400 }
      );
    }

    // Validate course ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      console.error('❌ Invalid course ID format:', courseId);
      return NextResponse.json(
        { error: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    // Verify course exists using admin client
    console.log('🔍 Looking for course with ID:', courseId, 'Type:', typeof courseId);
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, description')
      .eq('id', courseId)
      .single();

    console.log('🔍 Course query result:', { course, courseError });

    if (courseError || !course) {
      console.error('❌ Course not found:', { courseError, course, courseId });
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if student is already enrolled in this course
    const { data: existingEnrollment } = await supabaseAdmin
      .from('student_enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'You are already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check if there's already a pending payment verification for this course
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_verifications')
      .select('id, status')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existingPayment) {
      if (existingPayment.status === 'pending') {
        return NextResponse.json(
          { error: 'Payment verification request already pending for this course' },
          { status: 400 }
        );
      } else if (existingPayment.status === 'approved') {
        return NextResponse.json(
          { error: 'Payment already verified for this course' },
          { status: 400 }
        );
      }
    }

    // Create payment verification request
    const { data: paymentVerification, error: insertError } = await supabaseAdmin
      .from('payment_verifications')
      .insert({
        student_id: user.id,
        course_id: courseId,
        amount: amount,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment verification:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment verification request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Payment verification request created successfully',
      paymentVerification: {
        id: paymentVerification.id,
        course: course,
        amount: amount,
        status: 'pending',
        created_at: paymentVerification.created_at
      }
    });

  } catch (error) {
    console.error('Error in payment verification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // First, get payment verifications with subscription plan data
    let paymentQuery = supabaseAdmin
      .from('payment_verifications')
      .select(`
        *,
        subscription_plans!payment_verifications_subscription_plan_id_fkey (
          id,
          name,
          type,
          price_pkr,
          features
        )
      `);

    if (userProfile.role === 'student') {
      // Students can only see their own payment verifications
      paymentQuery = paymentQuery.eq('student_id', user.id);
    } else if (userProfile.role === 'superadmin') {
      // Superadmins can see all payment verifications
      if (status) {
        paymentQuery = paymentQuery.eq('status', status);
      }
    } else {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { data: paymentVerifications, error: fetchError } = await paymentQuery
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching payment verifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch payment verifications' },
        { status: 500 }
      );
    }

    // Now enrich the data with course and user information
    if (paymentVerifications && paymentVerifications.length > 0) {
      // Get unique course IDs and student IDs
      const courseIds = Array.from(new Set(paymentVerifications.map(p => p.course_id)));
      const studentIds = Array.from(new Set(paymentVerifications.map(p => p.student_id)));

      // Fetch courses
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id, title, description')
        .in('id', courseIds);

      // Fetch users
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name')
        .in('id', studentIds);

      // Create lookup maps
      const courseMap = new Map(courses?.map(c => [c.id, c]) || []);
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Enrich payment verifications with course and user data
      const enrichedPayments = paymentVerifications.map(payment => ({
        ...payment,
        courses: courseMap.get(payment.course_id) || null,
        users: userMap.get(payment.student_id) || null
      }));

      return NextResponse.json({
        paymentVerifications: enrichedPayments
      });
    }

    return NextResponse.json({
      paymentVerifications: paymentVerifications || []
    });

  } catch (error) {
    console.error('Error in payment verification GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
