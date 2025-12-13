import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessLectureRecordings } from '@/lib/access-control';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STREAM_SECRET = process.env.LECTURE_STREAM_SECRET;

if (!STREAM_SECRET) {
  console.warn(
    'LECTURE_STREAM_SECRET is not set. Lecture recording access tokens will not be available.'
  );
}

interface TokenPayload {
  sub: string;
  key: string;
  courseId: string;
  exp: number;
}

function signToken(payload: TokenPayload): string {
  const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', STREAM_SECRET as string)
    .update(base)
    .digest('base64url');
  return `${base}.${sig}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!STREAM_SECRET) {
      return NextResponse.json(
        { error: 'Streaming not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const { recordingId } = await request.json();

    if (!recordingId) {
      return NextResponse.json(
        { error: 'recordingId is required' },
        { status: 400 }
      );
    }

    // Look up the recording (we need course + key + publish state)
    const { data: recording, error: recError } = await supabaseAdmin
      .from('lecture_recordings')
      .select('id, course_id, teacher_id, is_published, video_key, created_at')
      .eq('id', recordingId)
      .maybeSingle();

    if (recError) {
      console.error('Error fetching recording in access-token route:', recError);
      return NextResponse.json(
        { error: 'Failed to lookup recording' },
        { status: 500 }
      );
    }

    if (!recording || !recording.video_key) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Check if this is a guest request (no auth header)
    const isGuest = !authHeader;
    
    if (isGuest) {
      // For guests, only allow access to the first published lecture of a course
      // Check if this is the first lecture (oldest by created_at)
      const { data: firstLecture } = await supabaseAdmin
        .from('lecture_recordings')
        .select('id')
        .eq('course_id', recording.course_id)
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!firstLecture || firstLecture.id !== recordingId) {
        return NextResponse.json(
          { error: 'Preview access only available for the first lecture' },
          { status: 403 }
        );
      }

      if (!recording.is_published) {
        return NextResponse.json(
          { error: 'Recording not published' },
          { status: 403 }
        );
      }

      // Generate guest token (use 'guest' as sub)
      const now = Math.floor(Date.now() / 1000);
      const payload: TokenPayload = {
        sub: 'guest',
        key: recording.video_key,
        courseId: recording.course_id,
        exp: now + 10 * 60, // 10 minutes
      };

      const accessToken = signToken(payload);

      return NextResponse.json({
        success: true,
        token: accessToken,
      });
    }

    // Authenticated user flow
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;
    const isAdmin = role === 'admin' || role === 'superadmin';

    // Permission checks mirror stream route
    if (role === 'student') {
      if (!recording.is_published) {
        return NextResponse.json(
          { error: 'Recording not published' },
          { status: 403 }
        );
      }

      const accessResult = await canAccessLectureRecordings(
        user.id,
        recording.course_id
      );

      if (!accessResult.hasAccess) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: accessResult.message,
            requiresSubscription: true,
          },
          { status: 403 }
        );
      }
    } else if (role === 'teacher') {
      const { data: teacherCourse } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .eq('course_id', recording.course_id)
        .maybeSingle();

      if (!teacherCourse && !isAdmin && user.id !== recording.teacher_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Short‑lived token, scoped to this recording & course (e.g. 10 minutes)
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      sub: user.id,
      key: recording.video_key,
      courseId: recording.course_id,
      exp: now + 10 * 60,
    };

    const accessToken = signToken(payload);

    return NextResponse.json({
      success: true,
      token: accessToken,
    });
  } catch (error) {
    console.error('Lecture recording access-token error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create access token',
      },
      { status: 500 }
    );
  }
}


