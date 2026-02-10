import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/demo/list?courseId=optional&status=active|expired|all
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status') || 'all'; // active, expired, all

    // Build query
    let query = supabase
      .from('demo_access')
      .select(`
        id,
        user_id,
        course_id,
        access_type,
        resource_id,
        expires_at,
        used_at,
        users:user_id (
          id,
          full_name,
          email
        ),
        courses:course_id (
          id,
          title
        )
      `)
      .order('used_at', { ascending: false });

    // Filter by course if provided
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: demoAccess, error } = await query;

    if (error) {
      console.error('Error fetching demo access:', error);
      return NextResponse.json({ error: 'Failed to fetch demo access' }, { status: 500 });
    }

    // Filter by status
    const now = new Date();
    let filteredData = demoAccess || [];

    if (status === 'active') {
      filteredData = filteredData.filter(demo => new Date(demo.expires_at) > now);
    } else if (status === 'expired') {
      filteredData = filteredData.filter(demo => new Date(demo.expires_at) <= now);
    }

    // Calculate stats
    const activeCount = filteredData.filter(demo => new Date(demo.expires_at) > now).length;
    const expiredCount = filteredData.filter(demo => new Date(demo.expires_at) <= now).length;
    const recordingCount = filteredData.filter(demo => demo.access_type === 'lecture_recording').length;
    const liveClassCount = filteredData.filter(demo => demo.access_type === 'live_class').length;

    return NextResponse.json({
      demos: filteredData,
      stats: {
        total: filteredData.length,
        active: activeCount,
        expired: expiredCount,
        byType: {
          lecture_recording: recordingCount,
          live_class: liveClassCount
        }
      }
    });
  } catch (error) {
    console.error('Error in demo list API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
