import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/live-classes/[id] - Get specific live class
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: liveClass, error } = await supabase
      .from('live_classes')
      .select(`
        *,
        users!live_classes_teacher_id_fkey (
          full_name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !liveClass) {
      return NextResponse.json(
        { error: 'Live class not found' },
        { status: 404 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;

    // Check access permissions
    if (role === 'student') {
      if (!liveClass.is_published) {
        return NextResponse.json(
          { error: 'Live class not published' },
          { status: 403 }
        );
      }
    } else if (role === 'teacher') {
      if (liveClass.teacher_id !== user.id) {
        // Check if teacher is assigned to the course
        const { data: teacherCourse } = await supabase
          .from('teacher_courses')
          .select('course_id')
          .eq('teacher_id', user.id)
          .eq('course_id', liveClass.course_id)
          .single();

        if (!teacherCourse && !['admin', 'superadmin'].includes(role || '')) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({ liveClass });
  } catch (error) {
    console.error('Error in live class GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/live-classes/[id] - Update live class
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;

    // Get existing live class
    const { data: existingClass, error: fetchError } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json(
        { error: 'Live class not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (role === 'teacher' && existingClass.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own live classes' },
        { status: 403 }
      );
    }

    if (!['teacher', 'admin', 'superadmin'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Teacher access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      meetingUrl, 
      meetingId, 
      scheduledAt, 
      durationMinutes, 
      maxParticipants,
      isPublished 
    } = body;

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (meetingUrl !== undefined) updateData.meeting_url = meetingUrl;
    if (meetingId !== undefined) updateData.meeting_id = meetingId;
    if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt;
    if (durationMinutes !== undefined) updateData.duration_minutes = durationMinutes;
    if (maxParticipants !== undefined) updateData.max_participants = maxParticipants;
    if (isPublished !== undefined) updateData.is_published = isPublished;

    const { data: liveClass, error: updateError } = await supabase
      .from('live_classes')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        users!live_classes_teacher_id_fkey (
          full_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating live class:', updateError);
      return NextResponse.json(
        { error: 'Failed to update live class' },
        { status: 500 }
      );
    }

    return NextResponse.json({ liveClass });
  } catch (error) {
    console.error('Error in live class PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/live-classes/[id] - Delete live class
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;

    // Get existing live class
    const { data: existingClass, error: fetchError } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json(
        { error: 'Live class not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (role === 'teacher' && existingClass.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own live classes' },
        { status: 403 }
      );
    }

    if (!['teacher', 'admin', 'superadmin'].includes(role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Teacher access required' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('live_classes')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting live class:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete live class' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Live class deleted successfully' 
    });
  } catch (error) {
    console.error('Error in live class DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

