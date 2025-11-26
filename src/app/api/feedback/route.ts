import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/feedback - Submit feedback message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, subject, message, messageType } = body;

    // Validate required fields
    if (!email || !name || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, name, subject, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get user ID if authenticated
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (!userError && user) {
        userId = user.id;
      }
    }

    // Insert feedback message
    const { data, error } = await supabaseAdmin
      .from('feedback_messages')
      .insert({
        user_id: userId,
        email,
        name,
        subject,
        message,
        message_type: messageType || 'general',
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback message:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/feedback - Get feedback messages (admin only)
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
    const messageType = searchParams.get('messageType');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('feedback_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (messageType) {
      query = query.eq('message_type', messageType);
    }

    const { data: feedbackMessages, error } = await query;

    if (error) {
      console.error('Error fetching feedback messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedbackMessages: feedbackMessages || []
    });

  } catch (error) {
    console.error('Error in feedback GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

