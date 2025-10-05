import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import { canAccessLectureRecordings } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

// AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const VIDEO_BUCKET = process.env.AWS_S3_BUCKET_LESSON_HLS!;

// Supabase (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const tokenFromQuery = url.searchParams.get('token');
    const range = request.headers.get('range') || undefined;

    if (!authHeader && !tokenFromQuery) {
      return new NextResponse('Authorization required', { status: 401 });
    }
    if (!key) {
      return new NextResponse('Missing key', { status: 400 });
    }

    // Get user
    const token = (authHeader ? authHeader.replace('Bearer ', '') : tokenFromQuery!) as string;
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Find the recording by key
    const { data: recording } = await supabaseAdmin
      .from('lecture_recordings')
      .select('id, course_id, teacher_id, is_published')
      .eq('video_key', key)
      .maybeSingle();

    if (!recording) {
      return new NextResponse('Recording not found', { status: 404 });
    }

    // Get user role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userProfile?.role;
    const isAdmin = role === 'admin' || role === 'superadmin';

    // Permission checks
    if (role === 'student') {
      // Check if recording is published
      if (!recording.is_published) {
        return new NextResponse('Recording not published', { status: 403 });
      }

      // Check subscription or demo access
      const accessResult = await canAccessLectureRecordings(user.id, recording.course_id);
      
      if (!accessResult.hasAccess) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Access denied', 
            message: accessResult.message,
            requiresSubscription: true 
          }), 
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
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
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else if (!isAdmin) {
      // Unknown role
      return new NextResponse('Forbidden', { status: 403 });
    }

    // HEAD to get metadata
    const head = await s3.headObject({ Bucket: VIDEO_BUCKET, Key: key }).promise();
    const totalLength = Number(head.ContentLength || 0);
    const contentType = head.ContentType || 'video/mp4';

    let start = 0;
    let end = totalLength ? totalLength - 1 : undefined as unknown as number;
    let status = 200;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    };

    if (range && totalLength) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        start = parseInt(match[1], 10);
        end = match[2] ? parseInt(match[2], 10) : totalLength - 1;
        if (isNaN(start) || isNaN(end) || start > end || end >= totalLength) {
          return new NextResponse('Invalid Range', { status: 416 });
        }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${totalLength}`;
        headers['Content-Length'] = String(end - start + 1);
      }
    } else if (totalLength) {
      headers['Content-Length'] = String(totalLength);
    }

    const params: AWS.S3.GetObjectRequest = { Bucket: VIDEO_BUCKET, Key: key };
    if (status === 206) {
      params.Range = `bytes=${start}-${end}`;
    }

    const s3Object = s3.getObject(params);
    const nodeStream = s3Object.createReadStream();

    const readable = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        try { 
          nodeStream.destroy(); 
        } catch (destroyError) {
          console.error('Error destroying stream:', destroyError);
        }
      }
    });

    return new NextResponse(readable as any, { status, headers });
  } catch (error) {
    console.error('Stream error:', error);
    return new NextResponse('Failed to stream video', { status: 500 });
  }
}


