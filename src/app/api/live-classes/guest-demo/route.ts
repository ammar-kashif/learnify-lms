import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/live-classes/guest-demo
 * 
 * Public endpoint — no auth required.
 * Returns demo-flagged live classes for a given course.
 * Used by guest users who activated a demo via email (localStorage).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json({ error: 'Missing course_id parameter' }, { status: 400 });
    }

    // Only return demo-flagged live classes for this course
    const { data: liveClasses, error } = await supabaseAdmin
      .from('live_classes')
      .select(`
        id, title, description, scheduled_date, duration_minutes,
        meeting_link, status, course_id, is_demo,
        courses!inner(title),
        users!live_classes_teacher_id_fkey(full_name)
      `)
      .eq('course_id', courseId)
      .eq('is_demo', true)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching guest demo live classes:', error);
      return NextResponse.json({ error: 'Failed to fetch live classes' }, { status: 500 });
    }

    // Return with no-cache headers
    const response = NextResponse.json({ liveClasses: liveClasses || [] });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return response;
  } catch (error) {
    console.error('Error in guest demo live classes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
