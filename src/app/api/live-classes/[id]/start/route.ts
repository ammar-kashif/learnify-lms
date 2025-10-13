import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this live class
    const { data: existingClass, error: fetchError } = await supabase
      .from('live_classes')
      .select('teacher_id, status, scheduled_date')
      .eq('id', id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    if (existingClass.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to start this live class' }, { status: 403 });
    }

    // Check if class is in scheduled status
    if (existingClass.status !== 'scheduled') {
      return NextResponse.json({ error: 'Live class is not in scheduled status' }, { status: 400 });
    }

    // Update status to live
    const { data: liveClass, error: updateError } = await supabase
      .from('live_classes')
      .update({ status: 'live' })
      .eq('id', id)
      .select(`
        *,
        courses!inner(title),
        users!live_classes_teacher_id_fkey(full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error starting live class:', updateError);
      return NextResponse.json({ error: 'Failed to start live class' }, { status: 500 });
    }

    return NextResponse.json({ liveClass });
  } catch (error) {
    console.error('Error in start live class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
