import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/bug-reports - Submit bug report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      title, 
      description, 
      stepsToReproduce, 
      expectedBehavior, 
      actualBehavior,
      browserInfo,
      deviceInfo,
      url,
      screenshotUrl,
      severity
    } = body;

    // Validate required fields
    if (!email || !title || !description) {
      return NextResponse.json(
        { error: 'Email, title, and description are required' },
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

    // Collect browser and device info if not provided
    const browserInfoFinal = browserInfo || (typeof window !== 'undefined' ? 
      `${navigator.userAgent} - ${navigator.language}` : 'Server-side');
    const deviceInfoFinal = deviceInfo || (typeof window !== 'undefined' ? 
      `${window.innerWidth}x${window.innerHeight}` : 'Unknown');

    // Insert bug report
    const { data, error } = await supabaseAdmin
      .from('bug_reports')
      .insert({
        user_id: userId,
        email,
        title,
        description,
        steps_to_reproduce: stepsToReproduce || null,
        expected_behavior: expectedBehavior || null,
        actual_behavior: actualBehavior || null,
        browser_info: browserInfoFinal,
        device_info: deviceInfoFinal,
        url: url || null,
        screenshot_url: screenshotUrl || null,
        severity: severity || 'medium',
        status: 'open',
        priority: 3
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bug report:', error);
      return NextResponse.json(
        { error: 'Failed to submit bug report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report submitted successfully',
      bugReport: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in bug reports API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/bug-reports - Get bug reports (admin only)
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
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: bugReports, error } = await query;

    if (error) {
      console.error('Error fetching bug reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bug reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bugReports: bugReports || []
    });

  } catch (error) {
    console.error('Error in bug reports GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

