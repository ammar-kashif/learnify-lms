import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
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

    // Fetch live class with related data
    const { data: liveClass, error } = await supabase
      .from('live_classes')
      .select(`
        *,
        courses!inner(title, teacher_id),
        users!live_classes_teacher_id_fkey(full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching live class:', error);
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    return NextResponse.json({ liveClass });
  } catch (error) {
    console.error('Error in live class GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, scheduled_date, duration_minutes, meeting_link, status, is_demo } = body;

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

    // Verify user owns this live class (we may allow admins to override below)
    const { data: existingClass, error: fetchError } = await supabase
      .from('live_classes')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    // Determine user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminOrSuper = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
    const isTeacher = userProfile?.role === 'teacher';

    if (!isAdminOrSuper && existingClass.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to update this live class' }, { status: 403 });
    }

    // Update live class
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
    if (status !== undefined) updateData.status = status;
    // Allow teacher/admin/superadmin to toggle is_demo when provided
    if (is_demo !== undefined && (isTeacher || isAdminOrSuper)) updateData.is_demo = !!is_demo;

    const client = isAdminOrSuper ? supabaseAdmin : supabase;
    const { data: liveClass, error: updateError } = await client
      .from('live_classes')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses!inner(title),
        users!live_classes_teacher_id_fkey(full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error updating live class:', updateError);
      return NextResponse.json({ error: 'Failed to update live class' }, { status: 500 });
    }

    return NextResponse.json({ liveClass });
  } catch (error) {
    console.error('Error in live class PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
      .select('teacher_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    if (existingClass.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this live class' }, { status: 403 });
    }

    // Don't allow deletion of live classes that have started
    if (existingClass.status === 'live') {
      return NextResponse.json({ error: 'Cannot delete a live class that is currently active' }, { status: 400 });
    }

    // Delete live class (attendance records will be deleted due to CASCADE)
    const { error: deleteError } = await supabase
      .from('live_classes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting live class:', deleteError);
      return NextResponse.json({ error: 'Failed to delete live class' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('Error in live class DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}