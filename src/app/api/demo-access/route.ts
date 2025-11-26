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

    // RUTHLESS CHECK: Query demo_access table with all necessary fields and strict validation
    console.log('🔍 Checking demo access for user:', user.id, 'course:', courseId, 'accessType:', accessType);
    const startTime = Date.now();
    const nowISO = new Date().toISOString();
    const currentDate = new Date();
    console.log('⏰ Current time:', nowISO);
    
    // Query ALL records (including expired) so we can clean up expired ones
    let query = supabase
      .from('demo_access')
      .select('id, access_type, expires_at, used_at, resource_id, user_id, course_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (accessType) {
      query = query.eq('access_type', accessType);
    }

    const { data: demoAccess, error } = await query;
    const queryTime = Date.now() - startTime;
    
    console.log('⚡ Demo access query completed in:', queryTime, 'ms');
    console.log('📊 Query result:', { 
      found: demoAccess?.length || 0, 
      records: demoAccess,
      error: error?.message 
    });
    
    // Separate valid and expired records
    const validAccess: typeof demoAccess = [];
    const expiredAccess: typeof demoAccess = [];
    
    if (demoAccess) {
      for (const access of demoAccess) {
        const expiresAt = new Date(access.expires_at);
        if (expiresAt > currentDate) {
          validAccess.push(access);
        } else {
          expiredAccess.push(access);
          console.log('🚫 Found expired access:', access.id, 'expires_at:', access.expires_at);
        }
      }
    }
    
    console.log('✅ Valid demo access after filtering:', validAccess.length, 'records');
    
    // Cleanup: Delete expired demo enrollments
    if (expiredAccess.length > 0) {
      console.log('🧹 Cleaning up expired demo access records:', expiredAccess.length);
      
      for (const expired of expiredAccess) {
        try {
          // Delete the demo enrollment from student_enrollments
          const { error: enrollmentError } = await supabaseAdmin
            .from('student_enrollments')
            .delete()
            .eq('student_id', expired.user_id)
            .eq('course_id', expired.course_id)
            .eq('enrollment_type', 'demo');
          
          if (enrollmentError) {
            console.error('❌ Error deleting expired demo enrollment:', enrollmentError);
          } else {
            console.log('✅ Deleted expired demo enrollment for user:', expired.user_id, 'course:', expired.course_id);
          }
          
          // Also delete the expired demo_access record itself
          const { error: demoAccessError } = await supabaseAdmin
            .from('demo_access')
            .delete()
            .eq('id', expired.id);
          
          if (demoAccessError) {
            console.error('❌ Error deleting expired demo_access record:', demoAccessError);
          } else {
            console.log('✅ Deleted expired demo_access record:', expired.id);
          }
        } catch (cleanupError) {
          console.error('❌ Error during cleanup:', cleanupError);
        }
      }
    }

    if (error) {
      console.error('Error fetching demo access:', error);
      return NextResponse.json(
        { error: 'Failed to fetch demo access' },
        { status: 500 }
      );
    }

    // Return only valid (non-expired) access
    const hasValidAccess = validAccess.length > 0;
    console.log('🎯 Final result - hasAccess:', hasValidAccess);
    
    // Don't cache - ensure fresh data from database every time
    const response = NextResponse.json({ 
      hasAccess: hasValidAccess,
      demoAccess: validAccess
    });

    // No caching to ensure we always check the actual database state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    
    return response;
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

    // Create or update demo access using upsert to avoid duplicate key errors
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const { data: demoAccess, error: insertError } = await supabase
      .from('demo_access')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        access_type: accessType,
        resource_id: resourceId || null,
        expires_at: expiresAt.toISOString(),
        used_at: nowIso,
      }, {
        onConflict: 'user_id,course_id,access_type'
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

