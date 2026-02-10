import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/demo/grant
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or superadmin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, courseId, accessType } = body;

    if (!userId || !courseId || !accessType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, courseId, accessType' },
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

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Create or update demo access (admin grants bypass the one-demo restriction)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
    const nowIso = new Date().toISOString();

    const { data: demoAccess, error: insertError } = await supabase
      .from('demo_access')
      .upsert({
        user_id: userId,
        course_id: courseId,
        access_type: accessType,
        expires_at: expiresAt.toISOString(),
        used_at: nowIso,
      }, {
        onConflict: 'user_id,course_id,access_type'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating demo access:', insertError);
      return NextResponse.json({ error: 'Failed to create demo access' }, { status: 500 });
    }

    // Ensure demo enrollment exists
    const { data: existingEnroll } = await supabase
      .from('student_enrollments')
      .select('student_id, course_id, enrollment_type')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!existingEnroll) {
      const { error: enrollError } = await supabase
        .from('student_enrollments')
        .insert({
          student_id: userId,
          course_id: courseId,
          enrollment_type: 'demo'
        });

      if (enrollError) {
        console.error('Error creating demo enrollment:', enrollError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo access granted successfully',
      demoAccess,
      user: {
        id: targetUser.id,
        name: targetUser.full_name,
        email: targetUser.email
      },
      course: {
        id: course.id,
        title: course.title
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in demo grant API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
