import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Explicit admin client (same service role) for writes that must bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/demo-access - Check if user has demo access for a course
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const accessType = searchParams.get('accessType'); // 'lecture_recording' or 'live_class'

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId parameter' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('demo_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .gt('expires_at', new Date().toISOString());

    if (accessType) {
      query = query.eq('access_type', accessType);
    }

    const { data: demoAccess, error } = await query;

    if (error) {
      console.error('Error fetching demo access:', error);
      return NextResponse.json(
        { error: 'Failed to fetch demo access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      hasAccess: demoAccess && demoAccess.length > 0,
      demoAccess: demoAccess || []
    });
  } catch (error) {
    console.error('Error in demo access API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/demo-access - Grant demo access to user
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId, accessType, resourceId } = body;

    if (!courseId || !accessType) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, accessType' },
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

    // Check if a demo access row exists (unique on user_id, course_id, access_type)
    const { data: existingAccess } = await supabase
      .from('demo_access')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('access_type', accessType)
      .single();

    const nowIso = new Date().toISOString();
    const isActive = existingAccess && existingAccess.expires_at && existingAccess.expires_at > nowIso;

    if (existingAccess && isActive) {
      // Ensure demo enrollment exists even if access already active
      const { data: existingEnroll } = await supabaseAdmin
        .from('student_enrollments')
        .select('student_id, course_id, enrollment_type')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!existingEnroll) {
        const { error: enrollErr } = await supabaseAdmin
          .from('student_enrollments')
          .insert({ student_id: user.id, course_id: courseId, enrollment_type: 'demo' });
        if (enrollErr) {
          console.error('Error ensuring demo enrollment (active path):', enrollErr);
        }
      }

      // Already active demo – report success without creating a duplicate
      return NextResponse.json(
        { message: 'Demo access already active', demoAccess: existingAccess },
        { status: 200 }
      );
    }

    // Note: Demo access is now per-course, not global
    // Users can get demo access for multiple courses

    // Create demo access
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    let demoAccess: any = null;
    let insertError: any = null;

    if (existingAccess) {
      // Row exists but is expired – update expiry instead of inserting to satisfy unique constraint
      const { data, error } = await supabase
        .from('demo_access')
        .update({
          expires_at: expiresAt.toISOString(),
          resource_id: resourceId || null,
          used_at: nowIso,
        })
        .eq('id', existingAccess.id)
        .select()
        .single();
      demoAccess = data;
      insertError = error;
    } else {
      const { data, error } = await supabase
        .from('demo_access')
        .insert({
          user_id: user.id,
          course_id: courseId,
          access_type: accessType,
          resource_id: resourceId || null,
          expires_at: expiresAt.toISOString(),
          used_at: nowIso,
        })
        .select()
        .single();
      demoAccess = data;
      insertError = error;
    }

    if (insertError) {
      console.error('Error creating demo access:', insertError);
      return NextResponse.json(
        { error: 'Failed to create demo access' },
        { status: 500 }
      );
    }

    // Note: No longer marking user as having used demo globally
    // Demo access is now tracked per-course in the demo_access table

    // Ensure demo enrollment exists; create if missing
    const { data: existingEnroll } = await supabaseAdmin
      .from('student_enrollments')
      .select('student_id, course_id, enrollment_type')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    let enrollRow = existingEnroll;
    let enrollmentError = null as any;
    if (!existingEnroll) {
      const { data, error } = await supabaseAdmin
        .from('student_enrollments')
        .insert({
          student_id: user.id,
          course_id: courseId,
          enrollment_type: 'demo'
        })
        .select('student_id, course_id, enrollment_type')
        .single();
      enrollRow = data as any;
      enrollmentError = error;
    }

    if (enrollmentError) {
      console.error('Error creating demo enrollment:', enrollmentError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      demoAccess,
      enrollment: enrollRow,
      message: 'Demo access granted successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in demo access POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/demo-access - Revoke demo access (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin or superadmin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const demoAccessId = searchParams.get('id');

    if (!demoAccessId) {
      return NextResponse.json(
        { error: 'Missing demo access ID' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('demo_access')
      .delete()
      .eq('id', demoAccessId);

    if (deleteError) {
      console.error('Error deleting demo access:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete demo access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Demo access revoked successfully' 
    });
  } catch (error) {
    console.error('Error in demo access DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

