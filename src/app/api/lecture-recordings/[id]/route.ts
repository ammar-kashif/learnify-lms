import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { parseYouTubeId } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

// Configure Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');
    const body = await request.json();

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user role from users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the lecture recording
    const { data: lectureRecording, error: fetchError } = await supabaseAdmin
      .from('lecture_recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lectureRecording) {
      return NextResponse.json({ error: 'Lecture recording not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = lectureRecording.teacher_id === user.id;
    const isAdmin = ['admin', 'superadmin'].includes(userProfile.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ 
        error: 'You do not have permission to modify this lecture recording' 
      }, { status: 403 });
    }

    // Update the lecture recording
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.is_published !== undefined) updateData.is_published = body.is_published;

    // Lets a teacher fix or attach the YouTube link without recreating the row —
    // the only way the six legacy S3 rows can be brought back to life.
    if (body.youtubeVideoId !== undefined || body.youtubeUrl !== undefined) {
      const videoId = parseYouTubeId(body.youtubeVideoId || body.youtubeUrl || '');
      if (!videoId) {
        return NextResponse.json(
          { error: 'A valid YouTube link is required.' },
          { status: 400 }
        );
      }
      updateData.youtube_video_id = videoId;
      updateData.thumbnail_url = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    const { data: updatedRecording, error: updateError } = await supabaseAdmin
      .from('lecture_recordings')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        video_url,
        video_key,
        youtube_video_id,
        duration,
        file_size,
        thumbnail_url,
        is_published,
        created_at,
        updated_at,
        teacher_id
      `)
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update lecture recording' 
      }, { status: 500 });
    }

    // Fetch teacher name
    let teacherName = 'Unknown Teacher';
    const { data: teacherRow } = await supabaseAdmin
      .from('users')
      .select('id, full_name')
      .eq('id', updatedRecording.teacher_id)
      .single();
    if (teacherRow) {
      teacherName = teacherRow.full_name || teacherName;
    }

    // Format the response
    const formattedRecording = {
      id: updatedRecording.id,
      title: updatedRecording.title,
      description: updatedRecording.description,
      video_url: updatedRecording.video_url,
      video_key: updatedRecording.video_key,
      youtube_video_id: updatedRecording.youtube_video_id,
      duration: updatedRecording.duration,
      file_size: updatedRecording.file_size,
      thumbnail_url: updatedRecording.thumbnail_url,
      is_published: updatedRecording.is_published,
      created_at: updatedRecording.created_at,
      updated_at: updatedRecording.updated_at,
      teacher_name: teacherName,
    };

    return NextResponse.json({
      success: true,
      lectureRecording: formattedRecording,
    });

  } catch (error) {
    console.error('Lecture recording update error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update lecture recording',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user role from users table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the lecture recording
    const { data: lectureRecording, error: fetchError } = await supabaseAdmin
      .from('lecture_recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lectureRecording) {
      return NextResponse.json({ error: 'Lecture recording not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = lectureRecording.teacher_id === user.id;
    const isAdmin = ['admin', 'superadmin'].includes(userProfile.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ 
        error: 'You do not have permission to delete this lecture recording' 
      }, { status: 403 });
    }

    // No S3 object to remove — lectures are YouTube-hosted now. Deleting the
    // row does not touch the video on YouTube, which is deliberate: the
    // channel is managed there, not from this app.

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('lecture_recordings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete lecture recording' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lecture recording deleted successfully',
    });

  } catch (error) {
    console.error('Lecture recording deletion error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete lecture recording',
    }, { status: 500 });
  }
}
