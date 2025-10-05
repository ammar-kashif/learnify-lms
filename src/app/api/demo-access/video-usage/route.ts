import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/demo-access/video-usage - Get watched videos for demo access
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
    const accessType = searchParams.get('accessType') || 'lecture_recording';

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId parameter' },
        { status: 400 }
      );
    }

    // Get all watched videos for this user/course/accessType
    const { data: videoUsage, error: usageError } = await supabase
      .from('demo_access')
      .select('resource_id, used_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('access_type', accessType)
      .not('resource_id', 'is', null) // Only get records with resource_id (video usage)
      .gt('expires_at', new Date().toISOString()) // Only active demo access
      .order('used_at', { ascending: true });

    if (usageError) {
      console.error('Error fetching video usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch video usage' },
        { status: 500 }
      );
    }

    const watchedVideos = videoUsage?.map(usage => usage.resource_id) || [];

    console.log('📊 Retrieved video usage:', {
      userId: user.id,
      courseId,
      accessType,
      watchedVideosCount: watchedVideos.length,
      watchedVideos
    });

    return NextResponse.json({
      success: true,
      watchedVideos,
      count: watchedVideos.length,
      hasUsedDemo: watchedVideos.length > 0
    });

  } catch (error) {
    console.error('Error in video-usage API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
