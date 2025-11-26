import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/content-flags - Flag content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      resourceType, 
      resourceId, 
      courseId, 
      flagReason, 
      description 
    } = body;

    // Validate required fields
    if (!resourceType || !resourceId || !flagReason) {
      return NextResponse.json(
        { error: 'Resource type, resource ID, and flag reason are required' },
        { status: 400 }
      );
    }

    // Validate resource type
    const validResourceTypes = [
      'lecture_recording',
      'course',
      'quiz',
      'assignment',
      'live_class',
      'chapter'
    ];

    if (!validResourceTypes.includes(resourceType)) {
      return NextResponse.json(
        { error: `Invalid resource type. Must be one of: ${validResourceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate flag reason
    const validFlagReasons = [
      'inappropriate',
      'spam',
      'copyright',
      'misinformation',
      'harassment',
      'other'
    ];

    if (!validFlagReasons.includes(flagReason)) {
      return NextResponse.json(
        { error: `Invalid flag reason. Must be one of: ${validFlagReasons.join(', ')}` },
        { status: 400 }
      );
    }

    // Get user ID and email if authenticated
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (!userError && user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    // Check if user has already flagged this content
    if (userId) {
      const { data: existingFlag } = await supabaseAdmin
        .from('content_flags')
        .select('id')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingFlag) {
        return NextResponse.json(
          { error: 'You have already flagged this content. Please wait for review.' },
          { status: 400 }
        );
      }
    }

    // Insert content flag
    const { data, error } = await supabaseAdmin
      .from('content_flags')
      .insert({
        user_id: userId,
        flagged_by_email: userEmail,
        resource_type: resourceType,
        resource_id: resourceId,
        course_id: courseId || null,
        flag_reason: flagReason,
        description: description || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating content flag:', error);
      return NextResponse.json(
        { error: 'Failed to flag content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Content flagged successfully. Thank you for your report.',
      flag: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in content flags API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/content-flags - Get content flags (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const resourceType = searchParams.get('resourceType');
    const flagReason = searchParams.get('flagReason');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('content_flags')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (flagReason) {
      query = query.eq('flag_reason', flagReason);
    }

    const { data: contentFlags, error } = await query;

    if (error) {
      console.error('Error fetching content flags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch content flags' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contentFlags: contentFlags || []
    });

  } catch (error) {
    console.error('Error in content flags GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

