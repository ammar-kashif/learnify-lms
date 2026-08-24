import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { parseYouTubeId } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/lecture-recordings
 *
 * Creates a lecture recording backed by a YouTube video.
 *
 * Replaces the old `/api/lecture-recordings/upload`, which streamed the whole
 * file browser → route handler → S3. Authorisation is carried over unchanged:
 * admins and superadmins may add a lecture to any course, teachers only to
 * courses they are assigned to in `teacher_courses`.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { courseId, title, description, youtubeVideoId, youtubeUrl } = body as Record<
      string,
      string | null
    >;

    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { error: 'Course and title are required.' },
        { status: 400 }
      );
    }

    // Accept either a bare id or a full URL, and re-validate server-side —
    // the client check is a convenience, not a guarantee.
    const videoId = parseYouTubeId(youtubeVideoId || youtubeUrl || '');
    if (!videoId) {
      return NextResponse.json(
        { error: 'A valid YouTube link is required.' },
        { status: 400 }
      );
    }

    const token = authHeader.split(' ')[1];
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (userProfile.role === 'student') {
      return NextResponse.json(
        { error: 'Students cannot add lectures.' },
        { status: 403 }
      );
    }

    const isAdmin = ['admin', 'superadmin'].includes(userProfile.role);
    if (!isAdmin) {
      const { data: teacherCourse } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!teacherCourse) {
        return NextResponse.json(
          { error: 'You are not assigned to this course.' },
          { status: 403 }
        );
      }
    }

    const { data: recording, error: insertError } = await supabaseAdmin
      .from('lecture_recordings')
      .insert({
        course_id: courseId,
        teacher_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        youtube_video_id: videoId,
        thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        // Unpublished by default so the teacher can check playback first.
        is_published: false,
      })
      .select('id, title, description, youtube_video_id, is_published, created_at')
      .single();

    if (insertError) {
      console.error('Error creating lecture recording:', insertError);
      return NextResponse.json(
        { error: 'Could not add the lecture.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, recording }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating lecture recording:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
