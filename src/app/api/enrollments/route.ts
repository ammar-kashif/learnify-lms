import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      .insert({ student_id: authedUserId, course_id: courseId });
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