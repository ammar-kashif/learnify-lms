import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/enrollments - Check if user is enrolled in a course
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!bearer) {
      return NextResponse.json(
        { 
          error: 'You are not signed in. Please sign in to continue.',
          action: { label: 'Sign In', url: '/auth/signin' }
        }, 
        { status: 401 }
      );
    }

    // Resolve user from JWT
    const { data: userResult, error: userErr } = await supabase.auth.getUser(bearer);
    if (userErr || !userResult?.user) {
      return NextResponse.json(
        { 
          error: 'You are not signed in. Please sign in to continue.',
          action: { label: 'Sign In', url: '/auth/signin' }
        }, 
        { status: 401 }
      );
    }

    const authedUserId = userResult.user.id;
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId parameter' },
        { status: 400 }
      );
    }

    // Check if user is enrolled in the course
    console.log('🔍 Checking enrollment for user:', authedUserId, 'course:', courseId);
    
    // Query the student_enrollments table with correct columns
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select('student_id, course_id, subscription_id, enrollment_type, enrollment_date')
      .eq('student_id', authedUserId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollmentError) {
      console.error('❌ Error checking enrollment:', enrollmentError);
      return NextResponse.json(
        { error: 'Failed to check enrollment status', details: enrollmentError.message },
        { status: 500 }
      );
    }

    console.log('✅ Enrollment check result:', { enrollment, found: !!enrollment });

    return NextResponse.json({ 
      enrolled: !!enrollment,
      enrollmentType: enrollment?.enrollment_type || null, // "paid" or "demo"
      isPaidEnrollment: enrollment?.enrollment_type === 'paid',
      isDemoEnrollment: enrollment?.enrollment_type === 'demo',
      subscriptionId: enrollment?.subscription_id || null,
      enrollmentDate: enrollment?.enrollment_date || null,
      // Include the actual enrollment data for debugging
      enrollmentData: enrollment
    });

  } catch (error) {
    console.error('Error checking enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to check enrollment status' },
      { status: 500 }
    );
  }
}

// Enroll the authenticated student into a courseId (ignores any client-provided studentId)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!bearer) {
      return NextResponse.json(
        { 
          error: 'You are not signed in. Please sign in to continue.',
          action: { label: 'Sign In', url: '/auth/signin' }
        }, 
        { status: 401 }
      );
    }

    // Resolve user from JWT
    const { data: userResult, error: userErr } = await supabase.auth.getUser(bearer);
    if (userErr || !userResult?.user) {
      return NextResponse.json(
        { 
          error: 'You are not signed in. Please sign in to continue.',
          action: { label: 'Sign In', url: '/auth/signin' }
        }, 
        { status: 401 }
      );
    }

    const authedUserId = userResult.user.id;

    const { courseId } = await request.json();
    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId' },
        { status: 400 }
      );
    }

    // Enforce role from DB only (no fallbacks)
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', authedUserId)
      .single();
    if (profileErr) {
      return NextResponse.json({ error: 'Failed to verify user role' }, { status: 403 });
    }
    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Only students can enroll' }, { status: 403 });
    }

    // Prevent duplicate enrollment
    const { data: existing, error: checkError } = await supabase
      .from('student_enrollments')
      .select('student_id, course_id')
      .eq('student_id', authedUserId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (checkError) throw checkError;
    if (existing) {
      return NextResponse.json({ message: 'Already enrolled' }, { status: 200 });
    }

    const { error: insertError } = await supabase
      .from('student_enrollments')
      .insert({ student_id: authedUserId, course_id: courseId, enrollment_date: new Date().toISOString() });
    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error enrolling student:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    );
  }
}