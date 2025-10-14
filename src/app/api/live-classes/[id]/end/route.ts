import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Load class and user role
    const { data: existingClass, error: fetchError } = await supabase
      .from('live_classes')
      .select('teacher_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isSuperAdminOrAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'admin';
    const isOwnerTeacher = existingClass.teacher_id === user.id;
    if (!isOwnerTeacher && !isSuperAdminOrAdmin) {
      return NextResponse.json({ error: 'Unauthorized to end this live class' }, { status: 403 });
    }

    // Check if class is in live status
    if (existingClass.status !== 'live') {
      return NextResponse.json({ error: 'Live class is not currently active' }, { status: 400 });
    }

    // Update status to ended
    const client = isSuperAdminOrAdmin ? supabaseAdmin : supabase;
    const { data: liveClass, error: updateError } = await client
      .from('live_classes')
      .update({ status: 'ended' })
      .eq('id', id)
      .select(`
        *,
        courses!inner(title),
        users!live_classes_teacher_id_fkey(full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error ending live class:', updateError);
      return NextResponse.json({ error: 'Failed to end live class' }, { status: 500 });
    }

    return NextResponse.json({ liveClass });
  } catch (error) {
    console.error('Error in end live class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
