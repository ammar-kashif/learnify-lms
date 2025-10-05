import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/demo-access/track-video - Track demo video usage
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

    const { courseId, recordingId, accessType } = await request.json();

    if (!courseId || !recordingId || !accessType) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, recordingId, accessType' },
        { status: 400 }
      );
    }

    // Check if user has active demo access for this course
    const { data: demoAccess, error: demoError } = await supabase
      .from('demo_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('access_type', accessType)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (demoError) {
      console.error('Error checking demo access:', demoError);
      return NextResponse.json(
        { error: 'Failed to verify demo access' },
        { status: 500 }
      );
    }

    if (!demoAccess) {
      return NextResponse.json(
        { error: 'No active demo access found' },
        { status: 403 }
      );
    }

    // Check if this video has already been tracked
    const { data: existingUsage, error: usageError } = await supabase
      .from('demo_access')
      .select('resource_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('access_type', accessType)
      .eq('resource_id', recordingId)
      .maybeSingle();

    if (usageError) {
      console.error('Error checking existing usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to check existing usage' },
        { status: 500 }
      );
    }

    if (existingUsage) {
      // Video already tracked, return success
      return NextResponse.json({ 
        success: true, 
        message: 'Video usage already tracked',
        alreadyTracked: true 
      });
    }

    // Create a new demo access record for this specific video
    const { data: newUsage, error: insertError } = await supabase
      .from('demo_access')
      .insert({
        user_id: user.id,
        course_id: courseId,
        access_type: accessType,
        resource_id: recordingId,
        used_at: new Date().toISOString(),
        expires_at: demoAccess.expires_at // Same expiration as the original demo access
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error tracking video usage:', insertError);
      return NextResponse.json(
        { error: 'Failed to track video usage' },
        { status: 500 }
      );
    }

    console.log('✅ Tracked demo video usage:', {
      userId: user.id,
      courseId,
      recordingId,
      accessType
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Video usage tracked successfully',
      usage: newUsage
    });

  } catch (error) {
    console.error('Error in track-video API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
