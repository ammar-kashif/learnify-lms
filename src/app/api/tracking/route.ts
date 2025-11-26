import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/tracking - Log user action
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Authentication is optional - we can track actions for guests too (with null user_id)
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (!userError && user) {
        userId = user.id;
      }
    }

    const body = await request.json();
    const { action_type, resource_type, resource_id, course_id, metadata } = body;

    // Validate required fields
    if (!action_type || !resource_type) {
      return NextResponse.json(
        { error: 'action_type and resource_type are required' },
        { status: 400 }
      );
    }

    // Validate action types
    const validActionTypes = [
      'video_play',
      'video_complete',
      'quiz_start',
      'quiz_complete',
      'assignment_submit',
      'page_view',
      'course_view',
      'enrollment_request',
      'payment_submit',
      'button_click',
      'form_submit',
      'form_start',
      'search_query',
      'download',
      'share',
      'bookmark',
      'login',
      'logout',
      'settings_change',
      'error_occurred',
      'modal_open',
      'modal_close',
      'tab_switch',
      'live_class_join',
      'live_class_leave',
      'feedback_submit',
      'bug_report_submit',
      'content_flag'
    ];

    if (!validActionTypes.includes(action_type)) {
      return NextResponse.json(
        { error: `Invalid action_type. Must be one of: ${validActionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate resource types
    const validResourceTypes = [
      'lecture_recording',
      'quiz',
      'assignment',
      'course',
      'page',
      'live_class',
      'user_profile',
      'settings',
      'dashboard',
      'admin_panel',
      'button',
      'form',
      'modal',
      'tab'
    ];

    if (!validResourceTypes.includes(resource_type)) {
      return NextResponse.json(
        { error: `Invalid resource_type. Must be one of: ${validResourceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert action into database
    const { data, error } = await supabaseAdmin
      .from('user_actions')
      .insert({
        user_id: userId,
        action_type,
        resource_type,
        resource_id: resource_id || null,
        course_id: course_id || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking user action:', error);
      return NextResponse.json(
        { error: 'Failed to track action' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: data,
    });

  } catch (error) {
    console.error('Error in tracking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

