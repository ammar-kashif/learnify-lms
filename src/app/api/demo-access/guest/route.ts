import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/demo-access/guest
 * 
 * Records a guest demo lead (email) and returns success.
 * No authentication required — this is the whole point.
 * The actual demo state is stored client-side in localStorage.
 * This endpoint just captures the email for follow-up / lead tracking.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, courseId, accessType } = body;

    // Validate required fields
    if (!email || !courseId || !accessType) {
      return NextResponse.json(
        { error: 'Missing required fields: email, courseId, accessType' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate access type
    if (!['lecture_recording', 'live_class'].includes(accessType)) {
      return NextResponse.json(
        { error: 'Invalid accessType. Must be "lecture_recording" or "live_class"' },
        { status: 400 }
      );
    }

    // Verify the course exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if this email already has ANY demo lead (one demo per email, period)
    const { data: existingLead } = await supabaseAdmin
      .from('guest_demo_leads')
      .select('id, created_at, course_id, access_type')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingLead) {
      // This email has already used their one free demo
      return NextResponse.json({
        success: false,
        error: 'This email has already been used for a demo. Please sign up for full access.',
        alreadyUsed: true,
      }, { status: 409 });
    }

    // Record the guest demo lead
    const { error: insertError } = await supabaseAdmin
      .from('guest_demo_leads')
      .insert({
        email: email.toLowerCase().trim(),
        course_id: courseId,
        course_title: course.title,
        access_type: accessType,
      });

    if (insertError) {
      console.error('Error recording guest demo lead:', insertError);
      // Don't block the demo — just log the error
      // The demo will still work via localStorage
    }

    return NextResponse.json({
      success: true,
      message: 'Demo access granted',
    }, { status: 201 });
  } catch (error) {
    console.error('Error in guest demo API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
