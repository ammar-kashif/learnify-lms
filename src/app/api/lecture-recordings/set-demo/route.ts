import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/lecture-recordings/set-demo
// Body: { courseId: string, recordingId: string }
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure superadmin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { courseId, recordingId } = await request.json();
    if (!courseId || !recordingId) {
      return NextResponse.json({ error: 'Missing courseId or recordingId' }, { status: 400 });
    }

    // Clear any previous demo for the course
    const { error: clearError } = await supabase
      .from('lecture_recordings')
      .update({ is_demo: false })
      .eq('course_id', courseId)
      .eq('is_demo', true);
    if (clearError) {
      console.error('Error clearing previous demo:', clearError);
    }

    // Mark selected recording as demo
    const { data: updated, error: setError } = await supabase
      .from('lecture_recordings')
      .update({ is_demo: true })
      .eq('id', recordingId)
      .select('id, is_demo')
      .single();
    if (setError) {
      console.error('Error setting demo recording:', setError);
      return NextResponse.json({ error: 'Failed to set demo recording' }, { status: 500 });
    }

    return NextResponse.json({ success: true, recording: updated });
  } catch (e) {
    console.error('Error in set-demo API:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


