import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
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

    // Check if user already has demo access for this course and access type
    const { data: existingAccess } = await supabase
      .from('demo_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('access_type', accessType)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingAccess) {
      return NextResponse.json(
        { error: 'User already has demo access for this course and access type' },
        { status: 400 }
      );
    }

    // Check if user has used demo before (global check)
    const { data: userProfile } = await supabase
      .from('users')
      .select('demo_used')
      .eq('id', user.id)
      .single();

    if (userProfile?.demo_used) {
      return NextResponse.json(
        { error: 'User has already used their demo access' },
        { status: 400 }
      );
    }

    // Create demo access
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const { data: demoAccess, error: insertError } = await supabase
      .from('demo_access')
      .insert({
        user_id: user.id,
        course_id: courseId,
        access_type: accessType,
        resource_id: resourceId || null,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating demo access:', insertError);
      return NextResponse.json(
        { error: 'Failed to create demo access' },
        { status: 500 }
      );
    }

    // Mark user as having used demo
    const { error: updateError } = await supabase
      .from('users')
      .update({ demo_used: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user demo status:', updateError);
      // Don't fail the request, just log the error
    }

    // Create demo enrollment if it doesn't exist
    const { error: enrollmentError } = await supabase
      .from('student_enrollments')
      .upsert({
        student_id: user.id,
        course_id: courseId,
        enrollment_type: 'demo'
      });

    if (enrollmentError) {
      console.error('Error creating demo enrollment:', enrollmentError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      demoAccess,
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

